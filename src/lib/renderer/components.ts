// ═══════════════════════════════════════════════════════════════════════════
// MODULE: renderer/components.ts
// Funciones de renderizado para componentes individuales del plano.
// ═══════════════════════════════════════════════════════════════════════════
import * as GEO from '../geometry';
import type { Point, Segmento } from '../geometry';
import type { Ambiente, Irregularidad, ElementoEstructural, ZonaCobertura, Abertura, ElementoElectrico, Escalera } from '../../types/index';
import type { DefinicionSimbolo } from '../symbols';
import { C } from './constants';
import { f, ptsAttr, line, txt, getElementPos } from './utils';

export function renderIrregularidad(out: string[], seg: Segmento, irr: Irregularidad, escala: number, dx: number, dy: number): void {
  const posPx = GEO.mToPx(irr.posicion, escala);
  const aPx = GEO.mToPx(irr.ancho, escala);
  const pPx = GEO.mToPx(Math.abs(irr.profundidad), escala);
  
  const bI = GEO.add(seg.inicio, GEO.scale(seg.dir, posPx));
  const bF = GEO.add(bI, GEO.scale(seg.dir, aPx));

  // Si hay campo lado explícito lo usamos; si no, el signo de profundidad (compatibilidad legacy)
  const haciaInterior = irr.lado !== undefined
    ? irr.lado === 'interior'
    : irr.profundidad > 0;
  
  if (haciaInterior) { // Columna/resalto hacia el interior del ambiente
    const p1 = GEO.add(bI, GEO.scale(seg.v_int, pPx));
    const p2 = GEO.add(bF, GEO.scale(seg.v_int, pPx));
    const pts = [bI, bF, p2, p1].map(p => GEO.add(p, [dx, dy]));
    
    out.push(`<polygon points="${ptsAttr(pts)}" fill="${C.PARED_FILL}" stroke="none"/>`);
    out.push(line(pts[0], pts[3], C.INT, C.INT_W));
    out.push(line(pts[3], pts[2], C.INT, C.INT_W));
    out.push(line(pts[2], pts[1], C.INT, C.INT_W));
    out.push(line(pts[0], pts[1], C.PARED_FILL, C.INT_W * 1.5));
  } else { // Nicho hacia el exterior
    const p1 = GEO.add(bI, GEO.scale(seg.v_ext, pPx));
    const p2 = GEO.add(bF, GEO.scale(seg.v_ext, pPx));
    const pts = [bI, bF, p2, p1].map(p => GEO.add(p, [dx, dy]));
    
    out.push(`<polygon points="${ptsAttr(pts)}" fill="${C.INT_FILL}" stroke="none"/>`);
    out.push(line(pts[0], pts[3], C.INT, C.INT_W));
    out.push(line(pts[3], pts[2], C.INT, C.INT_W));
    out.push(line(pts[2], pts[1], C.INT, C.INT_W));
    out.push(line(pts[0], pts[1], C.INT_FILL, C.INT_W * 1.5));
  }
}

export function renderElementoEstructural(out: string[], ee: ElementoEstructural, escala: number, dx: number, dy: number): void {
  const w = GEO.mToPx(ee.ancho || 0.2, escala);
  const h = GEO.mToPx(ee.profundidad || 0.2, escala);
  const x = GEO.mToPx(ee.x, escala) + dx - w/2;
  const y = GEO.mToPx(ee.y, escala) + dy - h/2;

  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#444" stroke="#000" stroke-width="0.5"/>`);
  if (ee.descripcion) {
    out.push(txt([x + w/2, y + h + 4], ee.descripcion, 0, '#666', 2.5, 'middle'));
  }
}

export function renderCobertura(out: string[], cob: ZonaCobertura, escala: number, dx: number, dy: number): void {
  const pts: [number, number][] = [[
    GEO.mToPx(cob.origenX || 0, escala) + dx, 
    GEO.mToPx(cob.origenY || 0, escala) + dy
  ]];
  let curAng = 0;
  cob.segmentos.forEach(s => {
    curAng += s.angulo;
    const last = pts[pts.length - 1];
    const vx = s.largo * Math.cos(curAng * Math.PI / 180);
    const vy = s.largo * Math.sin(curAng * Math.PI / 180);
    pts.push([last[0] + GEO.mToPx(vx, escala), last[1] + GEO.mToPx(vy, escala)]);
  });

  const ptsAttrStr = pts.map(p => p.join(',')).join(' ');
  let fill = 'none';
  let stroke = 'rgba(0,0,0,0.5)';
  let dash = '';

  if (cob.tipo === 'total') {
    fill = 'rgba(0,0,0,0.05)';
  } else if (cob.tipo === 'galeria') {
    fill = 'url(#hatch)';
  } else if (cob.tipo === 'pergola') {
    fill = 'url(#grid)';
  } else if (cob.tipo === 'sin_techo') {
    dash = '4,4';
  }

  out.push(`<polygon points="${ptsAttrStr}" fill="${fill}" stroke="${stroke}" stroke-width="0.8" stroke-dasharray="${dash}"/>`);
}

