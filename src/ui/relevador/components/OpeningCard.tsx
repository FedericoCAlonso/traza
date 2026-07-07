// ═══════════════════════════════════════════════════════════════════════════
// MODULE: components/OpeningCard.tsx
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import { NumInput } from '../../../ui/NumInput';
import { Card } from '../../../ui/Card';
import { F } from '../../../ui/Field';
import { type Abertura, type Ambiente, type SubtipoPuerta, type SubtipoVentana, type Pared } from '../../../types/index';
import type { Segmento } from '../../../lib/geometry';

interface OpeningCardProps {
  ab: Abertura;
  index: number;
  wallCount: number;
  /** Segmentos calculados del ambiente (para referencia relativa) */
  segs: Segmento[];
  /** Paredes del ambiente (para construir lista de puntos de referencia) */
  paredes: Pared[];
  /** Lista de ambientes del proyecto para vincular abertura al ambiente vecino */
  ambientes: Ambiente[];
  activeAmbienteId: string;
  isSelected?: boolean;
  onSelect?: () => void;
  onLinkOpening?: (targetAmbId: string, targetOpeningId: string, currentOpeningId: string) => void;
  onChange: (ab: Abertura) => void;
  onRemove: () => void;
}

const SUBTIPO_PUERTA: { value: SubtipoPuerta; label: string }[] = [
  { value: 'batiente',  label: 'Batiente (abatible)' },
  { value: 'corrediza', label: 'Corrediza' },
  { value: 'vaiven',    label: 'Vaivén' },
  { value: 'pivotante', label: 'Pivotante' },
];

const SUBTIPO_VENTANA: { value: SubtipoVentana; label: string }[] = [
  { value: 'abatible',  label: 'Abatible / De abrir' },
  { value: 'corrediza', label: 'Corrediza' },
  { value: 'guillotina',label: 'Guillotina' },
  { value: 'pivotante', label: 'Pivotante' },
  { value: 'fija',      label: 'Fija (paño fijo)' },
];

/** Título descriptivo según tipo y subtipo */
function buildTitle(ab: Abertura): string {
  const tipo = ab.tipo ? ab.tipo.charAt(0).toUpperCase() + ab.tipo.slice(1) : 'Abertura';
  const subtipo = ab.subtipo ? ` · ${ab.subtipo}` : '';
  return `${tipo}${subtipo} · Pared ${ab.pared}`;
}

