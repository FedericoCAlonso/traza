// ═══════════════════════════════════════════════════════════════════════════
// MODULE: components/ElectricalCard.tsx
// ═══════════════════════════════════════════════════════════════════════════

import type { ElementoElectrico, Circuito } from '../../../types/index';
import type { DefinicionSimbolo } from '../../../lib/symbols';

import { useRef, useEffect } from 'react';
import { NumInput } from '../../../ui/NumInput';
import { Card } from '../../../ui/Card';
import { F } from '../../../ui/Field';

interface ElectricalCardProps {
  el: ElementoElectrico;
  index: number;
  wallCount: number;
  symbolsLib: DefinicionSimbolo[];
  circuitos: Circuito[];
  tableros?: import('../../../types/index').Tablero[];
  onChange: (el: ElementoElectrico) => void;
  onRemove: () => void;
  onEdit: () => void;
  //columnas?: import('../types').ElementoEstructural[];
  activeAmbienteId?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  pendingConnection?: { ambienteId: string, elementoId: string } | null;
  onStartConnecting?: (elId: string) => void;
  onFinishConnecting?: (ambId: string, elId: string) => void;
  onCancelConnecting?: () => void;
  globalMeasurements?: import('../../../types/index').Measurement[];
  onNewMeasurementModal?: (elementoId: string, moduleType: import('../../../types/index').ModuleType) => void;
  onStartCircuitForBoca?: (bocaId: string) => void;
}

