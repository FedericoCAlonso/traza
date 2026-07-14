import { useState } from 'react'
import type { Campania, MedicionCampania, LecturaMedicion, ElementoMedicionRef } from '../../../types/measurements'

interface Props {
  elementoRef: ElementoMedicionRef
  /** Nombre legible del elemento para mostrarlo en el modal */
  elementoLabel: string
  campania: Campania
  existing?: MedicionCampania
  onConfirm: (m: Omit<MedicionCampania, 'id' | 'fechaHora'>) => void
  onCancel: () => void
}

export function MedicionFormModal({ elementoRef, elementoLabel, campania, existing, onConfirm, onCancel }: Props) {
  const now = existing?.fechaHora ? new Date(existing.fechaHora) : new Date()
  const toLocalIso = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [fechaStr, setFechaStr] = useState(toLocalIso(now))
  const [aprobado, setAprobado] = useState<boolean | undefined>(existing?.aprobado)
  const [notas, setNotas]       = useState(existing?.notas || '')
  const [lecturas, setLecturas] = useState<LecturaMedicion[]>(
    existing?.lecturas || [{ etiqueta: '', valor: 0, unidad: campania.unidad, aprobado: undefined }]
  )

  const updateLectura = (idx: number, patch: Partial<LecturaMedicion>) => {
    setLecturas(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  const addLectura = () => {
    setLecturas(prev => [...prev, { etiqueta: '', valor: 0, unidad: campania.unidad, aprobado: undefined }])
  }

  const removeLectura = (idx: number) => {
    if (lecturas.length > 1) setLecturas(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = () => {
    const validLecturas = lecturas.filter(l => l.etiqueta.trim() !== '' || lecturas.length === 1)
    onConfirm({
      campaniaId:  campania.id,
      elementoRef,
      lecturas:    validLecturas,
      aprobado,
      notas:       notas.trim() || undefined,
    })
  }

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8,
    border: '1px solid var(--outline-var)',
    background: 'var(--surface-2)', color: 'var(--text)',
    fontSize: 13, fontFamily: 'var(--sans)', outline: 'none',
  }

  const aprobadoBtnStyle = (target: boolean | undefined): React.CSSProperties => ({
    flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 12,
    border: `1px solid ${aprobado === target ? (target === true ? '#4caf50' : target === false ? '#f44336' : 'var(--outline-var)') : 'var(--outline-var)'}`,
    background: aprobado === target ? (target === true ? '#4caf5022' : target === false ? '#f4433622' : 'var(--surface-2)') : 'var(--surface-2)',
    color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--sans)',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10001, padding: 16
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--surface-1)', padding: 20,
        borderRadius: 16, boxShadow: 'var(--shadow-3)',
        display: 'flex', flexDirection: 'column', gap: 14,
        maxHeight: '90dvh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-h)' }}>⚡ Registrar Medición</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>{elementoLabel}</p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-dim)' }}>✕</button>
        </div>

        {/* Info de campaña */}
        <div style={{
          background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px',
          fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 2
        }}>
          <span>📋 <strong style={{ color: 'var(--text)' }}>{campania.nombre}</strong></span>
          <span>🔬 {campania.instrumento} {campania.instrumentoSerie ? `· S/N: ${campania.instrumentoSerie}` : ''}</span>
          {campania.tipoMedicion && <span>📐 {campania.tipoMedicion}</span>}
        </div>

        {/* Lecturas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>LECTURAS</div>
          {lecturas.map((l, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6,
              background: 'var(--surface-2)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input style={{ ...inputStyle, flex: 2 }}
                  value={l.etiqueta} onChange={e => updateLectura(idx, { etiqueta: e.target.value })}
                  placeholder={`Etiqueta (ej: ΔIn, ½ΔIn, THD R)`} />
                <input style={{ ...inputStyle, flex: 1, textAlign: 'right' }}
                  type="number" value={l.valor}
                  onChange={e => updateLectura(idx, { valor: parseFloat(e.target.value) || 0 })} />
                <input style={{ ...inputStyle, width: 54 }}
                  value={l.unidad ?? campania.unidad}
                  onChange={e => updateLectura(idx, { unidad: e.target.value })} />
                {lecturas.length > 1 && (
                  <button onClick={() => removeLectura(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>🗑</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={aprobadoBtnStyle(true)} onClick={() => updateLectura(idx, { aprobado: l.aprobado === true ? undefined : true })}>✓ OK</button>
                <button style={aprobadoBtnStyle(false)} onClick={() => updateLectura(idx, { aprobado: l.aprobado === false ? undefined : false })}>✗ NOK</button>
                <button style={aprobadoBtnStyle(undefined)} onClick={() => updateLectura(idx, { aprobado: undefined })}>— Sin evaluar</button>
              </div>
            </div>
          ))}
          <button onClick={addLectura} className="btn btn-ghost btn-sm"
            style={{ alignSelf: 'flex-start', fontSize: 12 }}>
            + Agregar lectura
          </button>
        </div>

        {/* Resultado global */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 6 }}>RESULTADO GLOBAL</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={aprobadoBtnStyle(true)} onClick={() => setAprobado(aprobado === true ? undefined : true)}>✓ Aprobado</button>
            <button style={aprobadoBtnStyle(false)} onClick={() => setAprobado(aprobado === false ? undefined : false)}>✗ No aprobado</button>
            <button style={aprobadoBtnStyle(undefined)} onClick={() => setAprobado(undefined)}>— Sin evaluar</button>
          </div>
        </div>

        {/* Fecha */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}>
          Fecha y hora
          <input style={inputStyle} type="datetime-local" value={fechaStr}
            onChange={e => setFechaStr(e.target.value)} />
        </label>

        {/* Notas */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}>
          Notas
          <textarea style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }}
            value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Observaciones específicas de esta medición..." />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-acc btn-full" onClick={handleSubmit}>
            {existing ? 'Actualizar' : 'Guardar medición'}
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
