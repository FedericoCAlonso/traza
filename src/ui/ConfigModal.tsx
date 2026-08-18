import React, { useState } from 'react';
import { Modal } from './Modal';
import { F } from './Field';
import { useAppConfig } from '../hooks/useAppConfig';
import { useTheme } from '../hooks/useTheme';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Cloud, 
  Folder,
  Database,
  User, 
  Ruler, 
  RotateCcw
} from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProviderType = 'local_file' | 'google_drive' | 'manual_json';

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const { config, updateProfesional, updateParametrosTecnicos, resetDefaults } = useAppConfig();
  const { themeMode, setThemeMode } = useTheme();

  const [activeProvider, setActiveProvider] = useState<ProviderType>(() => {
    return (localStorage.getItem('ieba_sync_active_provider') as ProviderType) || 'google_drive';
  });

  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('ieba_auto_sync_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('ieba_sync_interval_minutes');
    return saved ? parseInt(saved, 10) : 5;
  });

  if (!isOpen) return null;

  const handleSelectProvider = (provider: ProviderType) => {
    setActiveProvider(provider);
    localStorage.setItem('ieba_sync_active_provider', provider);
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem('ieba_auto_sync_enabled', String(enabled));
  };

  const handleChangeInterval = (minutes: number) => {
    setSyncIntervalMinutes(minutes);
    localStorage.setItem('ieba_sync_interval_minutes', String(minutes));
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--on-surface-var)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    margin: '0 0 10px 0'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración General de Traza"
      maxWidth="680px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (confirm('¿Restablecer toda la configuración a los valores originales por defecto?')) {
                resetDefaults();
                handleSelectProvider('google_drive');
                handleToggleAutoSync(true);
                handleChangeInterval(5);
              }
            }}
            title="Restablecer valores originales"
          >
            <RotateCcw size={14} />
            <span>Restablecer</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Listo
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 1. Apariencia */}
        <div>
          <h4 style={sectionTitleStyle}>
            <Sun size={14} style={{ color: 'var(--primary)' }} />
            <span>Apariencia de la Aplicación</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setThemeMode('system')}
              className="card"
              style={{
                background: themeMode === 'system' ? 'var(--primary-container)' : 'var(--surface-container-highest)',
                color: themeMode === 'system' ? 'var(--on-primary-container)' : 'var(--on-surface)',
                border: themeMode === 'system' ? '2px solid var(--primary)' : '1px solid var(--outline-var)',
                borderRadius: 'var(--r)',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <Monitor size={20} />
              <strong style={{ fontSize: 13 }}>Automático (Sistema)</strong>
              <small style={{ opacity: 0.8, fontSize: 11 }}>Según tu SO</small>
            </button>

            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className="card"
              style={{
                background: themeMode === 'dark' ? 'var(--primary-container)' : 'var(--surface-container-highest)',
                color: themeMode === 'dark' ? 'var(--on-primary-container)' : 'var(--on-surface)',
                border: themeMode === 'dark' ? '2px solid var(--primary)' : '1px solid var(--outline-var)',
                borderRadius: 'var(--r)',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <Moon size={20} />
              <strong style={{ fontSize: 13 }}>Modo Oscuro</strong>
              <small style={{ opacity: 0.8, fontSize: 11 }}>Carbón & Oro</small>
            </button>

            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className="card"
              style={{
                background: themeMode === 'light' ? 'var(--primary-container)' : 'var(--surface-container-highest)',
                color: themeMode === 'light' ? 'var(--on-primary-container)' : 'var(--on-surface)',
                border: themeMode === 'light' ? '2px solid var(--primary)' : '1px solid var(--outline-var)',
                borderRadius: 'var(--r)',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <Sun size={20} />
              <strong style={{ fontSize: 13 }}>Modo Claro</strong>
              <small style={{ opacity: 0.8, fontSize: 11 }}>Marfil Cálido</small>
            </button>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--outline-var)', margin: 0 }} />

        {/* 2. Sincronización Descentralizada & Frecuencia */}
        <div>
          <h4 style={sectionTitleStyle}>
            <Cloud size={14} style={{ color: 'var(--primary)' }} />
            <span>Sincronización Descentralizada & Frecuencia</span>
          </h4>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--r)',
              background: 'var(--surface-container-highest)',
              border: '1px solid var(--outline-var)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleSelectProvider('local_file')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--r)',
                  border: activeProvider === 'local_file' ? '2px solid var(--primary)' : '1px solid var(--outline-var)',
                  background: activeProvider === 'local_file' ? 'var(--primary-container)' : 'var(--surface-container-high)',
                  color: activeProvider === 'local_file' ? 'var(--on-primary-container)' : 'var(--on-surface)',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <strong style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Folder size={14} /> 📁 Carpeta Local
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 10, opacity: 0.8 }}>
                  Disco local, Dropbox, Drive Sync o pendrive.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectProvider('google_drive')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--r)',
                  border: activeProvider === 'google_drive' ? '2px solid var(--primary)' : '1px solid var(--outline-var)',
                  background: activeProvider === 'google_drive' ? 'var(--primary-container)' : 'var(--surface-container-high)',
                  color: activeProvider === 'google_drive' ? 'var(--on-primary-container)' : 'var(--on-surface)',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <strong style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Cloud size={14} /> ☁️ Google Drive
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 10, opacity: 0.8 }}>
                  Sincronización en tu espacio de Google.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectProvider('manual_json')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--r)',
                  border: activeProvider === 'manual_json' ? '2px solid var(--primary)' : '1px solid var(--outline-var)',
                  background: activeProvider === 'manual_json' ? 'var(--primary-container)' : 'var(--surface-container-high)',
                  color: activeProvider === 'manual_json' ? 'var(--on-primary-container)' : 'var(--on-surface)',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <strong style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Database size={14} /> 💾 Respaldo JSON
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 10, opacity: 0.8 }}>
                  Descarga y restauración manual.
                </p>
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--outline-var)', paddingTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => handleToggleAutoSync(e.target.checked)}
                  />
                  <span>Sincronización Automática</span>
                </label>
                <p style={{ margin: '2px 0 0 24px', fontSize: '10px', color: 'var(--on-surface-var)' }}>
                  Fusiona cambios en segundo plano periódicamente.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-var)', marginBottom: '4px' }}>
                  Intervalo de Fusión
                </label>
                <select
                  value={syncIntervalMinutes}
                  onChange={(e) => handleChangeInterval(parseInt(e.target.value, 10) || 5)}
                  disabled={!autoSyncEnabled}
                >
                  <option value={1}>Cada 1 minuto (Tiempo real)</option>
                  <option value={3}>Cada 3 minutos</option>
                  <option value={5}>Cada 5 minutos (Recomendado)</option>
                  <option value={10}>Cada 10 minutos</option>
                  <option value={15}>Cada 15 minutos</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--outline-var)', margin: 0 }} />

        {/* 3. Datos de la Empresa / Electricista */}
        <div>
          <h4 style={sectionTitleStyle}>
            <User size={14} style={{ color: 'var(--primary)' }} />
            <span>Datos del Profesional / Empresa</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div>
              <F label="Nombre y Apellido / Titular">
                <input
                  type="text"
                  value={config.profesional.nombre}
                  onChange={(e) => updateProfesional({ nombre: e.target.value })}
                  placeholder="Ej: Ing. Juan Pérez"
                />
              </F>
            </div>
            <div>
              <F label="Empresa / Especialidad">
                <input
                  type="text"
                  value={config.profesional.empresa}
                  onChange={(e) => updateProfesional({ empresa: e.target.value })}
                  placeholder="Ej: ieBA Instalaciones"
                />
              </F>
            </div>
            <div>
              <F label="Matrícula Profesional / Registro">
                <input
                  type="text"
                  value={config.profesional.matricula}
                  onChange={(e) => updateProfesional({ matricula: e.target.value })}
                  placeholder="Ej: COPIME 12345"
                />
              </F>
            </div>
            <div>
              <F label="CUIT / DNI">
                <input
                  type="text"
                  value={config.profesional.cuit}
                  onChange={(e) => updateProfesional({ cuit: e.target.value })}
                  placeholder="Ej: 20-30405060-7"
                />
              </F>
            </div>
            <div>
              <F label="Teléfono / WhatsApp">
                <input
                  type="text"
                  value={config.profesional.telefono}
                  onChange={(e) => updateProfesional({ telefono: e.target.value })}
                  placeholder="Ej: +54 11 1234-5678"
                />
              </F>
            </div>
            <div>
              <F label="Email">
                <input
                  type="email"
                  value={config.profesional.email}
                  onChange={(e) => updateProfesional({ email: e.target.value })}
                  placeholder="contacto@estudio.com"
                />
              </F>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <F label="Leyenda Legal / Membrete de Pie de Plano">
                <input
                  type="text"
                  value={config.profesional.leyendaMembrete || ''}
                  onChange={(e) => updateProfesional({ leyendaMembrete: e.target.value })}
                  placeholder="Ej: Documentación Técnica conforme a Reglamentación AEA 90364"
                />
              </F>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--outline-var)', margin: 0 }} />

        {/* 4. Parámetros Técnicos / Dibujo */}
        <div>
          <h4 style={sectionTitleStyle}>
            <Ruler size={14} style={{ color: 'var(--primary)' }} />
            <span>Parámetros Técnicos de Dibujo & Cómputo</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div>
              <F label="Altura de Pared Default (m)">
                <input
                  type="number"
                  step="0.05"
                  value={config.parametrosTecnicos.alturaDefault}
                  onChange={(e) => updateParametrosTecnicos({ alturaDefault: parseFloat(e.target.value) || 2.6 })}
                />
              </F>
            </div>
            <div>
              <F label="Grosor de Pared Default (m)">
                <input
                  type="number"
                  step="0.01"
                  value={config.parametrosTecnicos.grosorParedDefault}
                  onChange={(e) => updateParametrosTecnicos({ grosorParedDefault: parseFloat(e.target.value) || 0.15 })}
                />
              </F>
            </div>
            <div>
              <F label="Escala por Defecto">
                <input
                  type="number"
                  step="1"
                  value={config.parametrosTecnicos.escalaDefault}
                  onChange={(e) => updateParametrosTecnicos({ escalaDefault: parseInt(e.target.value, 10) || 50 })}
                />
              </F>
            </div>
            <div>
              <F label="Margen Desperdicio y Curvas (%)">
                <input
                  type="number"
                  step="1"
                  value={config.parametrosTecnicos.factorDesperdicioPct}
                  onChange={(e) => updateParametrosTecnicos({ factorDesperdicioPct: parseFloat(e.target.value) || 10 })}
                />
              </F>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};
