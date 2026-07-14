import { useState } from 'react'
import type { Campania, EstadoCampania } from '../../../types/measurements'

interface Props {
  initial?: Partial<Campania>
  onConfirm: (c: Omit<Campania, 'id' | 'fechaInicio' | 'estado'> & { id?: string; fechaInicio?: number; estado?: EstadoCampania }) => void
  onCancel: () => void
}

const UNIDADES_SUGERIDAS = ['Ω', 'mΩ', 'MΩ', 'mA', 'A', 'ms', 's', 'V', '%', '—']

export function CampaniaFormModal({ initial, onConfirm, onCancel }: Props) {
  const [nombre, setNombre]       = useState(initial?.nombre       || '')
  const [tipo, setTipo]           = useState(initial?.tipoMedicion || '')
  const [instr, setInstr]         = useState(initial?.instrumento  || '')
  const [serie, setSerie]         = useState(initial?.instrumentoSerie || '')
  const [unidad, setUnidad]       = useState(initial?.unidad       || 'Ω')
  const [notas, setNotas]         = useState(initial?.notas        || '')
  const [tecInput, setTecInput]   = useState('')
  const [tecnicos, setTecnicos]   = useState<string[]>(initial?.tecnicos || [])

  const addTecnico = () => {
    const t = tecInput.trim()
    if (t && !tecnicos.includes(t)) {
      setTecnicos([...tecnicos, t])
    }
    setTecInput('')
  }

  const removeTecnico = (t: string) => setTecnicos(tecnicos.filter(x => x !== t))

  const handleSubmit = () => {
    if (!nombre.trim() || !instr.trim() || !unidad.trim()) return
    onConfirm({
      nombre:          nombre.trim(),
      tipoMedicion:    tipo.trim(),
      instrumento:     instr.trim(),
      instrumentoSerie: serie.trim() || undefined,
      unidad:          unidad.trim(),
      tecnicos,
      notas:           notas.trim() || undefined,
    })
  }

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 12,
    color: 'var(--text-dim)',
    fontFamily: 'var(--sans)',
  }

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px',
    borderRadius: 8,
    border: '1px solid var(--outline-var)',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    fontSize: 13,
    fontFamily: 'var(--sans)',
    outline: 'none',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10001, padding: 16
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--surface-1)',
        padding: 20, borderRadius: 16,
        boxShadow: 'var(--shadow-3)',
        display: 'flex', flexDirection: 'column', gap: 14,
        maxHeight: '90dvh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-h)' }}>
            {initial?.id ? '✏️ Editar Campaña' : '🆕 Nueva Campaña'}
          </h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-dim)' }}>✕</button>
        </div>

        <label style={labelStyle}>
          Nombre *
          <input style={inputStyle} value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Continuidad de masas – Julio 2026" />
        </label>

        <label style={labelStyle}>
          Tipo / Norma de referencia
          <input style={inputStyle} value={tipo} onChange={e => setTipo(e.target.value)}
            placeholder="SRT 900/15, Resistencia de lazo, Verificación DR..." />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={labelStyle}>
            Instrumento *
            <input style={inputStyle} value={instr} onChange={e => setInstr(e.target.value)}
              placeholder="Fluke 1664 FC" />
          </label>
          <label style={labelStyle}>
            N° de Serie
            <input style={inputStyle} value={serie} onChange={e => setSerie(e.target.value)}
              placeholder="SN-12345" />
          </label>
        </div>

        <label style={labelStyle}>
          Unidad de medida base *
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {UNIDADES_SUGERIDAS.map(u => (
              <button key={u} onClick={() => setUnidad(u)} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12,
                border: `1px solid ${unidad === u ? 'var(--accent)' : 'var(--outline-var)'}`,
                background: unidad === u ? 'var(--accent)' : 'var(--surface-2)',
                color: unidad === u ? '#fff' : 'var(--text)',
                cursor: 'pointer', fontFamily: 'var(--sans)'
              }}>{u}</button>
            ))}
            <input style={{ ...inputStyle, width: 60 }} value={unidad} onChange={e => setUnidad(e.target.value)}
              placeholder="otra" />
          </div>
        </label>

        <label style={labelStyle}>
          Técnicos
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={tecInput}
              onChange={e => setTecInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTecnico()}
              placeholder="Nombre del técnico (Enter para agregar)" />
            <button className="btn btn-ghost btn-sm" onClick={addTecnico}>+</button>
          </div>
          {tecnicos.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {tecnicos.map(t => (
                <span key={t} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 20, fontSize: 12,
                  background: 'var(--surface-2)', border: '1px solid var(--outline-var)',
                  color: 'var(--text)'
                }}>
                  {t}
                  <span onClick={() => removeTecnico(t)} style={{ cursor: 'pointer', opacity: 0.6 }}>✕</span>
                </span>
              ))}
            </div>
          )}
        </label>

        <label style={labelStyle}>
          Notas
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Condiciones del ensayo, observaciones generales..." />
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-acc btn-full" onClick={handleSubmit}
            disabled={!nombre.trim() || !instr.trim()}>
            {initial?.id ? 'Guardar cambios' : 'Crear campaña'}
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