export function renderAbertura(out: string[], ab: Abertura, segs: Segmento[], escala: number, dx: number, dy: number, onlyHueco = false): void {
  const seg = segs[ab.pared];
  if (!seg) return;

  const posPx = GEO.mToPx(ab.posicion, escala);
  const aPx = GEO.mToPx(ab.ancho, escala);
  const bI = GEO.add(seg.inicio, GEO.scale(seg.dir, posPx));
  const bF = GEO.add(bI, GEO.scale(seg.dir, aPx));
  
  const buf = 0.5;
  const hI1 = GEO.add(bI, GEO.scale(seg.v_int, buf));
  const hI2 = GEO.add(bF, GEO.scale(seg.v_int, buf));
  const hE1 = GEO.add(bI, GEO.scale(seg.v_ext, seg.grosorPx + buf));
  const hE2 = GEO.add(bF, GEO.scale(seg.v_ext, seg.grosorPx + buf));

  const ptsH = [hI1, hI2, hE2, hE1].map(p => GEO.add(p, [dx, dy]));
  out.push(`<polygon points="${ptsAttr(ptsH)}" fill="white" stroke="none" data-abertura-id="${ab.id}" cursor="pointer"/>`);
  
  if (onlyHueco) return;

  const eI = GEO.add(bI, GEO.scale(seg.v_ext, seg.grosorPx));
  const eF = GEO.add(bF, GEO.scale(seg.v_ext, seg.grosorPx));
  const [bIT, bFT, eIT, eFT] = ([bI, bF, eI, eF] as Point[]).map(p => GEO.add(p, [dx, dy]));

  if (ab.tipo === 'vano') {
    out.push(line(bIT, eIT, C.EXT, C.EXT_W * 2), line(bFT, eFT, C.EXT, C.EXT_W * 2));
  } else if (ab.tipo === 'ventana') {
    out.push(line(bIT, bFT, C.EXT, C.EXT_W * 1.5), line(eIT, eFT, C.EXT, C.EXT_W * 1.5));
    const lerp = (a: Point, b: Point, t: number) => GEO.add(a, GEO.scale(GEO.sub(b, a), t));
    
    if (ab.subtipo === 'corrediza') {
      const mid = lerp(bI, bF, 0.5);
      const mE = lerp(eI, eF, 0.5);
      const m1 = lerp(bI, eI, 0.35);
      const mE1 = lerp(mid, mE, 0.35);
      const mE2 = lerp(mid, mE, 0.65);
      const f2 = lerp(bF, eF, 0.65);
      
      out.push(line(GEO.add(m1, [dx, dy]), GEO.add(mE1, [dx, dy]), C.VENTANA, 1.2));
      out.push(line(GEO.add(mE2, [dx, dy]), GEO.add(f2, [dx, dy]), C.VENTANA, 1.2));
    } else {
      [1/3, 2/3].forEach(t => {
        out.push(line(GEO.add(lerp(bI, eI, t), [dx, dy]), GEO.add(lerp(bF, eF, t), [dx, dy]), C.VENTANA, 1.2));
      });
    }
  } else if (ab.tipo === 'puerta') {
    out.push(line(bIT, eIT, C.PUERTA, 1.4), line(bFT, eFT, C.PUERTA, 1.4));
    
    if (ab.subtipo === 'corrediza') {
      const offsetV = ab.lado === 'interior' ? seg.v_int : seg.v_ext;
      const m = GEO.add(bI, GEO.scale(GEO.sub(bF, bI), 0.5));
      const p1 = GEO.add(bI, GEO.scale(offsetV, 0.05));
      const m1 = GEO.add(m, GEO.scale(offsetV, 0.05));
      const p2 = GEO.add(bF, GEO.scale(offsetV, 0.15));
      const m2 = GEO.add(m, GEO.scale(offsetV, 0.15));
      out.push(line(GEO.add(p1, [dx, dy]), GEO.add(m1, [dx, dy]), C.PUERTA, 1.5));
      out.push(line(GEO.add(m2, [dx, dy]), GEO.add(p2, [dx, dy]), C.PUERTA, 1.5));
    } else {
      const vOpen = ab.lado === 'interior' ? seg.v_int : seg.v_ext;
      const drawHoja = (gozne: Point, hA: number) => {
        const pAb = GEO.add(gozne, GEO.scale(vOpen, hA));
        const [gT, pAbT] = [gozne, pAb].map(p => GEO.add(p, [dx, dy]));
        out.push(line(gT, pAbT, C.PUERTA, 1.0));
        const r = f(hA);
        out.push(`<circle cx="${f(gT[0])}" cy="${f(gT[1])}" r="${r}" fill="none" stroke="${C.PUERTA}" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.3"/>`);
      };

      if (ab.hojas === 2) {
        drawHoja(ab.lado === 'interior' ? bI : eI, aPx / 2);
        drawHoja(ab.lado === 'interior' ? bF : eF, aPx / 2);
      } else {
        if (ab.sentido === 'derecha') drawHoja(ab.lado === 'interior' ? bI : eI, aPx);
        else drawHoja(ab.lado === 'interior' ? bF : eF, aPx);
      }
    }
  }
}

