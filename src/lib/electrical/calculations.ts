import { getGlobalElementPos, getElementPos } from '../renderer/utils';
import { buildSegs, pxToM } from '../geometry';
import type { Project, ElementoElectrico, Ambiente } from '../../types/index';

/**
 * Retorna la altura de la boca. Si es null/0 y es de tipo techo (centro/ventilador), 
 * asume la altura del techo configurada en el ambiente o el proyecto.
 */
export function getElementHeight(el: ElementoElectrico, amb: Ambiente, defaultProjectHeight = 3.0): number {
  if (el.altura !== undefined && el.altura > 0) {
    return el.altura;
  }
  
  // Adivinar por tipo
  const tiposTecho = ['centro_iluminacion', 'centro_iluminacion_dicroica', 'ventilador_techo', 'centro_iluminacion_emergencia'];
  if (tiposTecho.includes(el.tipo)) {
    return amb.alturaLocal || defaultProjectHeight;
  }

  // Por defecto 0 si no se cargó y no es de techo
  return 0;
}

/**
 * Calcula la longitud ortogonal entre dos bocas eléctricas.
 * L = |X2 - X1| + |Y2 - Y1| + |Z2 - Z1|
 */
export function calcularLongitudOrtogonal(
  project: Project,
  fromAmbId: string,
  fromElId: string,
  toAmbId: string,
  toElId: string,
  ambientesCalculados?: Ambiente[]
): number | null {
  const ambs = ambientesCalculados || project.ambientes;
  
  const fromAmb = ambs.find(a => a.id === fromAmbId);
  const toAmb = ambs.find(a => a.id === toAmbId);
  if (!fromAmb || !toAmb) return null;

  const fromEl = fromAmb.elementos?.find(e => e.id === fromElId);
  const toEl = toAmb.elementos?.find(e => e.id === toElId);
  if (!fromEl || !toEl) return null;

  let fromPosM: [number, number] | null = null;
  let toPosM: [number, number] | null = null;

  if (fromAmbId === toAmbId) {
    const segs = buildSegs(fromAmb, project).allSegs;
    fromPosM = getElementPos(fromEl, segs, project.escala, 0, 0);
    toPosM = getElementPos(toEl, segs, project.escala, 0, 0);
  } else {
    fromPosM = getGlobalElementPos(project, fromAmbId, fromElId, project.escala, ambs);
    toPosM = getGlobalElementPos(project, toAmbId, toElId, project.escala, ambs);
  }

  if (!fromPosM || !toPosM) return null;

  const fromX_M = pxToM(fromPosM[0], project.escala);
  const fromY_M = pxToM(fromPosM[1], project.escala);
  const toX_M = pxToM(toPosM[0], project.escala);
  const toY_M = pxToM(toPosM[1], project.escala);

  const fromZ = getElementHeight(fromEl, fromAmb, project.alturaDefault);
  const toZ = getElementHeight(toEl, toAmb, project.alturaDefault);

  const dX = Math.abs(toX_M - fromX_M);
  const dY = Math.abs(toY_M - fromY_M);
  const dZ = Math.abs(toZ - fromZ);

  return dX + dY + dZ;
}
