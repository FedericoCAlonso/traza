import type { Contacto, Cliente } from '../types/client';
import type { Project } from '../types/project';
import type { AppConfig } from '../types/config';

export interface MasterDatabasePayload {
  version: number;
  schemaVersion: number;
  exportedAt: string;
  deviceId?: string;
  clientes?: Cliente[];
  contactos?: Contacto[];
  proyectos?: any[];
  trazaProyectos?: Project[];
  presupuestos?: any[];
  solicitudesCotizacion?: any[];
  config?: AppConfig[];
  [key: string]: any;
}

export interface MergeStats {
  tablesProcessed: number;
  localUpdatedCount: number;
  localAddedCount: number;
  remoteNewerCount: number;
  localNewerCount: number;
  identicalCount: number;
}

export interface SyncExecutionResult {
  success: boolean;
  provider: 'google_drive' | 'local_file' | 'manual_json';
  timestamp: string;
  stats?: MergeStats;
  message: string;
  error?: string;
}
