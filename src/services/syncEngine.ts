import type { MasterDatabasePayload, SyncExecutionResult } from './syncTypes';
import { gdriveProvider } from './GoogleDriveProvider';
import { loadProjects, saveProjects } from '../lib/storage';
import { loadClients, saveClients } from '../lib/clientStorage';
import { normalizeProject } from '../store/useProjectStore';

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
    return {
      version: 2,
      schemaVersion: 4,
      exportedAt: new Date().toISOString(),
      clientes: loadClients(),
      contactos: loadClients(),
      proyectos: loadProjects().map(normalizeProject),
    };
  }

  /**
   * Sincronización completa con Google Drive: PULL -> MERGE -> PUSH
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
      const localProjects = loadProjects();
      const localClients = loadClients();

      // 2. Fusión de Clientes (Last-Write-Wins)
      const mergedClientsMap = new Map<string, any>();
      localClients.forEach(c => mergedClientsMap.set(c.id, c));
      if (remotePayload?.clientes && Array.isArray(remotePayload.clientes)) {
        remotePayload.clientes.forEach(rc => {
          const local = mergedClientsMap.get(rc.id);
          if (!local) {
            mergedClientsMap.set(rc.id, rc);
          } else {
            const localUp = new Date(local.updatedAt || local.createdAt || 0).getTime();
            const remoteUp = new Date(rc.updatedAt || rc.createdAt || 0).getTime();
            if (remoteUp >= localUp) {
              mergedClientsMap.set(rc.id, rc);
            }
          }
        });
      }
      const consolidatedClients = Array.from(mergedClientsMap.values());
      saveClients(consolidatedClients);

      // 3. Fusión de Proyectos (Last-Write-Wins)
      const mergedProjectsMap = new Map<string, any>();
      localProjects.forEach(p => mergedProjectsMap.set(p.id, normalizeProject(p)));
      if (remotePayload?.proyectos && Array.isArray(remotePayload.proyectos)) {
        remotePayload.proyectos.forEach(rp => {
          const local = mergedProjectsMap.get(rp.id);
          if (!local) {
            mergedProjectsMap.set(rp.id, normalizeProject(rp));
          } else {
            const localUp = local.updatedAt || local.createdAt || 0;
            const remoteUp = rp.updatedAt || rp.createdAt || 0;
            if (remoteUp >= localUp) {
              mergedProjectsMap.set(rp.id, normalizeProject(rp));
            }
          }
        });
      }
      const consolidatedProjects = Array.from(mergedProjectsMap.values());
      saveProjects(consolidatedProjects);

      // 4. PUSH de la versión consolidada a Google Drive
      const consolidatedPayload: MasterDatabasePayload = {
        version: 2,
        schemaVersion: 4,
        exportedAt: timestamp,
        ...(remotePayload || {}),
        clientes: consolidatedClients,
        contactos: consolidatedClients,
        proyectos: consolidatedProjects,
      };

      await gdriveProvider.writeMasterPayload(consolidatedPayload);

      const result: SyncExecutionResult = {
        success: true,
        provider: 'google_drive',
        timestamp,
        message: `Sincronización con Drive exitosa (${consolidatedClients.length} clientes, ${consolidatedProjects.length} proyectos).`
      };

      this.lastResult = result;
      return result;
    } catch (err: any) {
      const result: SyncExecutionResult = {
        success: false,
        provider: 'google_drive',
        timestamp,
        message: 'Error al sincronizar con Google Drive',
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
