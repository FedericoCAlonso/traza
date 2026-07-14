import { useState } from 'react'
import type { Project } from '../../../../types/project'
import type { Campania, MedicionCampania } from '../../../../types/measurements'
import { useProjectStore } from '../../../../store/useProjectStore'
import { CampaniaFormModal } from '../CampaniaFormModal'

interface Props {
  project: Project
  campaniaActivaId: string | null
  onSetCampaniaActiva: (id: string | null) => void
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function elementoLabel(m: MedicionCampania, project: Project): string {
  const ref = m.elementoRef
  if (ref.tipo === 'boca' || ref.tipo === 'tablero') {
    const amb = project.ambientes.find(a => a.id === ref.ambienteId)
    const el  = amb?.elementos.find(e => e.id === ref.elementoId)
    if (el) return `${amb?.nombre ?? '?'} › ${el.referencia || el.tipo}`
    return `${amb?.nombre ?? '?'} › (elemento)`
  }
  if (ref.tipo === 'tierra')      return `Tierra: ${ref.descripcion}`
  if (ref.tipo === 'circuito')    return `Circuito: ${ref.circuitoId}`
  if (ref.tipo === 'diferencial') return `Diferencial (tablero: ${ref.tableroId})`
  return '(elemento)'
}

function resultIcon(aprobado?: boolean) {
  if (aprobado === true)  return <span style={{ color: '#4caf50' }}>✓</span>
  if (aprobado === false) return <span style={{ color: '#f44336' }}>✗</span>
  return <span style={{ color: '#9e9e9e' }}>—</span>
}

interface CampaniaCardProps {
  campania: Campania
  mediciones: MedicionCampania[]
  project: Project
  isActiva: boolean
  onSetActiva: () => void
  onEdit: () => void
  onClose: () => void
  onDelete: () => void
  onDeleteMedicion: (id: string) => void
}

function CampaniaCard({ campania, mediciones, project, isActiva, onSetActiva, onEdit, onClose, onDelete, onDeleteMedicion }: CampaniaCardProps) {
  const [expanded, setExpanded] = useState(false)
  const aprobadas  = mediciones.filter(m => m.aprobado === true).length
  const rechazadas = mediciones.filter(m => m.aprobado === false).length

  const estadoIcon  = campania.estado === 'activa' ? '🟢' : '🔒'

  return (
    <div style={{
      border: `1px solid ${isActiva ? 'var(--accent)' : 'var(--outline-var)'}`,
      borderRadius: 12, overflow: 'hidden',
      boxShadow: isActiva ? '0 0 0 2px var(--accent)33' : 'none',
      transition: 'box-shadow .2s'
    }}>
      {/* Header de la tarjeta */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '10px 14px', cursor: 'pointer',
          background: isActiva ? 'var(--accent)11' : 'var(--surface-2)',
          display: 'flex', alignItems: 'center', gap: 8
        }}
      >
        <span style={{ fontSize: 14 }}>{estadoIcon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {campania.nombre}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
            {campania.instrumento} · {campania.tipoMedicion || 'sin tipo'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {fmtDate(campania.fechaInicio)}{campania.fechaFin ? ` → ${fmtDate(campania.fechaFin)}` : ' (en curso)'}
            {' · '}{mediciones.length} mediciones
            {mediciones.length > 0 && <> · <span style={{ color: '#4caf50' }}>{aprobadas}✓</span> <span style={{ color: '#f44336' }}>{rechazadas}✗</span></>}
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Datos */}
          <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span>🔬 {campania.instrumento}{campania.instrumentoSerie ? ` · S/N: ${campania.instrumentoSerie}` : ''}</span>
            <span>📏 Unidad: {campania.unidad}</span>
            {campania.tecnicos.length > 0 && <span>👷 {campania.tecnicos.join(', ')}</span>}
            {campania.notas && <span>💬 {campania.notas}</span>}
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {campania.estado === 'activa' && (
              <button className="btn btn-acc btn-sm" onClick={onSetActiva} style={{ fontSize: 11 }}>
                {isActiva ? '✓ Campaña activa' : '▶ Usar esta campaña'}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={onEdit}>✏️ Editar</button>
            {campania.estado === 'activa' && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={onClose}>🔒 Cerrar campaña</button>
            )}
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: '#f44336' }} onClick={onDelete}>🗑 Eliminar</button>
          </div>

          {/* Mediciones */}
          {mediciones.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 2 }}>Mediciones</div>
              {mediciones.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 8px', borderRadius: 8,
                  background: 'var(--surface-1)', fontSize: 12
                }}>
                  <span style={{ marginTop: 1 }}>{resultIcon(m.aprobado)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {elementoLabel(m, project)}
                    </div>
                    {m.lecturas.map((l, i) => (
                      <div key={i} style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                        {l.etiqueta ? `${l.etiqueta}: ` : ''}{l.valor} {l.unidad ?? campania.unidad}
                        {l.aprobado === true ? ' ✓' : l.aprobado === false ? ' ✗' : ''}
                      </div>
                    ))}
                    {m.notas && <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: 11 }}>{m.notas}</div>}
                    <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                      {new Date(m.fechaHora).toLocaleString('es-AR')}
                    </div>
                  </div>
                  <button onClick={() => onDeleteMedicion(m.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                </div>
              ))}
            </div>
          )}

          {mediciones.length === 0 && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
              {campania.estado === 'activa'
                ? 'Seleccioná esta campaña y tocá una boca en el plano para registrar mediciones.'
                : 'Esta campaña no tiene mediciones registradas.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function MedicionesTab({ project, campaniaActivaId, onSetCampaniaActiva }: Props) {
  const { addCampania, updateCampania, closeCampania, deleteCampania, deleteMedicion } = useProjectStore()
  const [showForm, setShowForm]   = useState(false)
  const [editando, setEditando]   = useState<Campania | null>(null)

  const campanias   = project.campanias          || []
  const mediciones  = project.medicionesCampania || []

  const handleCreate = (data: Omit<Campania, 'id' | 'fechaInicio' | 'estado'>) => {
    const nueva: Campania = {
      ...data,
      id:          crypto.randomUUID(),
      fechaInicio: Date.now(),
      estado:      'activa',
    }
    addCampania(project.id, nueva)
    setShowForm(false)
  }

  const handleEdit = (data: Omit<Campania, 'id' | 'fechaInicio' | 'estado'>) => {
    if (!editando) return
    updateCampania(project.id, editando.id, data)
    setEditando(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 4px' }}>
      {/* Banner de campaña activa */}
      {campaniaActivaId && (() => {
        const c = campanias.find(x => x.id === campaniaActivaId)
        return c ? (
          <div style={{
            background: 'var(--accent)18', border: '1px solid var(--accent)',
            borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--text)'
          }}>
            <strong>🟢 Campaña activa:</strong> {c.nombre}<br />
            <span style={{ color: 'var(--text-dim)' }}>Tocá una boca o tablero en el plano para registrar una medición.</span>
            <div style={{ marginTop: 6 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                onClick={() => onSetCampaniaActiva(null)}>
                ⏹ Desactivar
              </button>
            </div>
          </div>
        ) : null
      })()}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>
          Campañas ({campanias.length})
        </div>
        <button className="btn btn-acc btn-sm" style={{ fontSize: 12 }} onClick={() => setShowForm(true)}>
          + Nueva campaña
        </button>
      </div>

      {/* Lista de campañas */}
      {campanias.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>
          No hay campañas de medición. Creá una para empezar a registrar ensayos eléctricos.
        </p>
      )}

      {campanias.slice().reverse().map(c => (
        <CampaniaCard
          key={c.id}
          campania={c}
          mediciones={mediciones.filter(m => m.campaniaId === c.id)}
          project={project}
          isActiva={campaniaActivaId === c.id}
          onSetActiva={() => onSetCampaniaActiva(campaniaActivaId === c.id ? null : c.id)}
          onEdit={() => setEditando(c)}
          onClose={() => closeCampania(project.id, c.id)}
          onDelete={() => {
            if (confirm(`¿Eliminar campaña "${c.nombre}" y todas sus mediciones?`)) {
              deleteCampania(project.id, c.id)
              if (campaniaActivaId === c.id) onSetCampaniaActiva(null)
            }
          }}
          onDeleteMedicion={(mid) => {
            if (confirm('¿Eliminar esta medición?')) deleteMedicion(project.id, mid)
          }}
        />
      ))}

      {/* Modales */}
      {showForm && (
        <CampaniaFormModal
          onConfirm={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
      {editando && (
        <CampaniaFormModal
          initial={editando}
          onConfirm={handleEdit}
          onCancel={() => setEditando(null)}
        />
      )}
    </div>
  )
}
