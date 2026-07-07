import React from 'react';
import { Card } from '../../../../ui/Card';
import { F } from '../../../../ui/Field';
import { NumInput } from '../../../../ui/NumInput';
import { type Ambiente } from '../../../../types/index';

interface CoverageTabProps {
  activeAmbiente: Ambiente;
  onUpdateAmbiente: (fn: (a: Ambiente) => Ambiente) => void;
  onStartCreation: () => void;
}

/**
 * Pestaña para la gestión de zonas de cobertura (galerías, pérgolas, etc.)
 */
export const CoverageTab: React.FC<CoverageTabProps> = React.memo(({ 
  activeAmbiente, 
  onUpdateAmbiente, 
  onStartCreation 
}) => {
  return (
    <div className="cobertura-editor">
      <div className="info-helper">
        ☂️ Definí áreas con techado especial (galerías, pérgolas).<br />
        Funcionan como una secuencia de medidas relativas al origen de la hoja.
      </div>
      {(activeAmbiente.coberturas || []).map((cob, ci) => (
        <Card 
          key={cob.id} 
          idx={`C${ci}`} 
          title={cob.tipo.toUpperCase()} 
          onRemove={() => onUpdateAmbiente(a => ({
            ...a, coberturas: a.coberturas?.filter((_, j) => j !== ci)
          }))}
        >
          <div className="field-row">
            <F label="Tipo">
              <select 
                value={cob.tipo} 
                onChange={e => onUpdateAmbiente(a => ({
                  ...a,
                  coberturas: a.coberturas?.map((c, j) => j === ci ? { ...c, tipo: e.target.value as any } : c)
                }))}
              >
                <option value="total">Techo Total</option>
                <option value="galeria">Galería (Rayado)</option>
                <option value="pergola">Pérgola (Grilla)</option>
                <option value="sin_techo">Sin Techo (Punteado)</option>
              </select>
            </F>
          </div>
          {cob.segmentos.map((s, si) => (
            <div key={si} className="field-row" style={{ marginTop: 8 }}>
              <F label={`Largo ${si+1} (m)`}>
                <NumInput 
                  value={s.largo} 
                  onChange={(v: any) => onUpdateAmbiente(a => {
                    const ncs = [...(a.coberturas || [])];
                    const nss = [...ncs[ci].segmentos];
                    nss[si] = { ...nss[si], largo: v };
                    ncs[ci] = { ...ncs[ci], segmentos: nss };
                    return { ...a, coberturas: ncs };
                  })}
                />
              </F>
              <F label="Ángulo (°)">
                <NumInput 
                  value={s.angulo} 
                  onChange={(v: any) => onUpdateAmbiente(a => {
                    const ncs = [...(a.coberturas || [])];
                    const nss = [...ncs[ci].segmentos];
                    nss[si] = { ...nss[si], angulo: v };
                    ncs[ci] = { ...ncs[ci], segmentos: nss };
                    return { ...a, coberturas: ncs };
                  })}
                />
              </F>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => onUpdateAmbiente(a => {
                  const ncs = [...(a.coberturas || [])];
                  ncs[ci] = { ...ncs[ci], segmentos: ncs[ci].segmentos.filter((_, k) => k !== si) };
                  return { ...a, coberturas: ncs };
                })}
              >✕</button>
            </div>
          ))}
          <button 
            className="btn btn-ghost btn-sm btn-full" 
            style={{ marginTop: 8 }}
            onClick={() => onUpdateAmbiente(a => {
              const ncs = [...(a.coberturas || [])];
              ncs[ci] = { ...ncs[ci], segmentos: [...ncs[ci].segmentos, { largo: 1, angulo: 90 }] };
              return { ...a, coberturas: ncs };
            })}
          >
            + Agregar tramo de cobertura
          </button>
        </Card>
      ))}
      <button 
        className="btn btn-acc btn-full" 
        onClick={onStartCreation}
      >
        + Nueva Zona de Cobertura
      </button>
    </div>
  );
});
