// ═══════════════════════════════════════════════════════════════════════════
// MODULE: renderer/utils.ts
// Funciones de utilidad comunes para renderizado SVG y cálculo de posiciones.
// ═══════════════════════════════════════════════════════════════════════════
import * as GEO from '../geometry';
import type { Point, Segmento } from '../geometry';
import type { ElementoElectrico, Project, Ambiente } from '../../types/index';
import { buildSegs } from '../geometry';

/** Formatea números a 2 decimales para optimizar el tamaño del SVG */
export const f = (n: number): string => n.toFixed(2);

/** Convierte un array de puntos en un string compatible con el atributo 'points' de SVG */
export const ptsAttr = (pts: Point[]): string => pts.map(p => `${f(p[0])},${f(p[1])}`).join(' ');

/** Genera un elemento <line> de SVG */
export const line = (a: Point, b: Point, color: string, w: number, dash = ''): string =>
  `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${color}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;

/** Genera un elemento <text> de SVG con rotación opcional */
export const txt = (pos: Point, text: string | number, ang: number, color: string, size: number, anchor: 'start' | 'middle' | 'end' = 'middle'): string =>
  `<text x="${f(pos[0])}" y="${f(pos[1])}" font-family="Arial,sans-serif" font-size="${size}" fill="${color}" text-anchor="${anchor}" dominant-baseline="middle" transform="rotate(${f(ang)},${f(pos[0])},${f(pos[1])})">${text}</text>`;

/** 
 * Calcula la posición local [x,y] de un elemento en el canvas (mm papel)
 */
export function getElementPos(el: ElementoElectrico, segs: Segmento[], escala: number, dx: number, dy: number): Point {
  let ex = GEO.mToPx(el.x, escala) + dx;
  let ey = GEO.mToPx(el.y, escala) + dy;
  if (el.paredIdx !== null && el.paredIdx < segs.length) {
    const seg = segs[el.paredIdx];
    const xy = GEO.posEnPared(seg, GEO.mToPx(el.paredPos || 0, escala));
    ex = xy[0] + dx;
    ey = xy[1] + dy;
  }
  return [ex, ey];
}

/** 
 * Calcula la posición global [x,y] de un elemento en el canvas maestro
 */
export function getGlobalElementPos(project: Project, ambienteId: string, elementoId: string, escala: number, ambientesCalculados?: Ambiente[]): Point | null {
  const ambs = ambientesCalculados || project.ambientes;
  const amb = ambs.find(a => a.id === ambienteId);
  if (!amb || amb.posX === undefined || amb.posY === undefined) return null;
  const el = amb.elementos?.find(e => e.id === elementoId);
  if (!el) return null;
  
  const { allSegs: segs } = buildSegs(amb, project);
  const localPos = getElementPos(el, segs, escala, 0, 0);
  
  return GEO.transformPoint(localPos, amb.posX, amb.posY, amb.rotation || 0, escala);
}
