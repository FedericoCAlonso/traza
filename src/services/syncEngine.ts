import type { MasterDatabasePayload, SyncExecutionResult } from './syncTypes';
import { gdriveProvider } from './GoogleDriveProvider';
import { loadProjects, saveProjects, getDeletedProjectIds, recordDeletedProjectId, clearDeletedProjectIds } from '../lib/storage';
import { loadClients, saveClients } from '../lib/clientStorage';
import { normalizeProject, useProjectStore } from '../store/useProjectStore';
import { useClientsStore } from '../store/useClientsStore';
import type { Cliente } from '../types/client';

function toTimestamp(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function normalizeContacto(rc: any): Cliente {
  const id = String(rc.id);
  const razonSocial = rc.razonSocial || rc.nombre || rc.nombreFantasia || 'Sin Nombre';
  const nombre = rc.nombre || rc.razonSocial || razonSocial;
  const cuitDni = rc.cuitDni || rc.cuit || rc.dniCuit || '';

  return {
    id,
    razonSocial,
    nombreFantasia: rc.nombreFantasia,
    nombre,
    cuitDni,
    cuit: cuitDni,
    condicionIVA: rc.condicionIVA || 'Consumidor Final',
    roles: Array.isArray(rc.roles) && rc.roles.length > 0 ? rc.roles : ['cliente'],
    tipoProveedor: rc.tipoProveedor,
    etiquetas: Array.isArray(rc.etiquetas) ? rc.etiquetas : [],
    direccion: rc.direccion || '',
    localidad: rc.localidad || '',
    provincia: rc.provincia || '',
    telefono: rc.telefono || '',
    email: rc.email || '',
    sitioWeb: rc.sitioWeb || '',
    contactos: Array.isArray(rc.contactos) ? rc.contactos : [],
    obras: Array.isArray(rc.obras) ? rc.obras : [],
    notas: rc.notas || '',
    deleted: Boolean(rc.deleted),
    createdAt: rc.createdAt || new Date().toISOString(),
    updatedAt: rc.updatedAt || rc.createdAt || new Date(0).toISOString()
  };
}

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
      const deletedProjectIds = getDeletedProjectIds();

      // 2. Fusión de Clientes (Last-Write-Wins con Soft-Delete)
      // Limpiar del almacenamiento local de Traza registros inválidos o proveedores puros
      const localClients = loadClients().filter(c => {
        if (!c || !c.id) return false;
        if (Array.isArray(c.roles) && c.roles.includes('proveedor') && !c.roles.includes('cliente')) {
          return false;
        }
        return true;
      });

      const mergedClientsMap = new Map<string, Cliente>();
      localClients.forEach(c => mergedClientsMap.set(String(c.id), normalizeContacto(c)));
      
      // Fuente de contactos remotos: si existe el Directorio Unificado `contactos`, usarlo exclusivamente.
      // Solo recurrir a `clientes` si `contactos` no existe en absoluto (esquema legacy v1-v4).
      const hasUnifiedContactos = Array.isArray(remotePayload?.contactos);
      const rawRemoteList: any[] = hasUnifiedContactos
        ? remotePayload!.contactos!
        : (Array.isArray(remotePayload?.clientes) ? remotePayload!.clientes : []);

      // Filtrar los contactos remotos que tengan rol de cliente (o sin rol especificado)
      const remoteClientsOnly = rawRemoteList.filter(c => {
        if (!c || !c.id) return false;
        if (Array.isArray(c.roles)) return c.roles.includes('cliente');
        return true;
      });

      remoteClientsOnly.forEach(rc => {
        if (!rc || !rc.id) return;
        const normalizedRemote = normalizeContacto(rc);
        const id = normalizedRemote.id;

        const local = mergedClientsMap.get(id);
        if (!local) {
          mergedClientsMap.set(id, normalizedRemote);
        } else {
          const localUp = toTimestamp(local.updatedAt || local.createdAt);
          const remoteUp = toTimestamp(normalizedRemote.updatedAt);
          if (remoteUp >= localUp) {
            const mergedObras = normalizedRemote.obras && normalizedRemote.obras.length > 0 
              ? normalizedRemote.obras 
              : (local.obras || []);
            mergedClientsMap.set(id, { ...local, ...normalizedRemote, obras: mergedObras });
          }
        }
      });

      const consolidatedClients = Array.from(mergedClientsMap.values());
      saveClients(consolidatedClients);
      useClientsStore.getState().setClients(consolidatedClients);

      // 3. Fusión de Proyectos CAD de Traza (Last-Write-Wins con Soft-Delete y Tombstones)
      const mergedProjectsMap = new Map<string, any>();
      localProjects.forEach(p => {
        const id = String(p.id);
        if (deletedProjectIds.has(id)) {
          const delTime = deletedProjectIds.get(id)!;
          mergedProjectsMap.set(id, { ...p, deleted: true, deletedAt: delTime, updatedAt: Math.max(toTimestamp(p.updatedAt), delTime) });
        } else {
          mergedProjectsMap.set(id, p);
        }
      });

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
        const id = String(rp.id);
        const normRemote = normalizeProject(rp);
        const remoteTime = toTimestamp(normRemote.updatedAt || normRemote.createdAt || normRemote.deletedAt);

        // Si fue eliminado localmente (tombstone)
        if (deletedProjectIds.has(id)) {
          const delTime = deletedProjectIds.get(id)!;
          if (delTime >= remoteTime) {
            normRemote.deleted = true;
            normRemote.deletedAt = delTime;
            normRemote.updatedAt = Math.max(remoteTime, delTime);
            mergedProjectsMap.set(id, normRemote);
            return;
          }
        }

        const local = mergedProjectsMap.get(id);
        if (!local) {
          if (normRemote.deleted) {
            recordDeletedProjectId(id, remoteTime);
          }
          mergedProjectsMap.set(id, normRemote);
        } else {
          const localTime = toTimestamp(local.updatedAt || local.createdAt || local.deletedAt);

          if (local.deleted && !normRemote.deleted) {
            if (localTime >= remoteTime) {
              local.updatedAt = Math.max(localTime, remoteTime);
              mergedProjectsMap.set(id, local);
              return;
            }
          }

          if (normRemote.deleted && !local.deleted) {
            if (remoteTime >= localTime) {
              recordDeletedProjectId(id, remoteTime);
              mergedProjectsMap.set(id, normRemote);
              return;
            }
          }

          if (remoteTime >= localTime) {
            mergedProjectsMap.set(id, normRemote);
          }
        }
      });

      const consolidatedProjects = Array.from(mergedProjectsMap.values());
      saveProjects(consolidatedProjects);
      useProjectStore.getState().setProjects(consolidatedProjects);

      // 4. PUSH de la versión consolidada a Google Drive respetando tablas de Cotizador
      const cotizadorProyectosClean = Array.isArray(remotePayload?.proyectos)
        ? remotePayload.proyectos.filter(p => !p.ambientes)
        : [];

      // Mantener todos los contactos del Cotizador (incluyendo proveedores) y actualizar los clientes
      const contactosMap = new Map<string, any>();
      if (Array.isArray(remotePayload?.contactos)) {
        remotePayload.contactos.forEach(c => {
          if (c && c.id) contactosMap.set(String(c.id), c);
        });
      }
      consolidatedClients.forEach(c => {
        contactosMap.set(String(c.id), c);
      });

      const allUnifiedContactos = Array.from(contactosMap.values()).map(normalizeContacto);
      const cleanClientesList = allUnifiedContactos.filter(c => !c.roles || c.roles.includes('cliente'));
      const cleanProveedoresList = allUnifiedContactos.filter(c => c.roles?.includes('proveedor'));

      const consolidatedPayload: MasterDatabasePayload = {
        version: 2,
        schemaVersion: 4,
        exportedAt: timestamp,
        ...(remotePayload || {}),
        contactos: allUnifiedContactos,
        clientes: cleanClientesList,
        proveedores: cleanProveedoresList,
        proyectos: cotizadorProyectosClean,
        trazaProyectos: consolidatedProjects,
      };

      await gdriveProvider.writeMasterPayload(consolidatedPayload);

      const activeClientsCount = consolidatedClients.filter(c => !c.deleted).length;
      const activeProjectsCount = consolidatedProjects.filter(p => !p.deleted).length;

      const result: SyncExecutionResult = {
        success: true,
        provider: 'google_drive',
        timestamp,
        message: `Sincronización exitosa (${activeClientsCount} cliente${activeClientsCount === 1 ? '' : 's'}, ${activeProjectsCount} relevamiento${activeProjectsCount === 1 ? '' : 's'}).`
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

  /**
   * Limpieza y purga profunda:
   * - Elimina permanentemente de la nube y del dispositivo todos los contactos soft-deleted o corruptos.
   * - Elimina permanentemente los relevamientos soft-deleted y limpia tombstones.
   * - Rescribe el archivo maestro en Google Drive con datos normalizados y compactados.
   */
  async executeDataCleanup(): Promise<SyncExecutionResult> {
    if (this.isSyncing) {
      throw new Error('Ya hay una operación de sincronización en curso.');
    }

    this.isSyncing = true;
    this.notifyListeners();
    const timestamp = new Date().toISOString();

    try {
      // 1. Leer estado remoto y local
      const remotePayload = await gdriveProvider.readMasterPayload();
      const localProjects = loadProjects().map(normalizeProject);
      const localClients = loadClients().map(normalizeContacto);

      // 2. Limpieza de Contactos: Conservar solo contactos activos y válidos
      const activeContactsMap = new Map<string, Cliente>();

      // Procesar contactos remotos
      const remoteList = Array.isArray(remotePayload?.contactos)
        ? remotePayload.contactos
        : (Array.isArray(remotePayload?.clientes) ? remotePayload.clientes : []);

      remoteList.forEach(rc => {
        if (!rc || !rc.id) return;
        if (rc.deleted) return; // Purgar eliminados
        const norm = normalizeContacto(rc);
        if (!norm.razonSocial && !norm.nombre) return; // Purgar corruptos
        activeContactsMap.set(norm.id, norm);
      });

      // Incorporar contactos locales activos
      localClients.forEach(lc => {
        if (!lc || !lc.id || lc.deleted) return;
        if (!activeContactsMap.has(lc.id)) {
          activeContactsMap.set(lc.id, lc);
        } else {
          const existing = activeContactsMap.get(lc.id)!;
          const exTime = toTimestamp(existing.updatedAt || existing.createdAt);
          const lcTime = toTimestamp(lc.updatedAt || lc.createdAt);
          if (lcTime >= exTime) {
            activeContactsMap.set(lc.id, { ...existing, ...lc });
          }
        }
      });

      const cleanContacts = Array.from(activeContactsMap.values());
      const cleanClients = cleanContacts.filter(c => !c.roles || c.roles.includes('cliente'));
      const cleanProveedores = cleanContacts.filter(c => c.roles?.includes('proveedor'));

      // Actualizar almacenamiento local de Traza
      saveClients(cleanClients);
      useClientsStore.getState().setClients(cleanClients);

      // 3. Limpieza de Proyectos CAD de Traza: Conservar solo proyectos activos
      const activeProjectsMap = new Map<string, any>();

      const remoteProjs: any[] = [];
      if (Array.isArray(remotePayload?.trazaProyectos)) remoteProjs.push(...remotePayload.trazaProyectos);
      if (Array.isArray(remotePayload?.proyectos)) {
        remotePayload.proyectos.forEach(p => {
          if (p && Array.isArray(p.ambientes)) remoteProjs.push(p);
        });
      }

      remoteProjs.forEach(rp => {
        if (!rp || !rp.id || rp.deleted) return;
        const norm = normalizeProject(rp);
        activeProjectsMap.set(String(norm.id), norm);
      });

      localProjects.forEach(lp => {
        if (!lp || !lp.id || lp.deleted) return;
        const norm = normalizeProject(lp);
        activeProjectsMap.set(String(norm.id), norm);
      });

      const cleanProjects = Array.from(activeProjectsMap.values());
      saveProjects(cleanProjects);
      useProjectStore.getState().setProjects(cleanProjects);

      // Limpiar tombstones de proyectos
      clearDeletedProjectIds();

      // 4. Limpieza de Proyectos de Cotizador
      const cleanCotizadorProjs = Array.isArray(remotePayload?.proyectos)
        ? remotePayload.proyectos.filter(p => !p.ambientes && !p.deleted)
        : [];

      // 5. Construir y guardar payload maestro compacto y limpio
      const cleanPayload: MasterDatabasePayload = {
        version: 2,
        schemaVersion: 4,
        exportedAt: timestamp,
        ...(remotePayload || {}),
        contactos: cleanContacts,
        clientes: cleanClients,
        proveedores: cleanProveedores,
        proyectos: cleanCotizadorProjs,
        trazaProyectos: cleanProjects,
      };

      await gdriveProvider.writeMasterPayload(cleanPayload);

      const result: SyncExecutionResult = {
        success: true,
        provider: 'google_drive',
        timestamp,
        message: `Limpieza y compactación exitosa: Base de datos saneada con ${cleanClients.length} cliente(s) y ${cleanProjects.length} relevamiento(s) activos.`
      };

      this.lastResult = result;
      return result;
    } catch (err: any) {
      console.error('[syncEngine] Error en limpieza de datos:', err);
      const result: SyncExecutionResult = {
        success: false,
        provider: 'google_drive',
        timestamp,
        message: err.message || 'Error al ejecutar la limpieza de datos',
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


