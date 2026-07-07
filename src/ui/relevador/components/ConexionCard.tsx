// ═══════════════════════════════════════════════════════════════════════════
// MODULE: components/ConexionCard.tsx
// Tarjeta para editar una conexión (netlist) entre dos elementos eléctricos.
// ═══════════════════════════════════════════════════════════════════════════

import { Card } from '../../../ui/Card';
import { F } from '../../../ui/Field';
import type { Conexion, Ambiente, Circuito, Project, ElementoElectrico } from '../../../types/index';
import { calcularLongitudOrtogonal } from '../../../lib/electrical/calculations';

interface ConexionCardProps {
  conexion: Conexion;
  index: number;
  project: Project;
  circuitos: Circuito[];
  onChange: (c: Conexion) => void;
  onRemove: () => void;
}

export function ConexionCard({ conexion: c, index, project, circuitos, onChange, onRemove }: ConexionCardProps) {
  const ambientes = project.ambientes;
  const tableros = project.tableros || [];
  
  // Agrupar circuitos por tablero
  const circuitosPorTablero: Record<string, Circuito[]> = {};
  circuitos.forEach(circ => {
    const tId = circ.tableroId || 'sin_tablero';
    if (!circuitosPorTablero[tId]) circuitosPorTablero[tId] = [];
    circuitosPorTablero[tId].push(circ);
  });

  // Calcular ocupación inferida
  const inferredTexts = (c.circuitosIds || []).map(id => {
    const circ = circuitos.find(x => x.id === id);
    if (!circ) return null;
    return `🔌 ${circ.nombre} (${circ.conductoresBase || 3}x${circ.seccionBase || 2.5})`;
  }).filter(Boolean);
  
  const manualRetornos = (c.cables || []).filter(cab => cab.tipo === 'retorno');
  if (manualRetornos.length > 0) {
    inferredTexts.push(`💡 ${manualRetornos.length}x Retorno(s)`);
  }
  
  // Helpers para renderizar las opciones agrupadas por ambiente
  const elementOptions = ambientes.map((a: Ambiente) => (
    <optgroup key={a.id} label={`Hoja: ${a.nombre}`}>
      {(a.elementos || []).map((el: ElementoElectrico) => (
        <option key={el.id} value={`${a.id}|${el.id}`}>
          {el.referencia ? `${el.referencia} (${el.tipo})` : el.tipo}
        </option>
      ))}
    </optgroup>
  ));

  const getNameFromId = (ambId: string, elId: string) => {
    const amb = ambientes.find((a: Ambiente) => a.id === ambId);
    const el = amb?.elementos.find((e: ElementoElectrico) => e.id === elId);
    if (!el) return '?';
    return el.referencia ? `${el.referencia} (${amb?.nombre})` : `${el.tipo} (${amb?.nombre})`;
  };

  const longitudAuto = calcularLongitudOrtogonal(project, c.from.ambienteId, c.from.elementoId, c.to.ambienteId, c.to.elementoId);


  return (
    <Card
      idx={`X${index + 1}`}
      idxColor="var(--green)"
      title={`Conexión: ${getNameFromId(c.from.ambienteId, c.from.elementoId)} ➔ ${getNameFromId(c.to.ambienteId, c.to.elementoId)}`}
      onRemove={onRemove}
      defaultOpen={true}
    >
      <div className="field-row">
        <F label="Desde (Origen)">
          <select
            value={c.from.elementoId ? `${c.from.ambienteId}|${c.from.elementoId}` : ''}
            onChange={e => {
              const [aId, elId] = e.target.value.split('|');
              onChange({ ...c, from: { ambienteId: aId, elementoId: elId } });
            }}
          >
            <option value="">— Seleccionar —</option>
            {elementOptions}
          </select>
        </F>
        <F label="Hasta (Destino)">
          <select
            value={c.to.elementoId ? `${c.to.ambienteId}|${c.to.elementoId}` : ''}
            onChange={e => {
              const [aId, elId] = e.target.value.split('|');
              onChange({ ...c, to: { ambienteId: aId, elementoId: elId } });
            }}
          >
            <option value="">— Seleccionar —</option>
            {elementOptions}
          </select>
        </F>
      </div>

      <div className="field-row">
        <F label="Circuitos">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '4px 0' }}>
            {Object.entries(circuitosPorTablero).map(([tId, circs]) => {
              const tableroNombre = tableros.find(t => t.id === tId)?.nombre || 'Sin Tablero';
              return (
                <div key={tId} style={{ border: '1px solid var(--border)', padding: '6px', borderRadius: '4px', minWidth: '120px' }}>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-h)', marginBottom: 4 }}>{tableroNombre}</div>
                  {circs.map(circ => {
                    const checked = (c.circuitosIds || []).includes(circ.id);
                    return (
                      <label key={circ.id} style={{ display: 'flex', alignItems: 'center', fontSize: 12, cursor: 'pointer', marginBottom: 2 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            let newIds = [...(c.circuitosIds || [])];
                            if (e.target.checked) newIds.push(circ.id);
                            else newIds = newIds.filter(id => id !== circ.id);
                            onChange({ ...c, circuitosIds: newIds });
                          }}
                          style={{ marginRight: 4 }}
                        />
                        {circ.nombre}
                      </label>
                    );
                  })}
                </div>
              );
            })}
            {circuitos.length === 0 && <span style={{fontSize:11, color:'var(--text-dim)'}}>No hay circuitos</span>}
          </div>
        </F>
      </div>

      {(inferredTexts.length > 0) && (
        <div style={{ background: 'var(--bg3)', padding: '8px 12px', borderRadius: 'var(--r)', marginBottom: 12, fontSize: 12, color: 'var(--text-h)' }}>
          <strong>Resumen de cables en el tramo:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 4 }}>
            {inferredTexts.map((text, i) => (
              <span key={i} style={{ background: 'var(--bg1)', padding: '2px 6px', borderRadius: 4 }}>{text}</span>
            ))}
          </div>
        </div>
      )}

      <div className="field-row">
        <F label="Norma de Cables">
          <input
            type="text"
            value={c.normaCable || ''}
            onChange={e => onChange({ ...c, normaCable: e.target.value })}
            placeholder="Ej: IRAM 247-3, IRAM 2178"
            title="Norma aplicable a los conductores en este tramo específico"
          />
        </F>
        <F label="Tipo de Conducto">
          <select
            value={c.tipoConducto || 'cano_rigido'}
            onChange={e => onChange({ ...c, tipoConducto: e.target.value as any })}
          >
            <option value="cano_rigido">Caño Rígido</option>
            <option value="bandeja">Bandeja Portacables</option>
            <option value="canaleta">Canaleta / Cablecanal</option>
            <option value="enterrado">Enterrado</option>
            <option value="otro">Otro</option>
          </select>
        </F>
        <F label="Descripción">
          <input
            type="text"
            value={c.conducto || ''}
            onChange={e => onChange({ ...c, conducto: e.target.value })}
            placeholder="Ej: RL 20mm"
          />
        </F>
      </div>

      <div className="field-row">
        <F label="Longitud manual (m)">
          <input
            type="number"
            step="0.1"
            min="0"
            value={c.origenLongitud === 'declarada' ? (c.seccionConduccion || '') : ''} // Usando seccionConduccion temporalmente para la longitudDeclarada, idealmente agregaremos `longitudDeclarada` al modelo o asuminmos que es eso.
            onChange={e => {
              const val = parseFloat(e.target.value);
              if (isNaN(val)) {
                 onChange({ ...c, origenLongitud: undefined, seccionConduccion: undefined });
              } else {
                 onChange({ ...c, origenLongitud: 'declarada', seccionConduccion: val });
              }
            }}
            placeholder={longitudAuto !== null ? `Auto: ${longitudAuto.toFixed(2)}m` : 'Ej: 5.5'}
          />
        </F>
        <F label="Referencia (en plano)">
          <input
            type="text"
            value={c.referencia || ''}
            onChange={e => onChange({ ...c, referencia: e.target.value })}
            placeholder={`Ej: C${index + 1}`}
          />
        </F>
        <F label="Descripción / Observaciones">
          <input
            type="text"
            value={c.descripcion || ''}
            onChange={e => onChange({ ...c, descripcion: e.target.value })}
            placeholder="Ej: Cruce de jardín"
          />
        </F>
      </div>
      
      <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-h)' }}>Retornos y Comandos Manuales</span>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const newCables = [...(c.cables || [])];
              newCables.push({ tipo: 'retorno', seccion: 1.5, referencia: '' });
              onChange({ ...c, cables: newCables });
            }}
          >
            ＋ Añadir Retorno
          </button>
        </div>
        
        {(c.cables || []).map((cab, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <select
              value={cab.tipo}
              onChange={e => {
                const newCables = [...c.cables];
                newCables[idx].tipo = e.target.value as any;
                onChange({ ...c, cables: newCables });
              }}
              style={{ flex: 1 }}
            >
              <option value="retorno">Retorno</option>
              <option value="comando">Comando</option>
              <option value="fase">Fase</option>
              <option value="neutro">Neutro</option>
              <option value="pe">PE</option>
            </select>
            <input
              type="number"
              step="0.5"
              value={cab.seccion}
              onChange={e => {
                const newCables = [...c.cables];
                newCables[idx].seccion = parseFloat(e.target.value) || 0;
                onChange({ ...c, cables: newCables });
              }}
              placeholder="mm²"
              style={{ width: 70 }}
              title="Sección (mm²)"
            />
            <input
              type="text"
              value={cab.referencia || ''}
              onChange={e => {
                const newCables = [...c.cables];
                newCables[idx].referencia = e.target.value;
                onChange({ ...c, cables: newCables });
              }}
              placeholder="Ref (ej: a)"
              style={{ width: 100 }}
              title="Referencia para enlazar con llave/boca"
            />
            <button 
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--red)', padding: '0 8px' }}
              onClick={() => {
                const newCables = c.cables.filter((_, i) => i !== idx);
                onChange({ ...c, cables: newCables });
              }}
            >
              ✕
            </button>
          </div>
        ))}
        {(c.cables || []).length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
            No hay cables manuales. Los cables principales se infieren automáticamente de los circuitos seleccionados.
          </div>
        )}
      </div>
    </Card>
  );
}
