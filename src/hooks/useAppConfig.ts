import { useState, useEffect } from 'react';
import { type AppConfig, DEFAULT_APP_CONFIG } from '../types/config';

const CONFIG_STORAGE_KEY = 'ieba_app_config';

export const loadAppConfig = (): AppConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_APP_CONFIG,
      ...parsed,
      profesional: { ...DEFAULT_APP_CONFIG.profesional, ...(parsed.profesional || {}) },
      parametrosTecnicos: { ...DEFAULT_APP_CONFIG.parametrosTecnicos, ...(parsed.parametrosTecnicos || {}) },
      gdriveSync: { ...DEFAULT_APP_CONFIG.gdriveSync, ...(parsed.gdriveSync || {}) },
    };
  } catch {
    return DEFAULT_APP_CONFIG;
  }
};

export const saveAppConfig = (config: AppConfig): void => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error al guardar configuración:', err);
  }
};

export function useAppConfig() {
  const [config, setConfigState] = useState<AppConfig>(loadAppConfig);

  useEffect(() => {
    saveAppConfig(config);
  }, [config]);

  const updateConfig = (patch: Partial<AppConfig>) => {
    setConfigState(prev => {
      const next = {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString()
      };
      saveAppConfig(next);
      return next;
    });
  };

  const updateProfesional = (patch: Partial<AppConfig['profesional']>) => {
    setConfigState(prev => {
      const next = {
        ...prev,
        profesional: { ...prev.profesional, ...patch },
        updatedAt: new Date().toISOString()
      };
      saveAppConfig(next);
      return next;
    });
  };

  const updateParametrosTecnicos = (patch: Partial<AppConfig['parametrosTecnicos']>) => {
    setConfigState(prev => {
      const next = {
        ...prev,
        parametrosTecnicos: { ...prev.parametrosTecnicos, ...patch },
        updatedAt: new Date().toISOString()
      };
      saveAppConfig(next);
      return next;
    });
  };

  return {
    config,
    updateConfig,
    updateProfesional,
    updateParametrosTecnicos,
    resetDefaults: () => setConfigState(DEFAULT_APP_CONFIG)
  };
}