export function ElectricalCard({
  el,
  index,
  wallCount,
  symbolsLib,
  circuitos,
  tableros = [],
  onChange,
  onRemove,
  onEdit,
  //columnas,
  activeAmbienteId,
  isSelected,
  onSelect,
  pendingConnection,
  onStartConnecting,
  onFinishConnecting,
  onCancelConnecting,
  globalMeasurements = [],
  onNewMeasurementModal,
  onStartCircuitForBoca
}: ElectricalCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  const symDef = symbolsLib.find(s => s.id === el.tipo);
  const label = symDef ? symDef.label : el.tipo;

  const circuito = circuitos.find(c => c.id === el.circuitoId);

  const isTablero = symDef?.categoria === 'tableros' || el.esTablero;
  const isLlave = el.tipo.includes('llave');
  const isBoca = el.tipo.includes('boca');

  const getDato = (clave: string) => el.datos.find(x => x.clave === clave)?.valor || '';
  const setDato = (clave: string, valor: string) => {
    const d = el.datos.find(x => x.clave === clave);
    let newDatos;
    if (d) {
      if (valor === '') newDatos = el.datos.filter(x => x.clave !== clave);
      else newDatos = el.datos.map(x => x.clave === clave ? { ...x, valor } : x);
    } else {
      if (valor === '') return;
      newDatos = [...el.datos, { clave, valor }];
    }
    onChange({ ...el, datos: newDatos });
  };

  // Dot de color del circuito asignado
  const circuitoDot = circuito ? (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: circuito.color || '#999', marginRight: 4, verticalAlign: 'middle'
    }} />
  ) : null;

  const symbolMeasurements = globalMeasurements.filter(m => m.elementoId === el.id);

  return (
    <div ref={cardRef}>
    <Card
      className={isSelected ? 'card-selected card-selected-flash' : ''}
      idx={`E${index}`}
      idxColor="var(--red)"
      title={label}
      badge={el.referencia || '—'}
      onRemove={onRemove}
      onEdit={onEdit}
      onSelect={onSelect}
      customHeader={
        pendingConnection ? (
          pendingConnection.elementoId === el.id && pendingConnection.ambienteId === activeAmbienteId ? (
            <button className="btn btn-warning btn-sm" onClick={onCancelConnecting}>
              🚫 Cancelar Conexión
            </button>
          ) : (
            <button className="btn btn-acc btn-sm" onClick={() => onFinishConnecting?.(activeAmbienteId!, el.id)}>
              🔗 Finalizar Aquí
            </button>
          )
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => onStartConnecting?.(el.id)}>
            🔗 Conectar
          </button>
        )
      }
    >
      <div className="field-row">
        <F label="Ref. Plano">
          <input
            type="text"
            value={el.referencia}
            onChange={(e) => onChange({ ...el, referencia: e.target.value })}
            placeholder="L1"
          />
        </F>
        <F label="Altura montaje (m)">
          <NumInput
            value={el.altura ?? 0}
            onChange={(v: number) => onChange({ ...el, altura: v })}
          />
        </F>
      </div>

      <div className="field-row">
        {isTablero ? (
          <F label="Tablero Representado">
            <select
              value={getDato('tableroId')}
              onChange={e => setDato('tableroId', e.target.value)}
            >
              <option value="">— Ninguno (sólo dibujo) —</option>
              {tableros.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.tipo})
                </option>
              ))}
            </select>
            {tableros.length === 0 && <span style={{fontSize: 10, color: 'var(--orange)'}}>No hay tableros lógicos.</span>}
          </F>
        ) : (
          <F label="Circuito">
            <div style={{ display: 'flex', gap: 4 }}>
              <select
                style={{ flex: 1 }}
                value={el.circuitoId || ''}
                onChange={e => onChange({ ...el, circuitoId: e.target.value || undefined })}
              >
                <option value="">— Sin circuito —</option>
                {circuitos.map(c => {
                  const fullName = tableros ? (() => {
                    const t = tableros.find(x => x.id === c.tableroId);
                    return t ? `${t.nombre}.${c.nombre}` : c.nombre;
                  })() : c.nombre;
                  return (
                    <option key={c.id} value={c.id}>
                      {fullName} ({c.tipo})
                    </option>
                  );
                })}
              </select>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => onStartCircuitForBoca?.(el.id)} 
                title="Crear nuevo circuito"
              >
                ＋ Nuevo
              </button>
            </div>
          </F>
        )}
        <F label="Mostrar dato en SVG">
          <select
            value={el.mostrarDato ? 'si' : 'no'}
            onChange={(e) => onChange({ ...el, mostrarDato: e.target.value === 'si' })}
          >
            <option value="no">No</option>
            <option value="si">Sí (1er dato)</option>
          </select>
        </F>
      </div>

      {(isLlave || isBoca) && (
        <div className="field-row">
          {isLlave && (
            <F label="Efectos que comanda">
              <input 
                type="text" 
                value={getDato('efectos')} 
                onChange={e => setDato('efectos', e.target.value)}
                placeholder="Ej: A, B"
              />
            </F>
          )}
          {isBoca && (
            <F label="Efecto de encendido">
              <input 
                type="text" 
                value={getDato('efecto')} 
                onChange={e => setDato('efecto', e.target.value)}
                placeholder="Ej: A"
              />
            </F>
          )}
        </div>
      )}

      {/* Datos técnicos libres */}
      {el.datos.length > 0 && (
        <div style={{ marginTop: 4, marginBottom: 4 }}>
          {el.datos.map((d, di) => (
            <div key={di} className="field-row" style={{ alignItems: 'flex-end', marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <F label="Clave">
                  <input
                    type="text"
                    value={d.clave}
                    onChange={e => {
                      const datos = el.datos.map((x, j) => j === di ? { ...x, clave: e.target.value } : x);
                      onChange({ ...el, datos });
                    }}
                    placeholder="ej: tensión"
                  />
                </F>
              </div>
              <div style={{ flex: 1 }}>
                <F label="Valor">
                  <input
                    type="text"
                    value={d.valor}
                    onChange={e => {
                      const datos = el.datos.map((x, j) => j === di ? { ...x, valor: e.target.value } : x);
                      onChange({ ...el, datos });
                    }}
                    placeholder="ej: 220V"
                  />
                </F>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onChange({ ...el, datos: el.datos.filter((_, j) => j !== di) })}
              >✕</button>
            </div>
          ))}
        </div>
      )}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => onChange({ ...el, datos: [...el.datos, { clave: '', valor: '' }] })}
      >
        + Dato técnico
      </button>

      {/* Historial de Mediciones */}
      {(symDef?.medicionAsociada || symbolMeasurements.length > 0) && (
        <div style={{ marginTop: 12, padding: 8, background: 'var(--bg-subtle)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 13, color: 'var(--text-bright)' }}>Historial de Mediciones</strong>
            {symDef?.medicionAsociada && (
              <button 
                className="btn btn-acc btn-sm"
                onClick={() => onNewMeasurementModal?.(el.id, symDef.medicionAsociada!)}
              >
                + Nueva
              </button>
            )}
          </div>
          {symbolMeasurements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {symbolMeasurements.sort((a,b) => (b.fecha || b.timestamp) - (a.fecha || a.timestamp)).map(m => {
                const date = new Date(m.fecha || m.timestamp);
                return (
                  <div key={m.id} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '4px 8px', borderRadius: 4 }}>
                    <span style={{ color: 'var(--text-dim)' }}>{date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span style={{ 
                      color: m.resultado === 'aprobado' ? 'var(--green)' : m.resultado === 'observado' ? 'var(--yellow)' : 'var(--red)',
                      fontWeight: 'bold',
                      textTransform: 'capitalize'
                    }}>
                      {m.resultado}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
              No hay mediciones registradas.
            </div>
          )}
        </div>
      )}

      {el.paredIdx != null ? (
        <div className="field-row">
          <F label="Pared #">
            <NumInput
              value={el.paredIdx ?? 0}
                            onChange={(v: number) => onChange({
                ...el,
                paredIdx: Math.max(0, Math.min(wallCount - 1, Math.round(v)))
              })}
            />
          </F>
          <F label="Pos. en pared (m)">
            <NumInput
              value={el.paredPos ?? 0}
              onChange={(v: number) => onChange({ ...el, paredPos: v })}
            />
          </F>
        </div>
      ) : (
        <div className="field-row">
          <F label="X (m)">
            <NumInput
              value={el.x || 0}
              onChange={(v: number) => onChange({ ...el, x: v })}
            />
          </F>
          <F label="Y (m)">
            <NumInput
              value={el.y || 0}
              onChange={(v: number) => onChange({ ...el, y: v })}
            />
          </F>
          {/*columnas && columnas.length > 0 && (
            <F label="Anclado a Columna">
              <select
                value={el.columnaId || ''}
                onChange={e => onChange({ ...el, columnaId: e.target.value || undefined })}
              >
                <option value="">— Ninguna —</option>
                {columnas.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.descripcion || c.tipo}
                  </option>
                ))}
              </select>
            </F>
          )*/}
        </div>
      )}

      {circuito && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, display: 'flex', alignItems: 'center' }}>
          {circuitoDot}
          {circuito.nombre} — {circuito.tipo}{circuito.seccionBase ? ` — ${circuito.seccionBase}mm²` : ''}
        </div>
      )}
    </Card>
    </div>
  );
}