export function OpeningCard({ 
  ab, index, wallCount, segs, paredes, ambientes, activeAmbienteId, isSelected, onSelect, onLinkOpening, onChange, onRemove 
}: OpeningCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  // Ambientes disponibles para vincular (todos excepto el actual)
  const otrosAmbientes = ambientes.filter(a => a.id !== activeAmbienteId);

  // ── Referencia relativa ──
  // 'abs' = posición absoluta desde inicio del segmento (comportamiento clásico)
  // Cualquier otro valor = key de un punto de referencia calculado
  const [refKey, setRefKey] = useState('abs');

  /** Lista de puntos de referencia disponibles para la pared actual */
  const puntosRef = useMemo(() => {
    const pts: { key: string; label: string; offsetM: number }[] = [
      { key: 'abs', label: 'Inicio de pared (por defecto)', offsetM: 0 },
    ];
    const seg = segs[ab.pared];
    if (!seg) return pts;

    // Buscamos ramas que tienen como refParedIdx == ab.pared
    paredes.forEach((p, i) => {
      if (p.refParedIdx === ab.pared && p.refDistancia !== undefined) {
        pts.push({
          key: `rama_${i}`,
          label: `Punto de ramificación (Pared ${i + 1})`,
          offsetM: p.refDistancia,
        });
      }
    });

    // Fin de la pared: leemos la posición relativa del fin desde los segmentos previos en la misma cadena
    // La posición del fin en metros la tomamos del campo largo de la pared si está disponible
    const paredDef = paredes[ab.pared];
    if (paredDef && typeof paredDef.largo === 'number' && paredDef.largo > 0) {
      pts.push({ key: 'fin', label: 'Fin de esta pared', offsetM: paredDef.largo });
    }

    return pts;
  }, [ab.pared, segs, paredes]);


  const selectedRef = puntosRef.find(p => p.key === refKey) ?? puntosRef[0];

  /** Posición relativa al punto de referencia elegido */
  const posRelativa = ab.posicion - selectedRef.offsetM;

  const handlePosRelativaChange = (v: number) => {
    onChange({ ...ab, posicion: parseFloat((selectedRef.offsetM + v).toFixed(3)) });
  };

  return (
    <div ref={ref}>
    <Card
      className={isSelected ? 'card-selected card-selected-flash' : ''}
      idx={`A${index}`} idxColor="var(--blue)"
      title={buildTitle(ab)}
      badge={`${ab.ancho || '?'}m`}
      onRemove={onRemove}
      onSelect={onSelect}
    >
      <div style={{ marginBottom: '12px', borderBottom: '1px solid var(--border-dim)', paddingBottom: '8px' }}>
         <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
           ID: {ab.id} {ab.esPrincipal === false && '(Esclava)'}
         </span>
      </div>
      {/* Fila: tipo + subtipo */}
      <div className="field-row">
        <F label="Tipo">
          <select
            value={ab.tipo || 'puerta'}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onChange({ ...ab, tipo: e.target.value as Abertura['tipo'], subtipo: undefined })
            }
          >
            <option value="puerta">Puerta</option>
            <option value="ventana">Ventana</option>
            <option value="vano">Vano</option>
          </select>
        </F>
        {ab.tipo === 'puerta' && (
          <F label="Subtipo">
            <select
              value={ab.subtipo || 'batiente'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onChange({ ...ab, subtipo: e.target.value as SubtipoPuerta })
              }
            >
              {SUBTIPO_PUERTA.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </F>
        )}
        {ab.tipo === 'ventana' && (
          <F label="Subtipo">
            <select
              value={ab.subtipo || 'abatible'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onChange({ ...ab, subtipo: e.target.value as SubtipoVentana })
              }
            >
              {SUBTIPO_VENTANA.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </F>
        )}
        <F label="Pared #">
          <NumInput
            value={ab.pared || 0}
            onChange={(v: number) => onChange({ ...ab, pared: Math.max(0, Math.min(wallCount - 1, Math.round(v))) })}
          />
        </F>
      </div>

      {/* Fila: posición (con referencia relativa) + ancho */}
      <div className="field-row">
        <F label="Desde">
          <select
            className="input-base"
            style={{ fontSize: '11px' }}
            value={refKey}
            onChange={e => setRefKey(e.target.value)}
          >
            {puntosRef.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </F>
        <F label="Dist. jamba (m)">
          <NumInput
            value={parseFloat(posRelativa.toFixed(3))}
            onChange={handlePosRelativaChange}
          />
        </F>
        <F label="Ancho (m)">
          <NumInput value={ab.ancho || 0.9} onChange={(v: number) => onChange({ ...ab, ancho: v })} />
        </F>
      </div>

      {/* Propiedades de puerta batiente / pivotante / vaivén */}
      {ab.tipo === 'puerta' && (!ab.subtipo || ab.subtipo === 'batiente' || ab.subtipo === 'pivotante' || ab.subtipo === 'vaiven') && (
        <div className="field-row">
          <F label="Hojas">
            <select
              value={ab.hojas || 1}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...ab, hojas: parseInt(e.target.value) })}
            >
              <option value={1}>Simple</option>
              <option value={2}>Doble</option>
            </select>
          </F>
          <F label="Abre hacia">
            <select
              value={ab.lado || 'interior'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...ab, lado: e.target.value })}
            >
              <option value="interior">Interior</option>
              <option value="exterior">Exterior</option>
            </select>
          </F>
          <F label="Sentido">
            <select
              value={ab.sentido || 'derecha'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...ab, sentido: e.target.value })}
            >
              <option value="derecha">Derecha</option>
              <option value="izquierda">Izquierda</option>
            </select>
          </F>
        </div>
      )}

      {/* Hoja vecina (para puertas entre hojas) */}
      {otrosAmbientes.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-dim)', marginTop: '12px', paddingTop: '12px' }}>
          {ab.ambienteVecinoId ? (
            <div className="status-tag ok" style={{ fontSize: '11px', display: 'inline-block' }}>
              🔗 Vinculada a: {ambientes.find(a => a.id === ab.ambienteVecinoId)?.nombre || '?'}
              <button 
                className="btn btn-danger btn-sm" 
                style={{ marginLeft: '8px', padding: '0 4px' }}
                onClick={() => onChange({ ...ab, ambienteVecinoId: undefined, aberturaVecinaId: undefined, esPrincipal: undefined })}
              >✕</button>
            </div>
          ) : (
            <F label="Vincular a abertura existente en otra hoja">
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const [ambId, opId] = val.split('|');
                  onLinkOpening?.(ambId, opId, ab.id);
                }}
              >
                <option value="">— Seleccionar abertura para vincular —</option>
                {otrosAmbientes.map(amb => {
                  const available = (amb.aberturas || []).filter(o => !o.ambienteVecinoId);
                  if (available.length === 0) return null;
                  return (
                    <optgroup key={amb.id} label={amb.nombre}>
                      {available.map(o => (
                        <option key={o.id} value={`${amb.id}|${o.id}`}>
                          {o.tipo} ({o.ancho}m) en Pared {o.pared}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </F>
          )}
        </div>
      )}
    </Card>
    </div>
  );
}