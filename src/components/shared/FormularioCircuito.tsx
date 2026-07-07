import { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal';
import type { Circuito, Tablero, TipoCircuito } from '../../types/index'

interface FormularioCircuitoProps {
  tableros: Tablero[]
  circuitoEdit?: Partial<Circuito> | null
  onSave: (data: Omit<Circuito, 'id'>) => void
  onCancel: () => void
}

const TIPOS_CIRCUITO: TipoCircuito[] = ['IUG', 'IUE', 'TUG', 'TUE', 'ACU', 'MBT', 'MBTF', 'TEC', 'OTRO']

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  marginBottom: 10,
  borderRadius: 'var(--r)',
  border: '1px solid var(--border)',
  background: 'var(--bg2)',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  fontSize: 14,
  outline: 'none'
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--sans)',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 4
}

export function FormularioCircuito({ tableros, circuitoEdit, onSave, onCancel }: FormularioCircuitoProps) {
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'TUG' as TipoCircuito,
    tableroId: tableros[0]?.id || '',
    seccionBase: 2.5,
    conductoresBase: 3,
    descripcion: ''
  })

  useEffect(() => {
    if (circuitoEdit) {
      setForm({
        nombre: circuitoEdit.nombre || '',
        tipo: circuitoEdit.tipo || 'TUG',
        tableroId: circuitoEdit.tableroId || tableros[0]?.id || '',
        seccionBase: circuitoEdit.seccionBase || 2.5,
        conductoresBase: circuitoEdit.conductoresBase || 3,
        descripcion: circuitoEdit.descripcion || ''
      })
    }
  }, [circuitoEdit, tableros])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  const puedeGuardar = form.nombre.trim() && form.tableroId

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={circuitoEdit ? 'Editar Circuito' : 'Nuevo Circuito'}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-acc"
            form="circuito-form"
            disabled={!puedeGuardar}
          >
            Guardar
          </button>
        </>
      }
    >
      <form id="circuito-form" onSubmit={handleSubmit}>
        <label style={labelStyle}>Nombre Local</label>
        <input
          placeholder="Ej: C1"
          value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          required
          style={inputStyle}
          title="Solo el identificador local. El sistema agregará el tablero automáticamente (ej: TS1.C1)"
        />

        <label style={labelStyle}>Tipo</label>
        <select
          value={form.tipo}
          onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoCircuito }))}
          style={inputStyle}
        >
          {TIPOS_CIRCUITO.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <label style={labelStyle}>Tablero al que pertenece</label>
        <select
          value={form.tableroId}
          onChange={e => setForm(f => ({ ...f, tableroId: e.target.value }))}
          required
          style={inputStyle}
        >
          {tableros.length === 0 && (
            <option value="" disabled>Sin tableros — creá uno primero</option>
          )}
          {tableros.map(t => (
            <option key={t.id} value={t.id}>{t.nombre} ({t.tipo})</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Sección Base (mm²)</label>
            <input
              type="number"
              step="0.5"
              value={form.seccionBase}
              onChange={e => setForm(f => ({ ...f, seccionBase: parseFloat(e.target.value) || 0 }))}
              required
              style={inputStyle}
              title="Sección de los conductores troncales"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Conductores Base</label>
            <input
              type="number"
              value={form.conductoresBase}
              onChange={e => setForm(f => ({ ...f, conductoresBase: parseInt(e.target.value) || 0 }))}
              required
              style={inputStyle}
              title="Cantidad de conductores (ej: 3 para F+N+PE)"
            />
          </div>
        </div>

        <label style={labelStyle}>Descripción / Observaciones</label>
        <textarea
          rows={3}
          value={form.descripcion}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </form>
    </Modal>
  )
}
