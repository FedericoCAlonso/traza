import { useState, useEffect } from 'react'
import { useProjectInstallation } from '../../../../hooks/useProjectInstallation'
import { FormularioCircuito } from '../../../../components/shared/FormularioCircuito'
import { CircuitoCard } from '../CircuitoCard'
import type { Circuito, Tablero } from '../../../../types/index'

interface CircuitsTabProps {
  onCircuitCreated?: (circuitoId: string) => void;
  onCancelCircuitRequest?: () => void;
  pendingBoca?: string | null;
}

export function CircuitsTab({ onCircuitCreated, onCancelCircuitRequest, pendingBoca }: CircuitsTabProps) {
  const {
    tableros,
    circuitos,
    addTablero,
    addCircuito,
    updateCircuito,
    deleteCircuito,
    deleteTablero,
  } = useProjectInstallation()

  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [circuitoEdit, setCircuitoEdit] = useState<Circuito | null>(null)

  // Inline form para nuevo tablero
  const [nuevoTablero, setNuevoTablero] = useState(false)
  const [formTablero, setFormTablero] = useState({
    nombre: '',
    tipo: 'seccional' as Tablero['tipo'],
    ubicacion: ''
  })

  // Auto-open form if we came here specifically to create a circuit and have tableros
  useEffect(() => {
    if (pendingBoca && tableros.length > 0 && !formularioAbierto && !circuitoEdit) {
      setFormularioAbierto(true)
    }
  }, [pendingBoca, tableros.length, formularioAbierto, circuitoEdit])

  const handleGuardarCircuito = (data: Omit<Circuito, 'id'>) => {
    if (circuitoEdit) {
      updateCircuito(circuitoEdit.id, data)
    } else {
      const nuevo = addCircuito(data)
      if (pendingBoca && onCircuitCreated) {
        onCircuitCreated(nuevo.id)
        return // Return early to let EditorScreen handle the state and tab change
      }
    }
    setFormularioAbierto(false)
    setCircuitoEdit(null)
  }

  const handleCancelarCircuito = () => {
    setFormularioAbierto(false)
    setCircuitoEdit(null)
    if (pendingBoca && onCancelCircuitRequest) {
      onCancelCircuitRequest()
    }
  }

  const handleNuevoCircuito = () => {
    setCircuitoEdit(null)
    setFormularioAbierto(true)
  }

  const handleEditarCircuito = (c: Circuito) => {
    setCircuitoEdit(c)
    setFormularioAbierto(true)
  }

  const handleAgregarTablero = () => {
    if (!formTablero.nombre.trim()) return
    addTablero({
      nombre: formTablero.nombre.trim(),
      tipo: formTablero.tipo,
      ubicacion: formTablero.ubicacion.trim() || undefined
    })
    setFormTablero({ nombre: '', tipo: 'seccional', ubicacion: '' })
    setNuevoTablero(false)
  }

  const circuitosDeTablero = (tableroId: string) =>
    circuitos.filter((c: any) => c.tableroId === tableroId)

  const circuitosSinTablero = circuitos.filter((c: any) => !c.tableroId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {pendingBoca && (
        <div style={{ background: 'var(--blue)', color: '#fff', padding: 12, borderRadius: 'var(--r)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Creando Circuito para Boca</strong>
            {tableros.length === 0 && <div style={{ fontSize: 13, marginTop: 4 }}>Por favor, crea un tablero primero.</div>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleCancelarCircuito} style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            ✕ Cancelar
          </button>
        </div>
      )}

      <div className="info-helper">
        Definí los <strong>tableros</strong> del proyecto y luego los <strong>circuitos</strong> asociados a cada uno.<br />
        Nomenclatura AEA: <strong>TS1.C1</strong> = Circuito C1 del Tablero Seccional 1.
      </div>

      {/* Tableros */}
      {tableros.length === 0 && (
        <div style={{
          padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13,
          border: '1px dashed var(--border)', borderRadius: 'var(--r)'
        }}>
          No hay tableros definidos. Creá el primero para poder agregar circuitos.
        </div>
      )}

      {tableros.map((t: Tablero) => (
        <div key={t.id} style={{
          border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg2)'
        }}>
          {/* Header del tablero */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderBottom: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)' }}>{t.nombre}</div>
              <div style={{
                fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5
              }}>
                {t.tipo}{t.ubicacion ? ` · ${t.ubicacion}` : ''}
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleNuevoCircuito}
              title="Agregar circuito"
            >
              ＋ Circuito
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (confirm(`¿Eliminar tablero "${t.nombre}"? Los circuitos pasarán a "sin tablero".`)) {
                  deleteTablero(t.id)
                }
              }}
              title="Eliminar tablero"
            >
              🗑
            </button>
          </div>

          {/* Circuitos del tablero */}
          <div style={{ padding: '8px 12px' }}>
            {circuitosDeTablero(t.id).length === 0 ? (
              <div style={{
                padding: '12px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12
              }}>
                Sin circuitos en este tablero.
              </div>
            ) : (
              circuitosDeTablero(t.id).map((c: any, i: number) => (
                <div key={c.id} style={{ marginBottom: 8 }}>
                  <CircuitoCard
                    circuito={c}
                    index={i}
                    tableroNombre={t.nombre}
                    onChange={(nc) => updateCircuito(c.id, nc)}
                    onRemove={() => deleteCircuito(c.id)}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleEditarCircuito(c)}
                    >
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}

      {/* Circuitos sin tablero */}
      {circuitosSinTablero.length > 0 && (
        <div style={{
          border: '1px dashed var(--border)', borderRadius: 'var(--r)',
          background: 'var(--bg2)', padding: 12
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text3)',
            marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5
          }}>
            Circuitos sin tablero asignado
          </div>
          {circuitosSinTablero.map((c: any, i: number) => (
            <div key={c.id} style={{ marginBottom: 8 }}>
              <CircuitoCard
                circuito={c}
                index={i}
                onChange={(nc) => updateCircuito(c.id, nc)}
                onRemove={() => deleteCircuito(c.id)}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 4, justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleEditarCircuito(c)}
                >
                  ✏️ Asignar a tablero
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agregar tablero */}
      {!nuevoTablero ? (
        <button
          className="btn btn-acc"
          style={{ width: '100%' }}
          onClick={() => setNuevoTablero(true)}
        >
          ＋ Nuevo Tablero
        </button>
      ) : (
        <div style={{
          border: '1px solid var(--border)', borderRadius: 'var(--r)',
          background: 'var(--bg2)', padding: 14
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: 'var(--text-h)' }}>
            Nuevo Tablero
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <input
              placeholder="Nombre (ej: TS1)"
              value={formTablero.nombre}
              onChange={e => setFormTablero(f => ({ ...f, nombre: e.target.value }))}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 'var(--r)',
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 14
              }}
            />
            <select
              value={formTablero.tipo}
              onChange={e => setFormTablero(f => ({ ...f, tipo: e.target.value as Tablero['tipo'] }))}
              style={{
                padding: '8px 10px', borderRadius: 'var(--r)',
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 14
              }}
            >
              <option value="general">General</option>
              <option value="seccional">Seccional</option>
              <option value="auxiliar">Auxiliar</option>
            </select>
          </div>
          <input
            placeholder="Ubicación (opcional)"
            value={formTablero.ubicacion}
            onChange={e => setFormTablero(f => ({ ...f, ubicacion: e.target.value }))}
            style={{
              width: '100%', padding: '8px 10px', marginBottom: 12,
              borderRadius: 'var(--r)', border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text)', fontSize: 14
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setNuevoTablero(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-acc btn-sm"
              onClick={handleAgregarTablero}
              disabled={!formTablero.nombre.trim()}
            >
              Guardar Tablero
            </button>
          </div>
        </div>
      )}

      {/* Modal Formulario Circuito */}
      {formularioAbierto && (
        <FormularioCircuito
          tableros={tableros}
          circuitoEdit={circuitoEdit}
          onSave={handleGuardarCircuito}
          onCancel={handleCancelarCircuito}
        />
      )}
    </div>
  )
}
