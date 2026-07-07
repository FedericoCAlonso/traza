import React from 'react';
import type { Ambiente, Escalera } from '../../../../types/index';

interface StairsTabProps {
  activeAmbiente: Ambiente;
  onUpdateAmbiente: (updateFn: (amb: Ambiente) => Ambiente) => void;
}

export const StairsTab: React.FC<StairsTabProps> = React.memo(({ 
  activeAmbiente, 
  onUpdateAmbiente 
}) => {
  const escaleras = activeAmbiente.escaleras || [];

  const updateEscaleras = (fn: (escs: Escalera[]) => Escalera[]) => {
    onUpdateAmbiente(amb => ({ ...amb, escaleras: fn(amb.escaleras || []) }));
  };

  return (
    <>
      <div className="info-helper">
        Escaleras paramétricas. Selecciona la forma y dimensiones.
      </div>
      {escaleras.map((esc, i) => (
        <div key={esc.id} className="card-item" style={{ marginBottom: 12, padding: 12, border: '1px solid #ccc', borderRadius: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>Escalera {i + 1}</strong>
            <button className="btn-del" onClick={() => updateEscaleras(escs => escs.filter((_, j) => j !== i))}>✕</button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label className="label">Forma</label>
              <select 
                className="input-base" 
                value={esc.forma}
                onChange={e => updateEscaleras(escs => escs.map((x, j) => j === i ? { ...x, forma: e.target.value as any } : x))}
              >
                <option value="recta">Recta</option>
                <option value="L_der">L (Derecha)</option>
                <option value="L_izq">L (Izquierda)</option>
                <option value="U_der">U (Derecha)</option>
                <option value="U_izq">U (Izquierda)</option>
                <option value="caracol">Caracol / Helicoidal</option>
              </select>
            </div>
            <div>
              <label className="label">Sentido</label>
              <select 
                className="input-base" 
                value={esc.sentido}
                onChange={e => updateEscaleras(escs => escs.map((x, j) => j === i ? { ...x, sentido: e.target.value as any } : x))}
              >
                <option value="sube">Sube</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label className="label">Ancho (m)</label>
              <input 
                className="input-base" type="number" step="0.1" value={esc.ancho} 
                onChange={e => updateEscaleras(escs => escs.map((x, j) => j === i ? { ...x, ancho: parseFloat(e.target.value) || 0 } : x))}
              />
            </div>
            {esc.forma !== 'caracol' && (
              <div>
                <label className="label">Largo 1 (m)</label>
                <input 
                  className="input-base" type="number" step="0.1" value={esc.largo1} 
                  onChange={e => updateEscaleras(escs => escs.map((x, j) => j === i ? { ...x, largo1: parseFloat(e.target.value) || 0 } : x))}
                />
              </div>
            )}
            {esc.forma.startsWith('L_') || esc.forma.startsWith('U_') ? (
              <div>
                <label className="label">Largo 2 (m)</label>
                <input 
                  className="input-base" type="number" step="0.1" value={esc.largo2 || 0} 
                  onChange={e => updateEscaleras(escs => escs.map((x, j) => j === i ? { ...x, largo2: parseFloat(e.target.value) || 0 } : x))}
                />
              </div>
            ) : null}
            {esc.forma === 'caracol' && (
              <div>
                <label className="label">Radio (m)</label>
                <input 
                  className="input-base" type="number" step="0.1" value={esc.radio || 1} 
                  onChange={e => updateEscaleras(escs => escs.map((x, j) => j === i ? { ...x, radio: parseFloat(e.target.value) || 0 } : x))}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label className="label">Pared (Ref)</label>
              <select 
                className="input-base" 
                value={esc.paredIdx ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  updateEscaleras(escs => escs.map((x, j) => j === i ? { ...x, paredIdx: val === '' ? null : parseInt(val) } : x));
                }}
              >
                <option value="">Ninguna (Libre)</option>
                {(activeAmbiente.paredes || []).map((_, idx) => (
                  <option key={idx} value={idx}>Pared {idx + 1}</option>
                ))}
              </select>
            </div>
            {esc.paredIdx !== null && (
              <div>
                <label className="label">Posición (m)</label>
                <input 
                  className="input-base" type="number" step="0.1" value={esc.posicion} 
                  onChange={e => updateEscaleras(escs => escs.map((x, j) => j === i ? { ...x, posicion: parseFloat(e.target.value) || 0 } : x))}
                />
              </div>
            )}
          </div>
          
        </div>
      ))}

      <button 
        className="btn btn-acc" 
        style={{ width: '100%', marginTop: '16px' }}
        onClick={() => {
          updateEscaleras(escs => [...escs, {
            id: Date.now().toString(),
            paredIdx: 0,
            posicion: 0,
            ancho: 0.9,
            sentido: 'sube',
            forma: 'recta',
            largo1: 2.0
          }]);
        }}
      >
        + Nueva Escalera
      </button>
    </>
  );
});
