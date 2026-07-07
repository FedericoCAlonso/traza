import { Modal } from '../../ui/Modal'
import type { Project } from '../../types/index'

/**
 * Representa la estructura de un conflicto de sincronización activo.
 */
export interface SyncConflict {
  /** Copia del proyecto con cambios locales */
  localProject: Project
  /** Copia del proyecto con cambios remotos en la nube */
  remoteProject: Project
  /** Función que resuelve el conflicto aplicando una acción ('local' o 'cloud') */
  resolve: (action: 'local' | 'cloud') => void
}

interface SyncConflictModalProps {
  /** Conflicto de sincronización activo, o `null` si no hay conflicto */
  conflict: SyncConflict | null
}

/**
 * Modal de resolución de conflictos de sincronización.
 * Bloquea la interacción del usuario y le presenta información detallada de la última
 * fecha de modificación local y remota para que decida cuál conservar.
 */
export function SyncConflictModal({ conflict }: SyncConflictModalProps) {
  if (!conflict) return null

  const { localProject, remoteProject, resolve } = conflict
  const projectName = localProject.nombre || remoteProject.nombre || 'Proyecto sin nombre'

  const localDate = localProject.updatedAt ? new Date(localProject.updatedAt).toLocaleString() : 'Desconocida'
  const remoteDate = remoteProject.updatedAt ? new Date(remoteProject.updatedAt).toLocaleString() : 'Desconocida'

  // Acciones en el pie del diálogo
  const footer = (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%', marginTop: '16px' }}>
      <button 
        type="button"
        style={{
          padding: '8px 16px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
          fontWeight: 'bold',
          fontSize: '13px'
        }}
        onClick={() => resolve('cloud')}
      >
        Usar versión de la nube
      </button>
      <button 
        type="button"
        style={{
          padding: '8px 16px',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
          fontWeight: 'bold',
          fontSize: '13px'
        }}
        onClick={() => resolve('local')}
      >
        Usar versión local (Sobrescribir)
      </button>
    </div>
  )

  return (
    <Modal
      isOpen={true}
      onClose={() => {}} // Bloquear cierre accidental sin resolver el conflicto
      title="Conflicto de Sincronización"
      footer={footer}
    >
      <div style={{ color: 'var(--text)', fontSize: '14px', lineHeight: '1.6', fontFamily: 'var(--sans)' }}>
        <p style={{ marginBottom: '16px' }}>
          Se detectó que el proyecto <strong>{projectName}</strong> fue modificado en otro dispositivo o sesión.
        </p>
        
        <div style={{ 
          background: 'var(--bg3)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '12px', 
          marginBottom: '16px' 
        }}>
          <p style={{ margin: '0 0 8px 0', color: 'var(--text2)' }}>
            📅 <strong>Edición local:</strong> {localDate}
          </p>
          <p style={{ margin: 0, color: 'var(--text2)' }}>
            ☁️ <strong>Edición en la nube:</strong> {remoteDate}
          </p>
        </div>

        <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>
          ¿Qué versión deseas conservar?
        </p>
        <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px', color: 'var(--text3)', fontSize: '13px' }}>
          <li>
            <strong>Usar versión de la nube:</strong> Descargará los cambios remotos y reemplazará tus cambios locales actuales.
          </li>
          <li style={{ marginTop: '8px' }}>
            <strong>Usar versión local (Sobrescribir):</strong> Conservará tus cambios locales actuales y los subirá a la nube, sobrescribiendo la versión remota.
          </li>
        </ul>
      </div>
    </Modal>
  )
}
