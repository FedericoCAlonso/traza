// ═══════════════════════════════════════════════════════════════════════════
// MODULE: renderer/connections.ts
// Funciones para renderizar las conexiones de cables / netlist.
// ═══════════════════════════════════════════════════════════════════════════
import * as GEO from '../geometry';
import type { Point, Segmento } from '../geometry';
import type { Ambiente, Project } from '../../types/index';
import { f, ptsAttr, line, txt, getElementPos } from './utils';

export function renderConexiones(out: string[], ambiente: Ambiente, project: Project | undefined, segs: Segmento[], escala: number, dx: number, dy: number): void {
  if (!project?.conexiones) return;
  project.conexiones.forEach((con, idx) => {
    if (!con.from || !con.to) return;
    
    const isFrom = con.from.ambienteId === ambiente.id;
    const isTo = con.to.ambienteId === ambiente.id;
    const isInterSheet = con.from.ambienteId !== con.to.ambienteId;

    if ((isFrom || isTo)) {
      if (!isInterSheet) {
        const el1 = ambiente.elementos?.find(e => e.id === con.from.elementoId);
        const el2 = ambiente.elementos?.find(e => e.id === con.to.elementoId);
        if (el1 && el2) {
          const p1 = getElementPos(el1, segs, escala, dx, dy);
          const p2 = getElementPos(el2, segs, escala, dx, dy);
          const midX = (p1[0] + p2[0]) / 2;
          const midY = (p1[1] + p2[1]) / 2;
          const dxDir = p2[0] - p1[0];
          const dyDir = p2[1] - p1[1];
          const len = Math.hypot(dxDir, dyDir);
          const nx = len > 0 ? -dyDir / len : 0;
          const ny = len > 0 ? dxDir / len : 0;
          const curveOffset = Math.min(len * 0.15, 20);
          const cx = midX + nx * curveOffset;
          const cy = midY + ny * curveOffset;
          let color = '#3498DB';
          if (con.circuitoId) {
            const circ = project.circuitos?.find(c => c.id === con.circuitoId);
            if (circ && circ.color) color = circ.color;
          }
          out.push(`<path d="M ${f(p1[0])} ${f(p1[1])} Q ${f(cx)} ${f(cy)}, ${f(p2[0])} ${f(p2[1])}" fill="none" stroke="${color}" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.8"/>`);
          const labelText = con.referencia || `C${idx + 1}`;
          const qX = 0.25 * p1[0] + 0.5 * cx + 0.25 * p2[0];
          const qY = 0.25 * p1[1] + 0.5 * cy + 0.25 * p2[1];
          out.push(txt([qX, qY - 4], labelText, 0, color, 4, 'middle'));
        }
      } else {
        const elId = isFrom ? con.from.elementoId : con.to.elementoId;
        const targetAmbId = isFrom ? con.to.ambienteId : con.from.ambienteId;
        const targetElId = isFrom ? con.to.elementoId : con.from.elementoId;
        
        const el = ambiente.elementos?.find(e => e.id === elId);
        if (!el) return;

        const pos = getElementPos(el, segs, escala, dx, dy);
        let dir: Point = [0, -1];
        if (el.paredIdx !== null) {
          const seg = segs[el.paredIdx];
          dir = seg.v_int;
        }

        const arrowLen = project.grosor_pared_default * 3;
        const arrowPx = GEO.mToPx(arrowLen, escala);
        const pEnd = GEO.add(pos, GEO.scale(dir, arrowPx));
        
        let color = '#555555';
        if (el.circuitoId) {
          const circ = project.circuitos?.find(c => c.id === el.circuitoId);
          if (circ && circ.color) color = circ.color;
        }

        const p1 = GEO.add(pEnd, GEO.scale(GEO.rot(dir, 150), 3));
        const p2 = GEO.add(pEnd, GEO.scale(GEO.rot(dir, -150), 3));
        out.push(line(pos, pEnd, color, 0.8));
        out.push(`<polygon points="${ptsAttr([pEnd, p1, p2])}" fill="${color}"/>`);

        const targetAmb = project.ambientes.find(a => a.id === targetAmbId);
        const targetEl = targetAmb?.elementos?.find(e => e.id === targetElId);
        const refConexion = con.referencia || `C${idx + 1}`;
        const label = `${refConexion} ${isFrom ? '→' : '←'} ${targetEl?.referencia || 'S/R'} (${targetAmb?.nombre || '?'})`;
        out.push(txt(GEO.add(pEnd, GEO.scale(dir, 5)), label, 0, color, 3.5, 'middle'));
      }
    }
  });
}
