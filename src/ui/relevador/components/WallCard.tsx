// ═══════════════════════════════════════════════════════════════════════════
// MODULE: components/WallCard.tsx
// Tarjeta de edición de una pared (Pared) dentro de un tramo.
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useEffect } from 'react';
import { NumInput } from '../../../ui/NumInput';
import { Card } from '../../../ui/Card';
import { F } from '../../../ui/Field';
import { LaserButton } from '../../../components/LaserButton';
import { type Pared, type Irregularidad } from '../../../types/index';

interface WallCardProps {
  pared: Pared;
  index: number;
  isLast: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onChange: (pared: Pared) => void;
  onRemove: () => void;
}

function buildTitle(pared: Pared, index: number): string {
  const largo = pared.largo === 'auto' ? 'auto' : `${pared.largo}m`;
  return `Pared ${index + 1} · ${largo} · ${pared.angulo}°`;
}

export function WallCard({ pared, index, isLast, isSelected, onSelect, onChange, onRemove }: WallCardProps) {
  const isBranched = pared.refParedIdx !== undefined;
  
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  const handleBranchToggle = (checked: boolean) => {
    if (checked) {
      const next: Pared = {
        ...pared,
        refParedIdx: Math.max(0, index - 1),
        refDistancia: 0,
      };
      if (next.largo === 'auto') next.largo = 1;
      onChange(next);
    } else {
      const { refParedIdx, refDistancia, ...rest } = pared;
      onChange(rest);
    }
  };

  return (
    <div ref={ref}>
      <Card
        className={isSelected ? 'card-selected card-selected-flash' : ''}
        idx={`P${index + 1}`}
        idxColor="var(--green)"
        title={buildTitle(pared, index)}
        badge={pared.largo === 'auto' ? 'auto' : `${pared.largo}m`}
        onRemove={onRemove}
        onSelect={onSelect}
      >
      {/* Fila: largo + ángulo */}
      <div className="field-row">
        <F label="Largo (m)">
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {isLast && pared.largo === 'auto' ? (
              <input
                className="input-base"
                value="auto"
                disabled
                style={{ color: 'var(--text-dim)', cursor: 'not-allowed', flex: 1 }}
              />
            ) : (
              <NumInput
                value={pared.largo === 'auto' ? 0 : (pared.largo as number)}
                onChange={(v: number) => onChange({ ...pared, largo: v })}
              />
            )}
            <LaserButton compact onValue={(v) => onChange({ ...pared, largo: Math.round(v * 100) / 100 })} />
          </div>
        </F>
        <F label="Ángulo (°)">
          <NumInput
            value={pared.angulo}
            onChange={(v: number) => onChange({ ...pared, angulo: v })}
          />
        </F>
        <F label="Grosor (m)">
          <NumInput
            value={pared.grosor ?? 0}
            onChange={(v: number) => onChange({ ...pared, grosor: v || null })}
            placeholder="default"
          />
        </F>
      </div>

      {/* Opción de ramificación */}
      {index > 0 && (
        <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '4px', border: '1px solid var(--border-dim)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', marginBottom: isBranched ? '8px' : 0 }}>
            <input
              type="checkbox"
              checked={isBranched}
              onChange={e => handleBranchToggle(e.target.checked)}
            />
            📍 Ramificar desde otra pared (Romper cadena)
          </label>
          {isBranched && (
            <div className="field-row">
              <F label="Pared Referencia">
                <select
                  className="input-base"
                  value={pared.refParedIdx}
                  onChange={e => onChange({ ...pared, refParedIdx: Number(e.target.value) })}
                >
                  {Array.from({ length: index }).map((_, i) => (
                    <option key={i} value={i}>Pared {i + 1}</option>
                  ))}
                </select>
              </F>
              <F label="Distancia desde inicio (m)">
                <NumInput
                  value={pared.refDistancia || 0}
                  onChange={(v: number) => onChange({ ...pared, refDistancia: v })}
                />
              </F>
            </div>
          )}
        </div>
      )}

      {/* Esquina saliente */}
      <div className="field-row" style={{ alignItems: 'center' }}>
        <F label="Esquina saliente">
          <input
            type="checkbox"
            checked={!!pared.esquina_saliente}
            onChange={e => onChange({
              ...pared,
              esquina_saliente: e.target.checked ? { ancho: 0.1 } : null,
            })}
          />
        </F>
        {pared.esquina_saliente && (
          <F label="Ancho esquina (m)">
            <NumInput
              value={pared.esquina_saliente.ancho}
              onChange={(v: number) => onChange({
                ...pared,
                esquina_saliente: { ancho: v },
              })}
            />
          </F>
        )}
      </div>

      {/* Irregularidades */}
      {pared.irregularidades.length > 0 && (
        <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-dim)', paddingTop: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>Irregularidades</div>
          {pared.irregularidades.map((irr: Irregularidad, i: number) => (
            <div key={i} className="field-row" style={{ alignItems: 'flex-end', marginBottom: '6px' }}>
              <F label="Pos (m)">
                <NumInput
                  value={irr.posicion}
                  onChange={(v: number) => {
                    const next = [...pared.irregularidades];
                    next[i] = { ...irr, posicion: v };
                    onChange({ ...pared, irregularidades: next });
                  }}
                />
              </F>
              <F label="Ancho (m)">
                <NumInput
                  value={irr.ancho}
                  onChange={(v: number) => {
                    const next = [...pared.irregularidades];
                    next[i] = { ...irr, ancho: v };
                    onChange({ ...pared, irregularidades: next });
                  }}
                />
              </F>
              <F label="Prof (m)">
                <NumInput
                  value={Math.abs(irr.profundidad)}
                  onChange={(v: number) => {
                    const next = [...pared.irregularidades];
                    next[i] = { ...irr, profundidad: Math.abs(v) };
                    onChange({ ...pared, irregularidades: next });
                  }}
                />
              </F>
              <F label="Lado">
                <select
                  className="input-base"
                  style={{ fontSize: '11px' }}
                  value={irr.lado ?? (irr.profundidad >= 0 ? 'interior' : 'exterior')}
                  onChange={(e) => {
                    const next = [...pared.irregularidades];
                    next[i] = { ...irr, lado: e.target.value as 'interior' | 'exterior' };
                    onChange({ ...pared, irregularidades: next });
                  }}
                >
                  <option value="interior">Interior</option>
                  <option value="exterior">Exterior</option>
                </select>
              </F>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onChange({
                  ...pared,
                  irregularidades: pared.irregularidades.filter((_: any, j: number) => j !== i),
                })}
              >✕</button>
            </div>
          ))}
        </div>
      )}
      <button
        className="btn btn-ghost btn-sm btn-full"
        style={{ marginTop: '8px' }}
        onClick={() => onChange({
          ...pared,
          irregularidades: [...pared.irregularidades, { posicion: 0, ancho: 0.5, profundidad: 0.1, lado: 'interior' }],
        })}
      >
        + Irregularidad
      </button>
    </Card>
    </div>
  );
}