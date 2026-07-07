// ═══════════════════════════════════════════════════════════════════════════
// MODULE: renderer/renderMaster.ts
// Renderizado integrado para el Plano Maestro (Smart Fusion).
// ═══════════════════════════════════════════════════════════════════════════
import * as GEO from '../geometry';
import type { Point } from '../geometry';
import type { Ambiente, Project } from '../../types/index';
import type { DefinicionSimbolo } from '../symbols';
import { C } from './constants';
import { f, ptsAttr, txt, getGlobalElementPos } from './utils';
import { buildSegs } from '../geometry';
import { renderAbertura, renderElemento } from './components';

export function renderMaster(project: Project, symbolsLib: DefinicionSimbolo[], ambientesCalculados?: Ambiente[]): string {
  const margin = 50;
  const meta = project;
  const escala = project.escala;
  const ambs = ambientesCalculados || project.ambientes;
  
  const placed = ambs.filter(a => a.posX !== undefined);
  if (!placed.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="touch-action: none;"><rect width="100%" height="100%" fill="white" pointer-events="none"/></svg>`;
  
  const globalData = placed.map(amb => {
    const { allSegs } = buildSegs(amb, meta);
    const rot = amb.rotation || 0;
    const gSegs = allSegs.map(s => GEO.transformSegment(s, amb.posX!, amb.posY!, rot, escala));
    return { gSegs };
  });

  const allGlobalPts = globalData.flatMap(d => d.gSegs.flatMap(s => [s.inicio, s.fin]));
  const [minX, minY, maxX, maxY] = GEO.bbox([], allGlobalPts);
  
  const w = maxX - minX + 2 * margin;
  const h = maxY - minY + 2 * margin;
  const vx = minX - margin;
  const vy = minY - margin;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="${f(vx)} ${f(vy)} ${f(w)} ${f(h)}" style="touch-action: none;">
    <defs>
      <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect x="${f(vx)}" y="${f(vy)}" width="${f(w)}" height="${f(h)}" fill="white" pointer-events="none"/>
    ${renderMasterContent(project, symbolsLib, ambs)}
  </svg>`;
}

export function renderMasterContent(project: Project, symbolsLib: DefinicionSimbolo[], ambientesCalculados?: Ambiente[]): string {
  const meta = project;
  const escala = project.escala;
  const ambs = ambientesCalculados || project.ambientes;
  const placed = ambs.filter(a => a.posX !== undefined && a.posY !== undefined);
  
  const floors: string[] = [];
  const walls: string[] = [];
  const openings: string[] = [];
  const symbols: string[] = [];
  const connections: string[] = [];
  const labels: string[] = [];

  const globalData = placed.map(amb => {
    const { chains } = buildSegs(amb, meta);
    const rot = amb.rotation || 0;
    return { amb, chains, rot };
  });

  const allRoomPolys: Point[][] = placed.map(amb => {
    const { allSegs } = buildSegs(amb, meta);
    const { int } = GEO.poligonoMuro(allSegs, true);
    return int.map(p => GEO.transformPoint(p as Point, amb.posX!, amb.posY!, amb.rotation || 0, escala));
  });

  allRoomPolys.forEach(poly => {
    floors.push(`<polygon points="${ptsAttr(poly)}" fill="${C.INT_FILL}" stroke="none"/>`);
  });

  globalData.forEach(({ amb, chains, rot }) => {
    chains.forEach(c => {
      const { ext, int } = GEO.poligonoMuro(c.segs, c.cerrado);
      const gExt = ext.map(p => GEO.transformPoint(p as Point, amb.posX!, amb.posY!, rot, escala));
      const gInt = int.map(p => GEO.transformPoint(p as Point, amb.posX!, amb.posY!, rot, escala));
      walls.push(`<polygon points="${ptsAttr([...gExt, ...([...gInt].reverse())])}" fill="${C.PARED_FILL}" stroke="none"/>`);
    });
  });

  const facePool: {inicio: Point, fin: Point, isExterior: boolean}[] = [];
  
  globalData.forEach(({ amb, chains, rot }) => {
    chains.forEach(c => {
      const { ext, int } = GEO.poligonoMuro(c.segs, c.cerrado);
      const gExt = ext.map(p => GEO.transformPoint(p as Point, amb.posX!, amb.posY!, rot, escala));
      const gInt = int.map(p => GEO.transformPoint(p as Point, amb.posX!, amb.posY!, rot, escala));
      
      for (let i = 0; i < gExt.length - 1; i++) {
        facePool.push({ inicio: gExt[i], fin: gExt[i+1], isExterior: true });
      }
      for (let i = 0; i < gInt.length - 1; i++) {
        facePool.push({ inicio: gInt[i], fin: gInt[i+1], isExterior: false });
      }
    });
  });

  const allWallLines: string[] = [];
  const processedFaces: {inicio: Point, fin: Point}[] = [];

  facePool.forEach(face => {
    const isDup = processedFaces.some(p => 
      (GEO.dist(p.inicio, face.inicio) < 1.0 && GEO.dist(p.fin, face.fin) < 1.0) ||
      (GEO.dist(p.inicio, face.fin) < 1.0 && GEO.dist(p.fin, face.inicio) < 1.0)
    );
    if (isDup) return;
    processedFaces.push({ inicio: face.inicio, fin: face.fin });

    let width: number = C.INT_W;
    if (face.isExterior) {
      const mid = GEO.scale(GEO.add(face.inicio, face.fin), 0.5);
      const isInsideOther = allRoomPolys.some(p => GEO.isPointInPolygon(mid, p));
      width = isInsideOther ? C.INT_W : C.EXT_W;
    }

    allWallLines.push(`<line x1="${f(face.inicio[0])}" y1="${f(face.inicio[1])}" x2="${f(face.fin[0])}" y2="${f(face.fin[1])}" stroke="${C.MASTER_LINE}" stroke-width="${width}"/>`);
  });

  const huecos: string[] = [];
  globalData.forEach(({ amb, chains, rot }) => {
    const allSegs = chains.flatMap(c => c.segs);
    amb.aberturas?.forEach(ab => {
      const dx = GEO.mToPx(amb.posX!, escala);
      const dy = GEO.mToPx(amb.posY!, escala);
      const huecoOut: string[] = [];
      renderAbertura(huecoOut, ab, allSegs, escala, 0, 0, true);
      huecos.push(`<g transform="translate(${f(dx)},${f(dy)}) rotate(${f(rot)})">${huecoOut.join('\n')}</g>`);
    });
  });

  globalData.forEach(({ amb, chains, rot }) => {
    const allSegs = chains.flatMap(c => c.segs);
    const dx = GEO.mToPx(amb.posX!, escala);
    const dy = GEO.mToPx(amb.posY!, escala);

    amb.aberturas?.forEach(ab => {
      if (ab.esPrincipal === false) return;
      const abOut: string[] = [];
      renderAbertura(abOut, ab, allSegs, escala, 0, 0, false);
      const cleanOut = abOut.filter(s => !s.includes('fill="white"'));
      openings.push(`<g transform="translate(${f(dx)},${f(dy)}) rotate(${f(rot)})">${cleanOut.join('\n')}</g>`);
    });

    amb.elementos?.forEach(el => {
      const symOut: string[] = [];
      renderElemento(symOut, el, allSegs, escala, 0, 0, false, symbolsLib, amb.elementosEstructurales, project?.conexiones);
      symbols.push(`<g transform="translate(${f(dx)},${f(dy)}) rotate(${f(rot)})">${symOut.join('\n')}</g>`);
    });

    const { allSegs: localSegs } = buildSegs(amb, meta);
    const [bX1, bY1, bX2, bY2] = GEO.bbox(localSegs, []);
    const gMid = GEO.transformPoint([(bX1 + bX2) / 2, (bY1 + bY2) / 2], amb.posX!, amb.posY!, rot, escala);
    labels.push(txt(gMid, amb.nombre.toUpperCase(), 0, '#666', 8));
  });

  if (project.conexiones) {
    project.conexiones.forEach(con => {
      if (!con.from || !con.to) return;
      const p1 = getGlobalElementPos(project, con.from.ambienteId, con.from.elementoId, escala, ambs);
      const p2 = getGlobalElementPos(project, con.to.ambienteId, con.to.elementoId, escala, ambs);
      if (p1 && p2) {
        const dxDir = p2[0] - p1[0];
        const dyDir = p2[1] - p1[1];
        const len = Math.hypot(dxDir, dyDir);
        const midX = (p1[0] + p2[0]) / 2 + (-dyDir/len || 0) * Math.min(len * 0.15, 20);
        const midY = (p1[1] + p2[1]) / 2 + (dxDir/len || 0) * Math.min(len * 0.15, 20);
        
        let color = '#3498DB';
        if (con.circuitoId) {
          const circ = project.circuitos?.find(c => c.id === con.circuitoId);
          if (circ?.color) color = circ.color;
        }
        connections.push(`<path d="M ${f(p1[0])} ${f(p1[1])} Q ${f(midX)} ${f(midY)}, ${f(p2[0])} ${f(p2[1])}" fill="none" stroke="${color}" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.8"/>`);
      }
    });
  }

  return [
    ...floors,
    ...walls,
    ...allWallLines,
    ...huecos,
    ...openings,
    ...symbols,
    ...connections,
    ...labels
  ].join('\n');
}

export function renderMasterConnections(project: Project): string {
  const out: string[] = [];
  const escala = project.escala;

  project.ambientes.forEach(amb => {
    if (amb.posX === undefined || amb.posY === undefined) return;

    amb.aberturas?.forEach(ab => {
      if (ab.ambienteVecinoId) {
        const vecino = project.ambientes.find(a => a.id === ab.ambienteVecinoId);
        if (vecino && vecino.posX !== undefined && vecino.posY !== undefined) {
          const { allSegs: segs } = buildSegs(amb, project);
          const seg = segs[ab.pared];
          if (!seg) return;

          const pxPerM = 1000 / escala;
          const distPx = ab.posicion * pxPerM;
          const dirLen = GEO.len(seg.dir);
          const p1 = GEO.add(
            GEO.add(seg.inicio, GEO.scale(seg.dir, dirLen > 0 ? distPx / dirLen : 0)), 
            [GEO.mToPx(amb.posX!, escala), GEO.mToPx(amb.posY!, escala)]
          );
          
          const abVecina = vecino.aberturas?.find(ax => ax.ambienteVecinoId === amb.id);
          if (abVecina) {
             const { allSegs: segsV } = buildSegs(vecino, project);
             const segV = segsV[abVecina.pared];
             if (segV) {
               const distPxV = abVecina.posicion * pxPerM;
               const dirLenV = GEO.len(segV.dir);
               const pv = GEO.add(
                 GEO.add(segV.inicio, GEO.scale(segV.dir, dirLenV > 0 ? distPxV / dirLenV : 0)), 
                 [GEO.mToPx(vecino.posX!, escala), GEO.mToPx(vecino.posY!, escala)]
               );
               out.push(`<line x1="${f(p1[0])}" y1="${f(p1[1])}" x2="${f(pv[0])}" y2="${f(pv[1])}" stroke="#E67E22" stroke-width="1" stroke-dasharray="4,2" opacity="0.6"/>`);
               return;
             }
          }
          const p2 = [GEO.mToPx(vecino.posX!, escala), GEO.mToPx(vecino.posY!, escala)];
          out.push(`<line x1="${f(p1[0])}" y1="${f(p1[1])}" x2="${f(p2[0])}" y2="${f(p2[1])}" stroke="#E67E22" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.4"/>`);
        }
      }
    });
  });

  return out.join('\n');
}
