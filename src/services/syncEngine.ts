import type { MasterDatabasePayload, SyncExecutionResult } from './syncTypes';
import { gdriveProvider } from './GoogleDriveProvider';
import { loadProjects, saveProjects } from '../lib/storage';
import { loadClients, saveClients } from '../lib/clientStorage';
import { normalizeProject, useProjectStore } from '../store/useProjectStore';
import { useClientsStore } from '../store/useClientsStore';

class DecentralizedSyncEngine {
  private isSyncing = false;
  private listeners: ((state: { isSyncing: boolean; lastResult?: SyncExecutionResult }) => void)[] = [];
  private lastResult?: SyncExecutionResult;

  subscribe(callback: (state: { isSyncing: boolean; lastResult?: SyncExecutionResult }) => void): () => void {
    this.listeners.push(callback);
    callback({ isSyncing: this.isSyncing, lastResult: this.lastResult });
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l({ isSyncing: this.isSyncing, lastResult: this.lastResult }));
  }

  getLocalPayload(): MasterDatabasePayload {
    const localClients = loadClients();
    const localProjects = loadProjects().map(normalizeProject);
    return {
      version: 2,
      schemaVersion: 4,
      exportedAt: new Date().toISOString(),
      clientes: localClients,
      contactos: localClients,
      trazaProyectos: localProjects,
    };
  }

  /**
   * Sincronización completa con Google Drive: PULL -> LWW MERGE -> REACTIVE STORE REFRESH -> PUSH
   */
  async executeDriveSync(): Promise<SyncExecutionResult> {
    if (this.isSyncing) {
      throw new Error('Ya hay una sincronización en curso.');
    }

    this.isSyncing = true;
    this.notifyListeners();
    const timestamp = new Date().toISOString();

    try {
      // 1. PULL de Google Drive
      const remotePayload = await gdriveProvider.readMasterPayload();
      const localProjects = loadProjects().map(normalizeProject);
      const localClients = loadClients();

      // 2. Fusión de Clientes (Last-Write-Wins)
      const mergedClientsMap = new Map<string, any>();
      localClients.forEach(c => mergedClientsMap.set(c.id, c));
      
      const remoteClients = [
        ...(Array.isArray(remotePayload?.clientes) ? remotePayload.clientes : []),
        ...(Array.isArray(remotePayload?.contactos) ? remotePayload.contactos : [])
      ];

      remoteClients.forEach(rc => {
        if (!rc || !rc.id) return;
        const razonSocial = rc.razonSocial || rc.nombre || rc.nombreFantasia || 'Sin Nombre';
        const nombre = rc.nombre || rc.razonSocial || razonSocial;
        const cuitDni = rc.cuitDni || rc.cuit || (rc as any).dniCuit || '';

        const normalizedRemote: any = {
          ...rc,
          id: String(rc.id),
          razonSocial,
          nombre,
          cuitDni,
          cuit: cuitDni,
          roles: rc.roles || ['cliente'],
          obras: Array.isArray(rc.obras) ? rc.obras : []
        };

        const local = mergedClientsMap.get(String(rc.id));
        if (!local) {
          mergedClientsMap.set(String(rc.id), normalizedRemote);
        } else {
          const localUp = new Date(local.updatedAt || local.createdAt || 0).getTime();
          const remoteUp = new Date(rc.updatedAt || rc.createdAt || 0).getTime();
          if (remoteUp >= localUp) {
            // Preservar obras locales si el remoto no las tenía
            const mergedObras = normalizedRemote.obras && normalizedRemote.obras.length > 0 
              ? normalizedRemote.obras 
              : (local.obras || []);
            mergedClientsMap.set(String(rc.id), { ...local, ...normalizedRemote, obras: mergedObras });
          }
        }
      });

      const consolidatedClients = Array.from(mergedClientsMap.values());
      saveClients(consolidatedClients);
      // Actualizar reactivamente el store de Zustand para que la UI se refresque al instante
      useClientsStore.getState().setClients(consolidatedClients);

      // 3. Fusión de Proyectos CAD de Traza (Last-Write-Wins)
      const mergedProjectsMap = new Map<string, any>();
      localProjects.forEach(p => mergedProjectsMap.set(p.id, p));

      // Leer de trazaProyectos, o fallback a proyectos si eran objetos CAD con ambientes
      const remoteTrazaProjs: any[] = [];
      if (remotePayload?.trazaProyectos && Array.isArray(remotePayload.trazaProyectos)) {
        remoteTrazaProjs.push(...remotePayload.trazaProyectos);
      }
      if (remotePayload?.proyectos && Array.isArray(remotePayload.proyectos)) {
        remotePayload.proyectos.forEach(p => {
          if (p && Array.isArray(p.ambientes)) {
            remoteTrazaProjs.push(p);
          }
        });
      }

      remoteTrazaProjs.forEach(rp => {
        if (!rp || !rp.id) return;
        const normRemote = normalizeProject(rp);
        const local = mergedProjectsMap.get(rp.id);
        if (!local) {
          mergedProjectsMap.set(rp.id, normRemote);
        } else {
          const localUp = local.updatedAt || local.createdAt || 0;
          const remoteUp = normRemote.updatedAt || normRemote.createdAt || 0;
          if (remoteUp >= localUp) {
            mergedProjectsMap.set(rp.id, normRemote);
          }
        }
      });

      const consolidatedProjects = Array.from(mergedProjectsMap.values());
      saveProjects(consolidatedProjects);
      // Actualizar reactivamente el store de Zustand
      useProjectStore.getState().importProjects(consolidatedProjects);

      // 4. PUSH de la versión consolidada a Google Drive respetando tablas de Cotizador
      // Filtrar de `proyectos` los que eran CAD para que Cotizador mantenga sus proyectos de cotización limpios
      const cotizadorProyectosClean = Array.isArray(remotePayload?.proyectos)
        ? remotePayload.proyectos.filter(p => !p.ambientes)
        : [];

      const consolidatedPayload: MasterDatabasePayload = {
        version: 2,
        schemaVersion: 4,
        exportedAt: timestamp,
        ...(remotePayload || {}),
        clientes: consolidatedClients,
        contactos: consolidatedClients,
        proyectos: cotizadorProyectosClean,
        trazaProyectos: consolidatedProjects,
      };

      await gdriveProvider.writeMasterPayload(consolidatedPayload);

      const result: SyncExecutionResult = {
        success: true,
        provider: 'google_drive',
        timestamp,
        message: `Sincronización exitosa (${consolidatedClients.length} clientes, ${consolidatedProjects.length} relevamientos).`
      };

      this.lastResult = result;
      return result;
    } catch (err: any) {
      console.error('[syncEngine] Error en sincronización:', err);
      const result: SyncExecutionResult = {
        success: false,
        provider: 'google_drive',
        timestamp,
        message: err.message || 'Error al sincronizar con Google Drive',
        error: err.message
      };
      this.lastResult = result;
      throw err;
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }
}

export const syncEngine = new DecentralizedSyncEngine();

