import React, { useState } from 'react';
import { Modal } from './Modal';
import { F } from './Field';
import { useAppConfig } from '../hooks/useAppConfig';
import { useTheme } from '../hooks/useTheme';
import { gdriveProvider } from '../services/GoogleDriveProvider';
import { syncEngine } from '../services/syncEngine';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Cloud, 
  User, 
  Ruler, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Download,
  RotateCcw
} from 'lucide-react';
import { exportBackupJSON } from '../lib/storage';
import { useProjectStore } from '../store/useProjectStore';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'apariencia' | 'profesional' | 'nube' | 'tecnico';

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const { config, updateProfesional, updateParametrosTecnicos, resetDefaults } = useAppConfig();
  const { themeMode, setThemeMode } = useTheme();
  const { projects } = useProjectStore();

  const [activeTab, setActiveTab] = useState<TabType>('apariencia');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  if (!isOpen) return null;

  const driveStatus = gdriveProvider.getStatus();

  const handleDriveConnect = async () => {
    try {
      const ok = await gdriveProvider.connect();
      if (ok) {
        setSyncMessage('Google Drive conectado exitosamente.');
      } else {
        setSyncError('No se pudo conectar a Google Drive.');
      }
    } catch (err: any) {
      setSyncError(err.message);
    }
  };

  const handleDriveSyncNow = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    setSyncError(null);
    try {
      const result = await syncEngine.executeDriveSync();
      setSyncMessage(result.message);
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración de Traza & Suite ieBA"
      maxWidth="620px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (confirm('¿Restablecer configuración a valores por defecto?')) {
                resetDefaults();
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
      {/* Navigation tabs */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '6px', 
          borderBottom: '1px solid var(--outline-var)', 
          paddingBottom: '10px', 
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}
      >
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'apariencia' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('apariencia')}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <Sun size={15} />
          <span>Apariencia</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'profesional' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('profesional')}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <User size={15} />
          <span>Perfil & Membrete</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'nube' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('nube')}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <Cloud size={15} />
          <span>Google Drive</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'tecnico' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('tecnico')}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <Ruler size={15} />
          <span>Técnico</span>
        </button>
      </div>

      {/* Tab 1: Apariencia */}
      {activeTab === 'apariencia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p className="m3-body-small" style={{ color: 'var(--on-surface-var)', margin: 0 }}>
            Elegí el esquema de colores para la interfaz de Traza y la Suite ieBA.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setThemeMode('system')}
              className="card"
              style={{
                background: themeMode === 'system' ? 'var(--primary-container)' : 'var(--surface-container-high)',
                color: themeMode === 'system' ? 'var(--on-primary-container)' : 'var(--on-surface)',
                border: themeMode === 'system' ? '2px solid var(--primary)' : '1px solid var(--outline-var)',
                borderRadius: 'var(--r)',
                padding: '14px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <Monitor size={22} />
              <strong style={{ fontSize: 13 }}>Sistema</strong>
              <small style={{ opacity: 0.8, fontSize: 11 }}>Según tu SO</small>
            </button>

            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className="card"
              style={{
                background: themeMode === 'dark' ? 'var(--primary-container)' : 'var(--surface-container-high)',
                color: themeMode === 'dark' ? 'var(--on-primary-container)' : 'var(--on-surface)',
                border: themeMode === 'dark' ? '2px solid var(--primary)' : '1px solid var(--outline-var)',
                borderRadius: 'var(--r)',
                padding: '14px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <Moon size={22} />
              <strong style={{ fontSize: 13 }}>Oscuro</strong>
              <small style={{ opacity: 0.8, fontSize: 11 }}>Carbón & Oro</small>
            </button>

            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className="card"
              style={{
                background: themeMode === 'light' ? 'var(--primary-container)' : 'var(--surface-container-high)',
                color: themeMode === 'light' ? 'var(--on-primary-container)' : 'var(--on-surface)',
                border: themeMode === 'light' ? '2px solid var(--primary)' : '1px solid var(--outline-var)',
                borderRadius: 'var(--r)',
                padding: '14px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <Sun size={22} />
              <strong style={{ fontSize: 13 }}>Claro</strong>
              <small style={{ opacity: 0.8, fontSize: 11 }}>Marfil Cálido</small>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Perfil Profesional */}
      {activeTab === 'profesional' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p className="m3-body-small" style={{ color: 'var(--on-surface-var)', margin: 0 }}>
            Estos datos se incluirán en el rótulo de los planos, membretes de informes técnicos y memorias de cálculo exportadas.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
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
              <F label="Empresa / Estudio">
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
              <F label="Teléfono de Contacto">
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
              <F label="Leyenda Legal / Membrete de Pie">
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
      )}

      {/* Tab 3: Google Drive & Respaldo */}
      {activeTab === 'nube' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              background: 'var(--surface-container-high)',
              padding: '14px 16px',
              borderRadius: 'var(--r)',
              border: '1px solid var(--outline-var)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' }}>
                <Cloud size={24} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div>
                  <strong className="m3-title-small" style={{ color: 'var(--on-surface)', display: 'block' }}>
                    {driveStatus.label}
                  </strong>
                  <span className="m3-label-small" style={{ color: 'var(--on-surface-var)', wordBreak: 'break-all' }}>
                    Archivo: <code>cotizador_ieba_master.json</code>
                  </span>
                </div>
              </div>

              {!driveStatus.isConfigured ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={handleDriveConnect}>
                  Conectar Drive
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-acc btn-sm"
                  onClick={handleDriveSyncNow}
                  disabled={isSyncing}
                >
                  <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
                </button>
              )}
            </div>

            {syncMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--green)', fontSize: 13, background: 'rgba(46,125,50,0.1)', padding: '6px 10px', borderRadius: 'var(--r-sm)' }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{syncMessage}</span>
              </div>
            )}

            {syncError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red)', fontSize: 13, background: 'rgba(211,47,47,0.1)', padding: '6px 10px', borderRadius: 'var(--r-sm)' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{syncError}</span>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--outline-var)', paddingTop: '12px' }}>
            <h4 className="m3-title-small" style={{ margin: '0 0 6px 0', color: 'var(--on-surface)' }}>
              Copia de Seguridad Local
            </h4>
            <p className="m3-body-small" style={{ color: 'var(--on-surface-var)', margin: '0 0 10px 0' }}>
              Podés descargar en cualquier momento una copia JSON con todos tus relevamientos y clientes.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => exportBackupJSON(projects)}
            >
              <Download size={15} />
              <span>Descargar Archivo de Respaldo JSON</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Parámetros Técnicos */}
      {activeTab === 'tecnico' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p className="m3-body-small" style={{ color: 'var(--on-surface-var)', margin: 0 }}>
            Valores por defecto para el trazado de ambientes y cómputo de materiales.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
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
      )}
    </Modal>
  );
};
