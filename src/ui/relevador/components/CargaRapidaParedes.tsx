import React, { useRef, useEffect } from 'react';
import type { Ambiente, Pared } from '../../../types/index';
import { createPared } from '../../../lib/storage';

interface CargaRapidaParedesProps {
  ambiente: Ambiente;
  updateAmbiente: (fn: (a: Ambiente) => Ambiente) => void;
}

export function CargaRapidaParedes({ 
  ambiente, 
  updateAmbiente 
}: CargaRapidaParedesProps) {
  
  const paredes = ambiente.paredes || [];
  const wallsCount = paredes.length;
  
  const largoRefs = useRef<(HTMLInputElement | null)[]>([]);
  const anguloRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (wallsCount > 0) {
      const lastInput = largoRefs.current[wallsCount - 1];
      if (lastInput) {
        const timeout = setTimeout(() => {
          lastInput.focus();
          lastInput.select();
        }, 50);
        return () => clearTimeout(timeout);
      }
    }
  }, [wallsCount]);

  const handleParedChange = (idx: number, key: keyof Pared, val: string) => {
    const numVal = val === '' ? 0 : parseFloat(val);
    
    updateAmbiente(amb => {
      const newParedes = [...(amb.paredes || [])];
      if (!newParedes[idx]) return amb;
      
      // Manejar valores vacíos para refParedIdx y refDistancia
      let finalVal: any = numVal;
      if (key === 'refParedIdx' || key === 'refDistancia') {
        if (val === '') finalVal = undefined;
        else finalVal = numVal;
      }

      newParedes[idx] = { 
        ...newParedes[idx], 
        [key]: isNaN(numVal) && finalVal !== undefined ? 0 : finalVal 
      };
      
      return { ...amb, paredes: newParedes };
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number, field: 'largo' | 'angulo') => {
    const isLastWall = idx === paredes.length - 1;

    const crearNuevaPared = () => {
      updateAmbiente(amb => {
        const nuevaPared = createPared({ largo: 0, angulo: 90 });
        return { ...amb, paredes: [...(amb.paredes || []), nuevaPared] };
      });
    };

    if (e.key === 'Enter') {
      e.preventDefault();

      if (field === 'largo') {
        anguloRefs.current[idx]?.focus();
        anguloRefs.current[idx]?.select();
      } else if (field === 'angulo') {
        if (isLastWall) {
          crearNuevaPared();
        } else {
          largoRefs.current[idx + 1]?.focus();
          largoRefs.current[idx + 1]?.select();
        }
      }
    } else if (e.key === 'Tab') {
      if (field === 'angulo' && isLastWall) {
        e.preventDefault();
        crearNuevaPared();
      }
    }
  };

  const handleRemove = (idx: number) => {
    if (paredes.length <= 1) return;
    
    updateAmbiente(amb => {
      const newParedes = (amb.paredes || []).filter((_: any, i: number) => i !== idx);
      return { ...amb, paredes: newParedes };
    });
  };

  return (
    <div className="carga-rapida">
      <div className="carga-header" style={{ gridTemplateColumns: '30px 1fr 1fr 1fr 1fr 30px' }}>
        <span className="idx">#</span>
        <span className="label">Largo (m)</span>
        <span className="label">Ángulo (°)</span>
        <span className="label">Ref.</span>
        <span className="label">Dist. (m)</span>
        <span className="actions"></span>
      </div>

      <div className="carga-list">
        {paredes.map((p: any, i: number) => (
          <div key={p.id} className="carga-row" style={{ gridTemplateColumns: '30px 1fr 1fr 1fr 1fr 30px' }}>
            <div className="idx">{i + 1}</div>
            
            <input
              ref={el => { largoRefs.current[i] = el; }}
              type="number"
              inputMode="decimal"
              step="0.01"
              value={p.largo === 0 ? '' : p.largo}
              onChange={e => handleParedChange(i, 'largo', e.target.value)}
              onKeyDown={e => handleKeyDown(e, i, 'largo')}
              placeholder="0.00"
              aria-label={`Largo pared ${i + 1}`}
            />

            <input
              ref={el => { anguloRefs.current[i] = el; }}
              type="number"
              inputMode="decimal"
              step="1"
              value={p.angulo}
              onChange={e => handleParedChange(i, 'angulo', e.target.value)}
              onKeyDown={e => handleKeyDown(e, i, 'angulo')}
              aria-label={`Ángulo pared ${i + 1}`}
            />

            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              value={p.refParedIdx !== undefined ? p.refParedIdx + 1 : ''}
              onChange={e => {
                const val = parseInt(e.target.value);
                handleParedChange(i, 'refParedIdx', isNaN(val) ? '' : (val - 1).toString());
              }}
              placeholder="Auto"
              aria-label={`Referencia pared ${i + 1}`}
              style={{ fontSize: '11px', textAlign: 'center' }}
            />

            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={p.refDistancia ?? ''}
              onChange={e => handleParedChange(i, 'refDistancia', e.target.value)}
              placeholder="0.0"
              disabled={p.refParedIdx === undefined}
              aria-label={`Distancia de referencia ${i + 1}`}
              style={{ fontSize: '11px', opacity: p.refParedIdx === undefined ? 0.3 : 1 }}
            />

            <button 
              className="btn-del" 
              onClick={() => handleRemove(i)}
              title="Eliminar pared"
              tabIndex={-1}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button 
        className="btn-add" 
        onClick={() => {
          updateAmbiente(amb => {
            return { ...amb, paredes: [...(amb.paredes || []), createPared()] };
          });
        }}
      >
        ＋ Agregar Pared Manualmente
      </button>
    </div>
  );
}
