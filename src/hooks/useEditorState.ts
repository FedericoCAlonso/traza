import { useState, useMemo, useCallback } from 'react';
import { RENDERER } from '../lib/renderer';
import * as GEO from '../lib/geometry';
import { createZonaCobertura } from '../lib/storage';
import {
  type Project, type Ambiente, type Abertura,
  type ElementoElectrico, type Circuito, type Conexion,
  type Cable,
} from '../types/index';

export function useEditorState(
  project: Project,
  activeAmbiente: Ambiente,
  onUpdateAmbiente: (updateFn: (amb: Ambiente) => Ambiente) => void,
  onUpdateProject: (fn: (p: Project) => Project) => void
) {
  // Estado del flujo de creación (solo coberturas)
  const [creationFlow, setCreationFlow] = useState<{
    active: boolean;
    type: 'cobertura' | 'tramo';
    step: 'A' | 'B';
    anchor: { x: number; y: number; label: string; ref?: unknown } | null;
    offsetX: number;
    offsetY: number;
  }>({ active: false, type: 'cobertura', step: 'A', anchor: null, offsetX: 0, offsetY: 0 });

  // Estado para conexiones entre bocas (inter-ambiente)
  const [pendingConnection, setPendingConnection] = useState<{
    ambienteId: string;
    elementoId: string;
  } | null>(null);

  // --- Geometría: Cálculo de todos los vértices anclables ---
  const allVertices = useMemo(() => {
    if (!activeAmbiente || !project) return [];
    const { allSegs } = RENDERER.buildSegs(activeAmbiente, project);
    const result: { x: number, y: number, label: string, ref: unknown }[] = [];

    allSegs.forEach((s, si) => {
      const xM = GEO.pxToM(s.inicio[0], project.escala);
      const yM = GEO.pxToM(s.inicio[1], project.escala);
      result.push({
        x: xM, y: yM,
        label: `Pared ${si + 1} · inicio — (${xM.toFixed(2)}m, ${yM.toFixed(2)}m)`,
        ref: { type: 'vertice', ambienteRefId: activeAmbiente.id, verticeRefIdx: si }
      });
      if (si === allSegs.length - 1) {
        const xF = GEO.pxToM(s.fin[0], project.escala);
        const yF = GEO.pxToM(s.fin[1], project.escala);
        result.push({
          x: xF, y: yF,
          label: `Pared ${si + 1} · fin — (${xF.toFixed(2)}m, ${yF.toFixed(2)}m)`,
          ref: { type: 'vertice', ambienteRefId: activeAmbiente.id, verticeRefIdx: si + 1 }
        });
      }
    });

    // Vértices de zonas de cobertura
    (activeAmbiente.coberturas || []).forEach((cob, ci) => {
      let curX = cob.origenX || 0;
      let curY = cob.origenY || 0;
      let curAng = 0;
      result.push({
        x: curX, y: curY,
        label: `Cobert. ${ci + 1} · Origen — (${curX.toFixed(2)}m, ${curY.toFixed(2)}m)`,
        ref: { type: 'cobertura', id: cob.id, idx: 0 }
      });

      cob.segmentos.forEach((s, si) => {
        curAng += s.angulo;
        curX += s.largo * Math.cos(curAng * Math.PI / 180);
        curY += s.largo * Math.sin(curAng * Math.PI / 180);
        result.push({
          x: curX, y: curY,
          label: `Cobert. ${ci + 1} · Vértice ${si + 1} — (${curX.toFixed(2)}m, ${curY.toFixed(2)}m)`,
          ref: { type: 'cobertura', id: cob.id, idx: si + 1 }
        });
      });
    });

    // Opción por defecto
    result.push({ x: 0, y: 0, label: "Origen libre (0, 0)", ref: { type: 'pendiente' } });
    return result;
  }, [activeAmbiente, project]);

  // --- Handlers de actualización semántica ---
  const updateOpenings = useCallback((fn: (aberturas: Abertura[]) => Abertura[]) => {
    onUpdateProject(proj => {
      const currentAmb = proj.ambientes.find(a => a.id === activeAmbiente.id);
      if (!currentAmb) return proj;

      const nextOpenings = fn(currentAmb.aberturas || []);

      return {
        ...proj,
        ambientes: proj.ambientes.map(amb => {
          // Actualizar hoja actual
          if (amb.id === activeAmbiente.id) {
            return { ...amb, aberturas: nextOpenings };
          }

          // Sincronizar hojas vinculadas
          const linkedOpenings = (amb.aberturas || []).map(targetOp => {
            if (targetOp.ambienteVecinoId === activeAmbiente.id) {
              const sourceOp = nextOpenings.find(o => o.id === targetOp.aberturaVecinaId);
              if (sourceOp) {
                return {
                  ...targetOp,
                  ancho: sourceOp.ancho,
                  tipo: sourceOp.tipo,
                  subtipo: sourceOp.subtipo,
                  hojas: sourceOp.hojas,
                  lado: sourceOp.lado === 'interior' ? 'exterior' : (sourceOp.lado === 'exterior' ? 'interior' : sourceOp.lado),
                  sentido: sourceOp.sentido === 'derecha' ? 'izquierda' : (sourceOp.sentido === 'izquierda' ? 'derecha' : sourceOp.sentido)
                };
              }
            }
            return targetOp;
          });

          return { ...amb, aberturas: linkedOpenings };
        })
      };
    });
  }, [activeAmbiente.id, onUpdateProject]);

  const updateElectrical = useCallback(
    (fn: (elementos: ElementoElectrico[]) => ElementoElectrico[]) =>
      onUpdateAmbiente(a => ({ ...a, elementos: fn(a.elementos || []) })),
    [onUpdateAmbiente]
  );

  const updateStructural = useCallback(
    (fn: (elementos: import('../types').ElementoEstructural[]) => import('../types').ElementoEstructural[]) =>
      onUpdateAmbiente(a => ({ ...a, elementosEstructurales: fn(a.elementosEstructurales || []) })),
    [onUpdateAmbiente]
  );

  const updateCircuitos = useCallback(
    (fn: (circuitos: Circuito[]) => Circuito[]) =>
      onUpdateProject(p => ({ ...p, circuitos: fn(p.circuitos || []) })),
    [onUpdateProject]
  );

  const updateConexiones = useCallback(
    (fn: (conexiones: Conexion[]) => Conexion[]) =>
      onUpdateProject(p => ({ ...p, conexiones: fn(p.conexiones || []) })),
    [onUpdateProject]
  );

  /**
   * Vincula una abertura de la hoja activa con una ya existente en otra hoja.
   * Crea un enlace bidireccional, sincroniza propiedades y aplica la transformación
   * geométrica a la hoja activa (esclava) para que los muros coincidan.
   */
  const linkOpening = useCallback((targetAmbId: string, targetOpeningId: string, currentOpeningId: string) => {
    onUpdateProject(proj => {
      const targetAmb = proj.ambientes.find(a => a.id === targetAmbId);
      const currentAmb = proj.ambientes.find(a => a.id === activeAmbiente.id);
      const targetOp = targetAmb?.aberturas.find(o => o.id === targetOpeningId);
      const opActiva = currentAmb?.aberturas.find(o => o.id === currentOpeningId);
      if (!targetAmb || !targetOp || !currentAmb || !opActiva) {
         console.warn('Faltan datos para el enlace', {targetAmb, targetOp, currentAmb, opActiva});
         return proj;
      }

      // La maestra es targetAmb, la esclava es currentAmb
      // calcularTransformacionEnlace(A, abA, B, abB) -> posiciona B relativa a A
      const transform = GEO.calcularTransformacionEnlace(targetAmb, targetOp, currentAmb, opActiva, proj.escala);

      return {
        ...proj,
        ambientes: proj.ambientes.map(amb => {
          // Actualizar abertura en la hoja actual (ESCLAVA)
          if (amb.id === activeAmbiente.id) {
            return {
              ...amb,
              posX: transform.posX,
              posY: transform.posY,
              rotation: transform.rotation,
              aberturas: (amb.aberturas || []).map(o => {
                if (o.id === currentOpeningId) {
                  return {
                    ...o,
                    ambienteVecinoId: targetAmbId,
                    aberturaVecinaId: targetOpeningId,
                    esPrincipal: false,
                    ancho: targetOp.ancho,
                    tipo: targetOp.tipo,
                    subtipo: targetOp.subtipo,
                    hojas: targetOp.hojas,
                    lado: targetOp.lado === 'interior' ? 'exterior' : (targetOp.lado === 'exterior' ? 'interior' : targetOp.lado),
                    sentido: targetOp.sentido === 'derecha' ? 'izquierda' : (targetOp.sentido === 'izquierda' ? 'derecha' : targetOp.sentido)
                  };
                }
                return o;
              })
            };
          }
          // Actualizar abertura en la hoja destino (MAESTRA)
          if (amb.id === targetAmbId) {
            return {
              ...amb,
              aberturas: (amb.aberturas || []).map(o => {
                if (o.id === targetOpeningId) {
                  return {
                    ...o,
                    ambienteVecinoId: activeAmbiente.id,
                    aberturaVecinaId: currentOpeningId,
                    esPrincipal: true
                  };
                }
                return o;
              })
            };
          }
          return amb;
        })
      };
    });
  }, [activeAmbiente, onUpdateProject]);

  // --- Handlers del Flujo de Creación ---
  const startCreation = useCallback((type: 'tramo' | 'cobertura') => {
    setCreationFlow({ active: true, type, step: 'A', anchor: null, offsetX: 0, offsetY: 0 });
  }, []);

  const cancelCreation = useCallback(
    () => setCreationFlow(prev => ({ ...prev, active: false })),
    []
  );

  const setCreationStep = useCallback(
    (step: 'A' | 'B') => setCreationFlow(prev => ({ ...prev, step })),
    []
  );

  const setCreationAnchor = useCallback(
    (anchor: unknown) => setCreationFlow(prev => ({ ...prev, anchor: anchor as typeof creationFlow['anchor'] })),
    []
  );

  const setCreationOffset = useCallback(
    (x: number, y: number) => setCreationFlow(prev => ({ ...prev, offsetX: x, offsetY: y })),
    []
  );

  const confirmCreation = useCallback(() => {
    const finalX = (creationFlow.anchor?.x || 0) + creationFlow.offsetX;
    const finalY = (creationFlow.anchor?.y || 0) + creationFlow.offsetY;

    onUpdateAmbiente(a => ({
      ...a,
      coberturas: [...(a.coberturas || []), {
        ...createZonaCobertura(),
        origenX: finalX,
        origenY: finalY
      }]
    }));
    cancelCreation();
  }, [creationFlow, onUpdateAmbiente, cancelCreation]);

  // --- Handlers de Netlist Inter-Ambiente ---
  const startConnecting = useCallback((elementoId: string) => {
    setPendingConnection({ ambienteId: activeAmbiente.id, elementoId });
  }, [activeAmbiente.id]);

  const finishConnecting = useCallback((toAmbId: string, toElId: string) => {
    if (!pendingConnection) return;

    const defaultCables: Cable[] = [
      { tipo: 'fase',   seccion: 2.5, color: 'negro' },
      { tipo: 'neutro', seccion: 2.5, color: 'celeste' },
      { tipo: 'pe',     seccion: 2.5, color: 'verde-amarillo' },
    ];

    onUpdateProject(p => ({
      ...p,
      conexiones: [...(p.conexiones || []), {
        id: Date.now().toString(),
        from: { ambienteId: pendingConnection.ambienteId, elementoId: pendingConnection.elementoId },
        to: { ambienteId: toAmbId, elementoId: toElId },
        cables: defaultCables,
        conducto: 'PVC 20mm'
      }]
    }));

    setPendingConnection(null);
  }, [pendingConnection, onUpdateProject]);

  const cancelConnecting = useCallback(() => setPendingConnection(null), []);

  return {
    // Estado
    creationFlow,

    // Acciones del flujo
    startCreation, cancelCreation, setCreationStep, setCreationAnchor, setCreationOffset, confirmCreation,

    // Geometría
    allVertices,

    // Helpers de actualización
    updateOpenings, updateElectrical, updateStructural, updateCircuitos, updateConexiones,
    linkOpening,

    // Netlist
    pendingConnection,
    startConnecting,
    finishConnecting,
    cancelConnecting,

    // Atajos de datos
    circuitos: project.circuitos || [],
    conexiones: project.conexiones || []
  };
}
