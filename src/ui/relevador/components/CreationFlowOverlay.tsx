import React from 'react';
import { Card } from '../../../ui/Card';
import { F } from '../../../ui/Field';
import { NumInput } from '../../../ui/NumInput';

interface CreationFlowOverlayProps {
  creationFlow: {
    active: boolean;
    step: 'A' | 'B';
    anchor: any;
    offsetX: number;
    offsetY: number;
  };
  allVertices: any[];
  onCancel: () => void;
  onStepChange: (step: 'A' | 'B') => void;
  onAnchorSelect: (anchor: any) => void;
  onOffsetChange: (x: number, y: number) => void;
  onConfirm: () => void;
}

/**
 * Overlay que gestiona la UI del flujo de creación de elementos con origen explícito.
 */
export const CreationFlowOverlay: React.FC<CreationFlowOverlayProps> = ({
  creationFlow,
  allVertices,
  onCancel,
  onStepChange,
  onAnchorSelect,
  onOffsetChange,
  onConfirm
}) => {
  if (!creationFlow.active) return null;

  return (
    <div className="creation-flow">
      <Card 
        idx="⭐" 
        title={creationFlow.step === 'A' ? 'Paso A: Selección de Origen' : 'Paso B: Ajuste de Offset'} 
        onRemove={onCancel}
      >
        {creationFlow.step === 'A' ? (
          <>
            <div className="info-helper">Seleccioná un vértice existente para anclar el nuevo elemento.</div>
            <div className="vertex-list" style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              border: '1px solid var(--border)', 
              borderRadius: '4px', 
              marginBottom: '12px' 
            }}>
              {allVertices.map((v, i) => (
                <div 
                  key={i} 
                  className={`vertex-item ${creationFlow.anchor?.label === v.label ? 'active' : ''}`}
                  style={{ 
                    padding: '8px', 
                    cursor: 'pointer', 
                    borderBottom: '1px solid var(--border-dim)', 
                    fontSize: '12px' 
                  }}
                  onClick={() => onAnchorSelect(v)}
                >
                  {v.label}
                </div>
              ))}
            </div>
            <button 
              className="btn btn-acc btn-full" 
              disabled={!creationFlow.anchor}
              onClick={() => onStepChange('B')}
            >
              Siguiente: Definir Offset
            </button>
          </>
        ) : (
          <>
            <div className="info-helper">Ingresá el desplazamiento desde el punto seleccionado.</div>
            <div className="field-row">
              <F label="Δ X (metros)">
                <NumInput 
                  value={creationFlow.offsetX} 
                  onChange={v => onOffsetChange(v, creationFlow.offsetY)} 
                />
              </F>
              <F label="Δ Y (metros)">
                <NumInput 
                  value={creationFlow.offsetY} 
                  onChange={v => onOffsetChange(creationFlow.offsetX, v)} 
                />
              </F>
            </div>
            <div style={{ 
              marginTop: '12px', 
              padding: '8px', 
              background: 'var(--bg-dim)', 
              borderRadius: '4px', 
              fontSize: '11px' 
            }}>
              <strong>Origen calculado:</strong><br/>
              X: {((creationFlow.anchor?.x || 0) + creationFlow.offsetX).toFixed(2)} m<br/>
              Y: {((creationFlow.anchor?.y || 0) + creationFlow.offsetY).toFixed(2)} m
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn btn-ghost" onClick={() => onStepChange('A')}>Atrás</button>
              <button className="btn btn-acc btn-full" onClick={onConfirm}>Confirmar Creación</button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
