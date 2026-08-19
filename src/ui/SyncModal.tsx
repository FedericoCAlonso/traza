import React, { useState } from 'react';
import { Modal } from './Modal';
import { 
  Cloud, 
  Folder, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Download,
  Upload
} from 'lucide-react';
import { syncEngine } from '../services/syncEngine';
import { useProjectStore } from '../store/useProjectStore';
import { useClientsStore } from '../store/useClientsStore';
import { exportBackupJSON, parseBackupJSON } from '../lib/storage';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProviderType = 'local_file' | 'google_drive' | 'manual_json';

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const { projects, importProjects } = useProjectStore();
  const { clients } = useClientsStore();

  const [activeProvider, setActiveProvider] = useState<ProviderType>(() => {
    return (localStorage.getItem('ieba_sync_active_provider') as ProviderType) || 'google_drive';
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    const raw = localStorage.getItem('ieba_last_sync_timestamp');
    return raw ? new Date(raw) : null;
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectProvider = (provider: ProviderType) => {
    setActiveProvider(provider);
    localStorage.setItem('ieba_sync_active_provider', provider);
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    setSyncState('idle');

    try {
      if (activeProvider === 'google_drive') {
        const result = await syncEngine.executeDriveSync();
        setSyncState('success');
        setStatusMessage(result.message);
        const now = new Date();
        setLastSyncTime(now);
        localStorage.setItem('ieba_last_sync_timestamp', now.toISOString());
      } else if (activeProvider === 'manual_json') {
        exportBackupJSON(projects);
        setSyncState('success');
        setStatusMessage('Copia de seguridad descargada exitosamente.');
      } else {
        // local_file
        const result = await syncEngine.executeDriveSync();
        setSyncState('success');
        setStatusMessage(result.message);
      }
    } catch (err: any) {
      setSyncState('error');
      setStatusMessage(err.message || 'Error al conectar con el proveedor seleccionado.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTriggerCleanup = async () => {
    if (!confirm('¿Deseas purgar de la nube y del dispositivo todos los contactos y proyectos borrados o residuales de versiones anteriores?\n\nEsta acción dejará únicamente los registros activos y saneará la base de datos maestra.')) {
      return;
    }

    setIsSyncing(true);
    setStatusMessage(null);
    setSyncState('idle');

    try {
      const result = await syncEngine.executeDataCleanup();
      setSyncState('success');
      setStatusMessage(result.message);
      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem('ieba_last_sync_timestamp', now.toISOString());
    } catch (err: any) {
      setSyncState('error');
      setStatusMessage(err.message || 'Error al ejecutar la limpieza de datos.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseBackupJSON(file);
      if (confirm(`Se importarán ${imported.length} proyecto(s). ¿Continuar con la fusión?`)) {
        importProjects(imported);
        setSyncState('success');
        setStatusMessage(`Se fusionaron ${imported.length} proyectos exitosamente.`);
      }
    } catch (err: any) {
      setSyncState('error');
      setStatusMessage(`Error al importar archivo: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isGoogleApiError = statusMessage?.toLowerCase().includes('google drive api') || 
                           statusMessage?.toLowerCase().includes('permisos') ||
                           statusMessage?.toLowerCase().includes('403');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sincronización Descentralizada (Offline-First)"
      maxWidth="620px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
          </button>
        </div>
      }
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json,application/json"
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Provider Selection Tabs */}
        <div 
          style={{ 
            display: 'flex', 
            background: 'var(--surface-container-highest)', 
            padding: '4px', 
            borderRadius: 'var(--r-lg)', 
            gap: '4px' 
          }}
        >
          <button
            type="button"
            onClick={() => handleSelectProvider('google_drive')}
            className={`btn btn-sm ${activeProvider === 'google_drive' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '8px 10px', fontSize: '12px' }}
          >
            <Cloud size={14} />
            <span>☁️ Google Drive</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectProvider('local_file')}
            className={`btn btn-sm ${activeProvider === 'local_file' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '8px 10px', fontSize: '12px' }}
          >
            <Folder size={14} />
            <span>📁 Carpeta Local</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectProvider('manual_json')}
            className={`btn btn-sm ${activeProvider === 'manual_json' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '8px 10px', fontSize: '12px' }}
          >
            <Database size={14} />
            <span>💾 Respaldo JSON</span>
          </button>
        </div>

        {/* Main Status Banner */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--r)',
            border: syncState === 'error' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
            background: syncState === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          {syncState === 'error' ? (
            <AlertCircle size={20} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 2 }} />
          ) : (
            <CheckCircle2 size={20} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <strong style={{ fontSize: '13px', color: 'var(--on-surface)' }}>
              {syncState === 'error'
                ? 'Atención al Sincronizar'
                : isSyncing
                ? 'Sincronizando registros...'
                : 'Almacenamiento Local-First Activo'}
            </strong>

            <p style={{ margin: 0, fontSize: '12px', color: 'var(--on-surface-var)', lineHeight: 1.4 }}>
              {statusMessage || (
                activeProvider === 'google_drive'
                  ? 'Los cambios se sincronizan directamente en tu cuenta personal de Google Drive en cotizador_ieba_master.json.'
                  : activeProvider === 'local_file'
                  ? 'Los cambios se fusionan automáticamente (Last-Write-Wins) con el archivo maestro en tu disco local o carpeta sincronizada.'
                  : 'Puedes exportar o restaurar el archivo JSON maestro con fusión inteligente de cambios.'
              )}
            </p>

            {/* Quick Actions if Google Drive API error */}
            {syncState === 'error' && activeProvider === 'google_drive' && isGoogleApiError && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                <a
                  href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=traza-7257f"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-primary"
                  style={{ fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={12} />
                  <span>Habilitar Google Drive API en Google Cloud (1 clic)</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleSelectProvider('manual_json')}
                  className="btn btn-sm btn-ghost"
                  style={{ fontSize: '11px' }}
                >
                  <span>💾 Usar Respaldo JSON</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sync Stats Info */}
        <div
          style={{
            background: 'var(--surface-container-high)',
            padding: '12px 16px',
            borderRadius: 'var(--r)',
            border: '1px solid var(--outline-var)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--on-surface-var)' }}>Proveedor activo:</span>
            <strong style={{ color: 'var(--primary)' }}>
              {activeProvider === 'google_drive' ? '☁️ Google Drive Personal' : activeProvider === 'local_file' ? '📁 Archivo en Disco Local' : '💾 Manual JSON'}
            </strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--on-surface-var)' }}>Última sincronización:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--on-surface)' }}>
              {lastSyncTime ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--on-surface-var)' }}>Datos en dispositivo:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--on-surface)' }}>
              {projects.length} relevamientos · {clients.length} clientes
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--on-surface-var)' }}>Motor de Fusión:</span>
            <strong style={{ color: 'var(--green)', fontFamily: 'monospace' }}>Last-Write-Wins (LWW)</strong>
          </div>
        </div>

        {/* Maintenance / Data Purge Section */}
        <div
          style={{
            background: 'var(--surface-container-low)',
            padding: '12px 14px',
            borderRadius: 'var(--r)',
            border: '1px dashed var(--outline-var)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '220px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface)' }}>
              🧹 Depurar y Compactar Base de Datos
            </span>
            <span style={{ fontSize: '11px', color: 'var(--on-surface-var)', lineHeight: 1.3 }}>
              Elimina permanentemente de la nube y del dispositivo los contactos y relevamientos borrados o residuales de versiones anteriores.
            </span>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleTriggerCleanup}
            disabled={isSyncing}
            style={{ fontSize: '12px', color: 'var(--red)', border: '1px solid var(--outline-var)' }}
          >
            {isSyncing ? 'Depurando...' : 'Limpiar y Purgar'}
          </button>
        </div>

        {/* Manual Actions for JSON Backup Provider */}
        {activeProvider === 'manual_json' && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => exportBackupJSON(projects)}
              style={{ flex: 1, minWidth: '160px' }}
            >
              <Download size={14} />
              <span>Descargar Backup JSON</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ flex: 1, minWidth: '160px' }}
            >
              <Upload size={14} />
              <span>Restaurar y Fusionar JSON</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
