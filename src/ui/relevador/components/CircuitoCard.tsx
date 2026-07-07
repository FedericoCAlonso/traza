// ═══════════════════════════════════════════════════════════════════════════
// MODULE: components/CircuitoCard.tsx
// Tarjeta de edición de un circuito eléctrico del proyecto.
// ═══════════════════════════════════════════════════════════════════════════

import { Card } from '../../../ui/Card';
import { F } from '../../../ui/Field';
import type { Circuito, TipoCircuito } from '../../../types/index';

interface CircuitoCardProps {
  circuito: Circuito;
  index: number;
  tableroNombre?: string;
  onChange: (c: Circuito) => void;
  onRemove: () => void;
}

const TIPO_CIRCUITO_OPTIONS: { value: TipoCircuito; label: string }[] = [
  { value: 'IUG',  label: 'IUG' },
  { value: 'IUE',  label: 'IUE' },
  { value: 'TUG',  label: 'TUG' },
  { value: 'TUE',  label: 'TUE' },
  { value: 'ACU',  label: 'ACU' },
  { value: 'MBT',  label: 'MBT' },
  { value: 'MBTF', label: 'MBTF' },
  { value: 'TEC',  label: 'TEC' },
  { value: 'OTRO', label: 'OTRO' },
];

/** Color visual para cada tipo según convención IRAM / AEA */
const COLOR_DEFAULT: Partial<Record<TipoCircuito, string>> = {
  IUG:  '#F5A623',
  IUE:  '#E67E22',
  TUG:  '#4A90D9',
  TUE:  '#2980B9',
  ACU:  '#8E44AD',
  MBT:  '#27AE60',
  MBTF: '#16A085',
  TEC:  '#C0392B',
  OTRO: '#7F8C8D',
};

export function CircuitoCard({ circuito: c, index, tableroNombre, onChange, onRemove }: CircuitoCardProps) {
  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: c.color || COLOR_DEFAULT[c.tipo] || '#999',
    marginRight: 6,
    verticalAlign: 'middle',
  };

  const fullName = tableroNombre ? `${tableroNombre}.${c.nombre}` : c.nombre;

  return (
    <Card
      idx={`C${index + 1}`}
      idxColor="var(--accent)"
      title={fullName}
      badge={c.tipo}
      onRemove={onRemove}
      defaultOpen={false}
    >
      <div className="field-row">
        <F label="Nombre Local">
          <input
            type="text"
            value={c.nombre}
            onChange={e => onChange({ ...c, nombre: e.target.value })}
            placeholder="C1"
            title="Solo el identificador local (ej: C1)"
          />
        </F>
        <F label="Tipo AEA">
          <select
            value={c.tipo}
            onChange={e => {
              const tipo = e.target.value as TipoCircuito;
              onChange({ ...c, tipo, color: c.color || COLOR_DEFAULT[tipo] || '#999' });
            }}
          >
            {TIPO_CIRCUITO_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </F>
      </div>

      <div className="field-row" style={{ alignItems: 'center' }}>
        <F label="Color en plano">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={badgeStyle} />
            <input
              type="color"
              value={c.color || COLOR_DEFAULT[c.tipo] || '#4A90D9'}
              onChange={e => onChange({ ...c, color: e.target.value })}
              style={{ width: 36, height: 28, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}
            />
          </div>
        </F>
        <F label="Descripción">
          <input
            type="text"
            value={c.descripcion || ''}
            onChange={e => onChange({ ...c, descripcion: e.target.value })}
            placeholder="Ej: Iluminación dormitorio principal"
          />
        </F>
      </div>
    </Card>
  );
}