export function renderCotas(out: string[], ambiente: Ambiente, segs: Segmento[], escala: number, dx: number, dy: number): void {
  const offPx = GEO.mToPx(C.COTA_OFF, escala);
  const arrPx = GEO.mToPx(C.COTA_ARR, escala);
  const marPx = GEO.mToPx(C.COTA_MAR, escala);
  const cotaSize = ambiente.cotaSize || C.COTA_SIZE_DEFAULT;

  for (const seg of segs) {
    const dist = seg.grosorPx + offPx;
    const cI = GEO.add(GEO.add(seg.inicio, GEO.scale(seg.v_ext, dist)), [dx, dy]);
    const cF = GEO.add(GEO.add(seg.fin, GEO.scale(seg.v_ext, dist)), [dx, dy]);
    
    out.push(line(cI, cF, C.COTA, 0.3));
    const diag = GEO.norm(GEO.add(GEO.norm(seg.dir), GEO.norm(seg.v_ext)));
    const diag2 = GEO.scale(diag, -1);
    [cI, cF].forEach(pt => out.push(line(GEO.add(pt, GEO.scale(diag, arrPx / 2)), GEO.add(pt, GEO.scale(diag2, arrPx / 2)), C.COTA, 0.4)));

    const mid: Point = [(cI[0] + cF[0]) / 2, (cI[1] + cF[1]) / 2];
    let ang = Math.atan2(seg.dir[1], seg.dir[0]) * 180 / Math.PI;
    
    const textOffset = cotaSize * 0.8;
    const tPos = (ang > 90 || ang < -90) 
      ? (ang += 180, GEO.add(mid, GEO.scale(seg.v_ext, -(marPx + textOffset))))
      : GEO.add(mid, GEO.scale(seg.v_ext, marPx + textOffset));

    const mLen = (GEO.len(GEO.sub(seg.fin, seg.inicio)) * escala / 1000).toFixed(2);
    out.push(txt(tPos, `${mLen} m`, ang, C.COTA, cotaSize));
  }
}

