// ═══════════════════════════════════════════════════════════════════════════
// MODULE: renderer/renderLocal.ts
// Funciones de renderizado para un ambiente individual (editor local).
// ═══════════════════════════════════════════════════════════════════════════
import * as GEO from '../geometry';
import type { Point } from '../geometry';
import type { Ambiente, Meta, Project } from '../../types/index';
import type { DefinicionSimbolo } from '../symbols';
import type { LayoutConfig } from '../layout';
import { C } from './constants';
import { ptsAttr, txt, line, getElementPos } from './utils';
import { buildSegs } from '../geometry';
import { getLayout } from './layout';
import { renderAbertura, renderCobertura, renderCotas, renderElemento, renderElementoEstructural, renderIrregularidad, renderEscalera } from './components';
import { renderConexiones } from './connections';

/**
 * Detecta si un extremo de pared (definido por su eje y grosor) se superpone
 * geométricamente con la banda de muro de otro segmento.
 * Se usa para suprimir los capuchones de cierre en ramas que terminan dentro de otra pared.
 */
function extremoDentroDeOtroPared(
  pt: Point,
  seg: GEO.Segmento,
  allSegs: GEO.Segmento[],
  tolerance = 2.0
): boolean {
  for (const other of allSegs) {
    if (other === seg) continue;
    const v = GEO.sub(other.fin, other.inicio);
    const vLen = GEO.len(v);
    if (vLen < 1e-6) continue;
    const vN = GEO.scale(v, 1 / vLen);
    const w = GEO.sub(pt, other.inicio);
    const t = GEO.dot(w, vN);
    // El punto debe proyectar dentro del segmento (con tolerancia)
    if (t < -tolerance || t > vLen + tolerance) continue;
    const proj = GEO.add(other.inicio, GEO.scale(vN, t));
    // Distancia al eje del otro segmento
    const distEje = GEO.dist(pt, proj);
    // Distancia al extremo exterior del otro segmento
    const caraExt = GEO.add(proj, GEO.scale(other.v_ext, other.grosorPx));
    const distExt = GEO.dist(pt, caraExt);
    // El punto está dentro de la banda de muro si su dist al eje < grosor + tolerancia
    if (distEje < other.grosorPx + tolerance && distExt < other.grosorPx + tolerance) {
      return true;
    }
  }
  return false;
}

