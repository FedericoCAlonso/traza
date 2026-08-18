import type { ThemeMode } from './ui';

export interface PerfilProfesionalConfig {
  nombre: string;
  empresa: string;
  matricula: string;
  cuit: string;
  telefono: string;
  email: string;
  logoUrl?: string;
  leyendaMembrete?: string;
}

export interface ParametrosTecnicosConfig {
  alturaDefault: number;          // m (ej: 2.60)
  grosorParedDefault: number;     // m (ej: 0.15)
  escalaDefault: number;          // factor de escala (ej: 50 para 1:50)
  factorDesperdicioPct: number;   // % de desperdicio y curvas (ej: 10)
}

export interface GoogleDriveSyncConfig {
  enabled: boolean;
  userEmail?: string;
  autoSyncOnSave?: boolean;
  lastSyncTimestamp?: string;
}

export interface AppConfig {
  id: string;
  themeMode: ThemeMode;
  profesional: PerfilProfesionalConfig;
  parametrosTecnicos: ParametrosTecnicosConfig;
  gdriveSync: GoogleDriveSyncConfig;
  updatedAt?: string;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  id: 'default_config',
  themeMode: 'system',
  profesional: {
    nombre: 'Ing. / Instalador Eléctrico',
    empresa: 'ieBA - Instalaciones Eléctricas',
    matricula: 'COPIME / Reg.',
    cuit: '',
    telefono: '',
    email: '',
    leyendaMembrete: 'Documentación Técnica conforme a Reglamentación AEA 90364'
  },
  parametrosTecnicos: {
    alturaDefault: 2.60,
    grosorParedDefault: 0.15,
    escalaDefault: 50,
    factorDesperdicioPct: 10
  },
  gdriveSync: {
    enabled: false,
    autoSyncOnSave: true
  }
};