export function renderElemento(
  out: string[], 
  el: ElementoElectrico, 
  segs: Segmento[], 
  escala: number, 
  dx: number, 
  dy: number, 
  _exportMode: boolean,
  symbolsLib: DefinicionSimbolo[], 
  columnas?: ElementoEstructural[],
  conexiones?: any[]
): void {
  let [ex, ey] = getElementPos(el, segs, escala, dx, dy);

  if (el.columnaId && columnas) {
    const col = columnas.find(c => c.id === el.columnaId);
    if (col) {
      ex += GEO.mToPx(col.x, escala);
      ey += GEO.mToPx(col.y, escala);
    }
  }
  let angRot = 0;

  if (el.paredIdx !== null && el.paredIdx < segs.length) {
    const seg = segs[el.paredIdx];
    angRot = GEO.anguloSimboloPared(seg);
    if (el.lado === 'exterior') {
      const gPx = seg.grosorPx;
      ex += seg.v_ext[0] * gPx;
      ey += seg.v_ext[1] * gPx;
      angRot += 180;
    }
  }

  const k = GEO.mToPx(0.30, escala); // El símbolo representa ~30cm físicos
  const symDef = symbolsLib.find(s => s.id === el.tipo);
  
  out.push(`<g transform="translate(${f(ex)},${f(ey)}) rotate(${f(angRot)})" data-elec-id="${el.id}" style="cursor:pointer" color="${C.ELEC}">`);
  
  if (symDef) {
    const scaleFactor = k * symDef.escalaBase;
    out.push(`<g transform="scale(${f(scaleFactor)})" stroke-width="${f(0.9 / scaleFactor)}">`);
    out.push(symDef.svgContent);
    out.push('</g>');
  } else {
    out.push(`<circle cx="0" cy="0" r="${f(k * 0.4)}" fill="none" stroke="currentColor" stroke-width="0.8"/>`);
  }

  let labelText = el.referencia || '';

  if (conexiones) {
    const returnRefs = new Set<string>();
    conexiones.forEach(con => {
      const isFrom = con.from?.elementoId === el.id;
      const isTo = con.to?.elementoId === el.id;
      if (isFrom || isTo) {
        con.cables?.forEach((cab: any) => {
          if ((cab.tipo === 'retorno' || cab.tipo === 'comando') && cab.referencia) {
            returnRefs.add(cab.referencia);
          }
        });
      }
    });
    
    if (returnRefs.size > 0) {
      const additionalRefs = Array.from(returnRefs).join(',');
      if (labelText && !labelText.includes(additionalRefs)) {
        labelText += ',' + additionalRefs;
      } else if (!labelText) {
        labelText = additionalRefs;
      }
    }
  }

  if (labelText) {
    const fontSize = Math.max(k * 0.9, GEO.mToPx(0.15, escala));
    out.push(txt([k * 0.8, -k * 0.8], labelText, -angRot, C.ELEC, fontSize, 'start'));
  }
  out.push('</g>');
}