export function render(ambiente: Ambiente, meta: Meta, symbolsLib: DefinicionSimbolo[], exportMode = false, project?: Project, selectedElement?: import('../../types/index').SelectedElement | null): string {
  const { chains, allSegs: segs } = buildSegs(ambiente, meta);
  const { dx, dy, pageW, pageH, margin } = getLayout(ambiente, meta);
  const conf = ambiente.configHoja || { formato: 'A4', orientacion: 'horizontal' };
  
  const out: string[] = [];
  
  if (!segs.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}" style="touch-action: none;">
      <rect width="100%" height="100%" fill="white" pointer-events="none"/>
      <rect x="${margin}" y="${margin}" width="${pageW - 2 * margin}" height="${pageH - 2 * margin}" fill="none" stroke="#ccc" stroke-width="0.5" pointer-events="none"/>
    </svg>`;
  }

  // 1. Polígono de fondo (piso) - solo para cadenas cerradas
  chains.forEach(c => {
    if (c.cerrado) {
      out.push(`<polygon points="${ptsAttr(c.segs.map(s => GEO.add(s.inicio, [dx, dy])))}" fill="${C.INT_FILL}" stroke="none"/>`);
    }
  });

  // 2. Muros principales
  chains.forEach(c => {
    const { ext, int } = GEO.poligonoMuro(c.segs, c.cerrado);
    const extT = ext.map(p => GEO.add(p as Point, [dx, dy]));
    const intT = int.map(p => GEO.add(p as Point, [dx, dy]));
    
    out.push(`<polygon points="${ptsAttr([...extT, ...([...intT].reverse())])}" fill="${C.PARED_FILL}" stroke="none"/>`);
    
    for (let i = 0; i < extT.length - 1; i++) out.push(line(extT[i], extT[i+1], C.EXT, C.EXT_W));
    for (let i = 0; i < intT.length - 1; i++) out.push(line(intT[i], intT[i+1], C.INT, C.INT_W));

    if (!c.cerrado && c.segs.length > 0) {
      const firstSeg = c.segs[0];
      const lastSeg = c.segs[c.segs.length - 1];
      const isBranch = firstSeg.pared?.refParedIdx !== undefined;

      // Capuchón de inicio: solo si no es rama Y el inicio no está dentro de otra pared
      if (!isBranch && !extremoDentroDeOtroPared(firstSeg.inicio, firstSeg, segs)) {
        out.push(line(extT[0], intT[0], C.EXT, C.EXT_W));
      }

      // Capuchón de fin: solo si el extremo final no está dentro de otra pared
      if (!extremoDentroDeOtroPared(lastSeg.fin, lastSeg, segs)) {
        out.push(line(extT[extT.length - 1], intT[intT.length - 1], C.EXT, C.EXT_W));
      }
    }

    // Hitbox invisible por cada segmento para poder seleccionarlo individualmente
    c.segs.forEach(s => {
      if (s.originalIndex !== undefined) {
        // Línea gruesa invisible centrada en el segmento
        const p1 = GEO.add(s.inicio, [dx, dy]);
        const p2 = GEO.add(s.fin, [dx, dy]);
        out.push(`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="black" stroke-opacity="0.01" stroke-width="${s.grosorPx + 10}" cursor="pointer" pointer-events="stroke" data-pared-idx="${s.originalIndex}" />`);
      }
    });
  });

  // 3. Irregularidades
  segs.forEach(seg => {
    if (seg.pared) {
      seg.pared.irregularidades?.forEach((irr: any) => {
        renderIrregularidad(out, seg, irr, meta.escala, dx, dy);
      });
    }
  });

  // 4. Aberturas y Cotas
  ambiente.aberturas?.forEach(ab => renderAbertura(out, ab, segs, meta.escala, dx, dy));
  if (ambiente.mostrar_cotas) renderCotas(out, ambiente, segs, meta.escala, dx, dy);

  // 4.5 Conexiones
  if (project) {
    renderConexiones(out, ambiente, project, segs, meta.escala, dx, dy);
  }

  // 5. Coberturas
  (ambiente.coberturas || []).forEach(cob => {
    renderCobertura(out, cob, meta.escala, dx, dy);
  });

  // 6. Elementos Estructurales
  (ambiente.elementosEstructurales || []).forEach(ee => {
    renderElementoEstructural(out, ee, meta.escala, dx, dy);
  });

  // 6.5 Escaleras
  (ambiente.escaleras || []).forEach(esc => {
    renderEscalera(out, esc, segs, meta.escala, dx, dy);
  });

  // 7. Elementos Eléctricos
  ambiente.elementos?.forEach(el => {
    renderElemento(out, el, segs, meta.escala, dx, dy, exportMode, symbolsLib, ambiente.elementosEstructurales, project?.conexiones);
  });

  // 8. Textos libres
  ambiente.textos?.forEach((t) => {
    out.push(txt([GEO.mToPx(t.x, meta.escala) + dx, GEO.mToPx(t.y, meta.escala) + dy], t.texto, 0, '#333', t.tamano, 'middle'));
  });

  // ─── ELEMENTOS DE HOJA (MARGEN Y RÓTULO) ───
  const layout = (window as unknown as { layoutConfig?: LayoutConfig }).layoutConfig;
  
  out.push(`<rect x="${margin}" y="${margin}" width="${pageW - 2 * margin}" height="${pageH - 2 * margin}" fill="none" stroke="black" stroke-width="0.5"/>`);
  
  if (layout?.titleBlock) {
    const { width: rW, height: rH, elements } = layout.titleBlock;
    const rX = pageW - margin - rW;
    const rY = pageH - margin - rH;

    out.push(`<g transform="translate(${rX},${rY})">`);
    elements.forEach(e => {
      if (e.type === 'rect') {
        out.push(`<rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" fill="${e.fill || 'none'}" stroke="${e.stroke || 'black'}" stroke-width="${e.strokeWidth || 0.5}"/>`);
      } else if (e.type === 'line') {
        out.push(`<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${e.stroke || 'black'}" stroke-width="${e.strokeWidth || 0.5}"/>`);
      } else if (e.type === 'text') {
        let content = e.text || '';
        content = content.replace('{PROJECT_NAME}', (meta.nombre || '').toUpperCase())
                        .replace('{AMBIENTE_NAME}', ambiente.nombre.toUpperCase())
                        .replace('{SCALE}', meta.escala.toString())
                        .replace('{FORMAT}', conf.formato)
                        .replace('{ORIENTATION}', conf.orientacion.toUpperCase());
        
        out.push(txt([e.x || 0, e.y || 0], content, 0, e.fill || 'black', e.fontSize || 3, e.anchor || 'start'));
      }
    });
    out.push('</g>');
  }

  const widthAttr = exportMode ? `${pageW}mm` : `${pageW}`;
  const heightAttr = exportMode ? `${pageH}mm` : `${pageH}`;

  if (selectedElement) {
    if (selectedElement.type === 'pared') {
      const seg = segs.find(s => s.originalIndex === selectedElement.idx);
      if (seg) {
        const p1 = GEO.add(seg.inicio, [dx, dy]);
        const p2 = GEO.add(seg.fin, [dx, dy]);
        out.push(`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#FF9800" stroke-opacity="0.8" stroke-width="${seg.grosorPx + 14}" stroke-linecap="round" style="animation: highlight-pulse 1.5s infinite" />`);
      }
    } else if (selectedElement.type === 'abertura') {
      const ab = ambiente.aberturas?.find(a => a.id === selectedElement.id);
      if (ab) {
        const seg = segs.find(s => s.originalIndex === ab.pared);
        if (seg) {
          const posPx = GEO.mToPx(ab.posicion, meta.escala);
          const aPx = GEO.mToPx(ab.ancho, meta.escala);
          const bI = GEO.add(seg.inicio, GEO.scale(seg.dir, posPx));
          const bF = GEO.add(bI, GEO.scale(seg.dir, aPx));
          
          const buf = 2; // Un poco más grande para que se note
          const hI1 = GEO.add(bI, GEO.scale(seg.v_int, buf));
          const hI2 = GEO.add(bF, GEO.scale(seg.v_int, buf));
          const hE1 = GEO.add(bI, GEO.scale(seg.v_ext, seg.grosorPx + buf));
          const hE2 = GEO.add(bF, GEO.scale(seg.v_ext, seg.grosorPx + buf));

          const ptsAttr = (pts: GEO.Point[]) => pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
          const pts = [hI1, hI2, hE2, hE1].map(p => GEO.add(p, [dx, dy]));
          out.push(`<polygon points="${ptsAttr(pts as GEO.Point[])}" fill="none" stroke="var(--acc)" stroke-width="3" style="animation: highlight-pulse 1.5s infinite" />`);
        }
      }
    } else if (selectedElement.type === 'elemento') {
      const el = ambiente.elementos?.find(e => e.id === selectedElement.id);
      if (el) {
        const pos = getElementPos(el, segs, meta.escala, dx, dy);
        out.push(`<circle cx="${pos[0].toFixed(1)}" cy="${pos[1].toFixed(1)}" r="14" fill="var(--acc)" fill-opacity="0.2" stroke="var(--acc)" stroke-width="2" style="animation: highlight-pulse 1s infinite" />`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthAttr}" height="${heightAttr}" viewBox="0 0 ${pageW} ${pageH}" style="touch-action: none;">
    <defs>
      <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(0,0,0,0.3)" stroke-width="1" />
      </pattern>
      <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="white" pointer-events="none"/>
    ${out.join('\n')}
  </svg>`;
}

export function renderHoja(ambiente: Ambiente, meta: Meta, symbolsLib: DefinicionSimbolo[]): string {
  const { chains, allSegs: segs } = buildSegs(ambiente, meta);
  if (!segs.length) return '';

  const out: string[] = [];
  const escala = meta.escala;

  chains.forEach(c => {
    if (c.cerrado) {
      const { int } = GEO.poligonoMuro(c.segs, true);
      out.push(`<polygon points="${int.map(p => p.join(',')).join(' ')}" fill="${C.INT_FILL}"/>`);
    }
  });

  chains.forEach(c => {
    const { ext, int } = GEO.poligonoMuro(c.segs, c.cerrado);
    out.push(`<polygon points="${ext.map(p => p.join(',')).join(' ')}" fill="${C.PARED_FILL}" stroke="${C.EXT}" stroke-width="0.5"/>`);
    out.push(`<polyline points="${int.map(p => p.join(',')).join(' ')}" fill="none" stroke="${C.INT}" stroke-width="0.2"/>`);
  });

  ambiente.aberturas?.forEach(ab => {
    renderAbertura(out, ab, segs, escala, 0, 0);
  });

  ambiente.elementos?.forEach(el => {
    renderElemento(out, el, segs, escala, 0, 0, false, symbolsLib, ambiente.elementosEstructurales);
  });

  (ambiente.textos || []).forEach(t => {
    const tx = GEO.mToPx(t.x, escala);
    const ty = GEO.mToPx(t.y, escala);
    out.push(txt([tx, ty], t.texto, 0, '#333', t.tamano || 3.5, 'middle'));
  });

  return out.join('\n');
}
