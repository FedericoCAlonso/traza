import React, { useState } from 'react';
import { WallCard } from '../WallCard';
import { CargaRapidaParedes } from '../CargaRapidaParedes';
import { createPared } from '../../../../lib/storage';
import { type Ambiente, type Pared } from '../../../../types/index';

interface WallsTabProps {
  activeAmbiente: Ambiente;
  onUpdateAmbiente: (updateFn: (amb: Ambiente) => Ambiente) => void;
  selectedElement?: import('../../../../types/index').SelectedElement;
  onSelectElement?: (el: import('../../../../types/index').SelectedElement) => void;
}

export const WallsTab: React.FC<WallsTabProps> = React.memo(({
  activeAmbiente,
  onUpdateAmbiente,
  selectedElement,
  onSelectElement
}) => {
  const [fastMode, setFastMode] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [branchRefIdx, setBranchRefIdx] = useState(0);
  const [branchDist, setBranchDist] = useState(0);

  const paredes = activeAmbiente.paredes || [];

  const addPared = () => {
    onUpdateAmbiente(a => ({
      ...a,
      paredes: [...(a.paredes || []), createPared({ largo: 0, angulo: 90 })]
    }));
  };

  const addBranch = () => {
    // Validar intersección con aberturas
    const aberturasEnPared = activeAmbiente.aberturas?.filter(ab => ab.pared === branchRefIdx) || [];
    const colision = aberturasEnPared.find(ab => 
      branchDist >= ab.posicion && branchDist <= ab.posicion + ab.ancho
    );

    if (colision) {
      alert(`No se puede ramificar aquí. Hay un(a) ${colision.tipo} en la posición ${colision.posicion}m con ancho ${colision.ancho}m.`);
      return;
    }

    const newPared = createPared({
      largo: 1,
      angulo: 90,
      refParedIdx: branchRefIdx,
      refDistancia: branchDist,
    });
    onUpdateAmbiente(a => ({
      ...a,
      paredes: [...(a.paredes || []), newPared]
    }));
    setShowBranchPicker(false);
    setBranchDist(0);
  };

  // Detectar si el tramo principal está cerrado geométricamente
  // (simple heurístico: la última pared tiene largo 'auto')
  const isClosed = paredes.length > 0 && paredes[paredes.length - 1].largo === 'auto';

  return (
    <div className="paredes-editor">
      {/* Estado del ambiente */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
          <span className={`status-tag ${isClosed ? 'ok' : 'warn'}`}>
            {isClosed ? '✓ Ambiente Cerrado' : '⚠ Ambiente Abierto'}
          </span>
          <span style={{ color: 'var(--text-dim)' }}>{paredes.length} pared{paredes.length !== 1 ? 'es' : ''}</span>
        </div>
      </div>

      {/* Modo Vista */}
      <div style={{ padding: '0 8px 12px 8px', display: 'flex', gap: '8px' }}>
        <button
          className={`btn btn-sm ${!fastMode ? 'btn-acc' : 'btn-ghost'}`}
          style={{ flex: 1, fontSize: '12px' }}
          onClick={() => setFastMode(false)}
        >
          🎴 Vista Fichas
        </button>
        <button
          className={`btn btn-sm ${fastMode ? 'btn-acc' : 'btn-ghost'}`}
          style={{ flex: 1, fontSize: '12px' }}
          onClick={() => setFastMode(true)}
        >
          ⚡ Carga Rápida
        </button>
      </div>

      {/* Contenido según modo */}
      {fastMode ? (
        <CargaRapidaParedes
          ambiente={activeAmbiente}
          updateAmbiente={onUpdateAmbiente}
        />
      ) : (
        <div>
          {paredes.map((w: Pared, i: number) => (
            <WallCard
              key={w.id}
              pared={w}
              index={i}
              isLast={i === paredes.length - 1}
              isSelected={selectedElement?.type === 'pared' && selectedElement.idx === i}
              onSelect={() => onSelectElement?.({ type: 'pared', idx: i })}
              onChange={(nw: Pared) => onUpdateAmbiente(a => {
                const np = [...(a.paredes || [])];
                np[i] = nw;
                return { ...a, paredes: np };
              })}
              onRemove={() => onUpdateAmbiente(a => ({
                ...a,
                paredes: (a.paredes || []).filter((_: any, j: number) => j !== i)
              }))}
            />
          ))}

          {/* Acciones de agregar */}
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            <button
              className="btn btn-ghost btn-sm btn-full"
              onClick={addPared}
            >
              + Continuar (agregar pared)
            </button>
            {paredes.length > 0 && (
              <button
                className="btn btn-ghost btn-sm btn-full"
                style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
                onClick={() => {
                  setBranchRefIdx(paredes.length - 1);
                  setBranchDist(0);
                  setShowBranchPicker(v => !v);
                }}
              >
                🌿 Ramificar desde otra pared…
              </button>
            )}

            {/* Panel de selección de ramificación */}
            {showBranchPicker && (
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--orange)',
                borderRadius: '6px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--orange)' }}>
                  🌿 Nueva Ramificación
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
                      Pared base
                    </label>
                    <select
                      className="input-base"
                      style={{ width: '100%', fontSize: '12px' }}
                      value={branchRefIdx}
                      onChange={e => setBranchRefIdx(Number(e.target.value))}
                    >
                      {paredes.map((_, i) => (
                        <option key={i} value={i}>
                          Pared {i + 1}{paredes[i].refParedIdx !== undefined ? ` (rama de P${paredes[i].refParedIdx! + 1})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
                      Distancia desde inicio (m)
                    </label>
                    <input
                      type="number"
                      className="input-base"
                      style={{ width: '100%', fontSize: '12px' }}
                      step="0.01"
                      min="0"
                      value={branchDist}
                      onChange={e => setBranchDist(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-acc btn-sm" style={{ flex: 1 }} onClick={addBranch}>
                    ✓ Agregar Rama
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowBranchPicker(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