export function renderEscalera(out: string[], esc: Escalera, segs: Segmento[], escala: number, dx: number, dy: number): void {
  const seg = esc.paredIdx !== null ? segs[esc.paredIdx] : null;
  let bI: Point = [0, 0];
  let vDir: Point = [1, 0];
  let vLat: Point = [0, 1];

  if (seg) {
    const posPx = GEO.mToPx(esc.posicion, escala);
    bI = GEO.add(seg.inicio, GEO.scale(seg.dir, posPx));
    vDir = seg.v_int;
    vLat = seg.dir;
  }

  const anchoPx = GEO.mToPx(esc.ancho, escala);
  const largo1Px = GEO.mToPx(esc.largo1, escala);
  const largo2Px = esc.largo2 ? GEO.mToPx(esc.largo2, escala) : 0;
  
  const drawTreadLines = (start: Point, vD: Point, vL: Point, lPx: number, wPx: number, steps: number) => {
    const stepSize = lPx / steps;
    for(let i=1; i<steps; i++) {
      const p1 = GEO.add(start, GEO.scale(vD, i * stepSize));
      const p2 = GEO.add(p1, GEO.scale(vL, wPx));
      out.push(line(GEO.add(p1, [dx, dy]), GEO.add(p2, [dx, dy]), '#888', 0.5));
    }
  };

  const drawArrow = (start: Point, end: Point, label: string) => {
    const sT = GEO.add(start, [dx, dy]);
    const eT = GEO.add(end, [dx, dy]);
    out.push(line(sT, eT, '#555', 0.8));
    out.push(`<circle cx="${f(sT[0])}" cy="${f(sT[1])}" r="1.5" fill="#555"/>`);
    const ang = Math.atan2(end[1]-start[1], end[0]-start[0]) * 180 / Math.PI;
    out.push(txt(eT, label, ang, '#555', 3, 'start'));
  };

  if (esc.forma === 'recta') {
    const p1 = bI;
    const p2 = GEO.add(p1, GEO.scale(vLat, anchoPx));
    const p3 = GEO.add(p2, GEO.scale(vDir, largo1Px));
    const p4 = GEO.add(p1, GEO.scale(vDir, largo1Px));
    const pts = [p1, p2, p3, p4].map(p => GEO.add(p, [dx, dy]));
    out.push(`<polygon points="${ptsAttr(pts)}" fill="none" stroke="#666" stroke-width="0.8"/>`);
    
    drawTreadLines(p1, vDir, vLat, largo1Px, anchoPx, Math.max(2, Math.floor(esc.largo1 / 0.28)));
    
    const midStart = GEO.add(p1, GEO.scale(vLat, anchoPx/2));
    const midEnd = GEO.add(midStart, GEO.scale(vDir, largo1Px));
    drawArrow(midStart, midEnd, esc.sentido.toUpperCase());
  } else if (esc.forma.startsWith('L_') || esc.forma.startsWith('U_')) {
    const isDer = esc.forma.endsWith('_der');
    const isU = esc.forma.startsWith('U_');
    const vLat2 = isDer ? vDir : GEO.scale(vDir, -1);
    const vDir2 = isDer ? GEO.scale(vLat, -1) : vLat;
    
    // Tramo 1
    const p1 = bI;
    const p2 = GEO.add(p1, GEO.scale(vLat, anchoPx));
    const p3 = GEO.add(p2, GEO.scale(vDir, largo1Px));
    const p4 = GEO.add(p1, GEO.scale(vDir, largo1Px));
    
    // Descanso
    const d1 = p4;
    const d2 = p3;
    const d3 = GEO.add(d2, GEO.scale(vDir, anchoPx));
    const d4 = GEO.add(d1, GEO.scale(vDir, anchoPx));

    // Tramo 2
    const t2_start = isDer ? d3 : d4;
    const p5 = GEO.add(t2_start, GEO.scale(vDir2, largo2Px));
    const p6 = GEO.add(p5, GEO.scale(isDer ? GEO.scale(vLat2, -1) : vLat2, anchoPx));
    const p7 = isDer ? d2 : d1; // inner corner

    const pts1 = [p1, p2, p3, p4].map(p => GEO.add(p, [dx, dy]));
    const ptsD = [d1, d2, d3, d4].map(p => GEO.add(p, [dx, dy]));
    const pts2 = [t2_start, p5, p6, p7].map(p => GEO.add(p, [dx, dy]));

    out.push(`<polygon points="${ptsAttr(pts1)}" fill="none" stroke="#666" stroke-width="0.8"/>`);
    out.push(`<polygon points="${ptsAttr(ptsD)}" fill="none" stroke="#666" stroke-width="0.8"/>`);
    out.push(`<polygon points="${ptsAttr(pts2)}" fill="none" stroke="#666" stroke-width="0.8"/>`);
    
    drawTreadLines(p1, vDir, vLat, largo1Px, anchoPx, Math.max(2, Math.floor(esc.largo1 / 0.28)));
    drawTreadLines(t2_start, vDir2, isDer ? GEO.scale(vLat2, -1) : vLat2, largo2Px, anchoPx, Math.max(2, Math.floor((esc.largo2 || 1) / 0.28)));
    
    // Flecha
    const midStart = GEO.add(p1, GEO.scale(vLat, anchoPx/2));
    const mid1 = GEO.add(midStart, GEO.scale(vDir, largo1Px + anchoPx/2));
    const midEnd = GEO.add(mid1, GEO.scale(vDir2, largo2Px));
    
    const [msT, m1T, meT] = [midStart, mid1, midEnd].map(p => GEO.add(p, [dx, dy]));
    out.push(line(msT, m1T, '#555', 0.8));
    out.push(line(m1T, meT, '#555', 0.8));
    out.push(`<circle cx="${f(msT[0])}" cy="${f(msT[1])}" r="1.5" fill="#555"/>`);
    const ang = Math.atan2(meT[1]-m1T[1], meT[0]-m1T[0]) * 180 / Math.PI;
    out.push(txt(meT, esc.sentido.toUpperCase(), ang, '#555', 3, 'start'));

    if (isU) {
       // Tramo 3 not implemented for simplicity, but could be added similar to tramo 2
    }
  } else if (esc.forma === 'caracol') {
    const rPx = GEO.mToPx(esc.radio || 1.0, escala);
    const cT = GEO.add(GEO.add(bI, GEO.scale(vLat, rPx)), [dx, dy]);
    out.push(`<circle cx="${f(cT[0])}" cy="${f(cT[1])}" r="${f(rPx)}" fill="none" stroke="#666" stroke-width="0.8"/>`);
    out.push(`<circle cx="${f(cT[0])}" cy="${f(cT[1])}" r="${f(rPx*0.1)}" fill="none" stroke="#666" stroke-width="0.8"/>`);
    // Líneas radiales simuladas
    for(let i=0; i<12; i++) {
      const a = i * Math.PI / 6;
      const p1 = [cT[0] + rPx*0.1*Math.cos(a), cT[1] + rPx*0.1*Math.sin(a)] as Point;
      const p2 = [cT[0] + rPx*Math.cos(a), cT[1] + rPx*Math.sin(a)] as Point;
      out.push(line(p1, p2, '#888', 0.5));
    }
    out.push(txt(cT, esc.sentido.toUpperCase(), 0, '#555', 3, 'middle'));
  }
}
