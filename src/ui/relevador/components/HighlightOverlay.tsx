import React, { useMemo } from 'react';
import type { Ambiente, Project, SelectedElement } from '../../../types/index';
import { RENDERER } from '../../../lib/renderer';
import { getElementPos } from '../../../lib/renderer/utils';
import * as GEO from '../../../lib/geometry';

interface HighlightOverlayProps {
  selectedElement: SelectedElement | null;
  ambiente: Ambiente;
  meta: Project | import('../../../types/index').Meta;
  zoom: number;
  pan: { x: number; y: number };
}

export const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  selectedElement,
  ambiente,
  meta,
  zoom,
  pan
}) => {
  const overlaySvg = useMemo(() => {
    if (!selectedElement) return null;

    const { allSegs: segs } = RENDERER.buildSegs(ambiente, meta);
    const { dx, dy } = RENDERER.getLayout(ambiente, meta);
    const escala = meta.escala;

    const out: string[] = [];

    if (selectedElement.type === 'pared') {
      const seg = segs.find(s => s.originalIndex === selectedElement.idx);
      if (seg) {
        const p1 = GEO.add(seg.inicio, [dx, dy]);
        const p2 = GEO.add(seg.fin, [dx, dy]);
        out.push(`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="var(--acc)" stroke-opacity="0.8" stroke-width="${seg.grosorPx + 14}" stroke-linecap="round" style="animation: highlight-pulse 1.5s infinite" />`);
      }
    } else if (selectedElement.type === 'abertura') {
      const ab = ambiente.aberturas.find(a => a.id === selectedElement.id);
      if (ab) {
        const seg = segs[ab.pared];
        if (seg) {
          const posPx = GEO.mToPx(ab.posicion, escala);
          const aPx = GEO.mToPx(ab.ancho, escala);
          const bI = GEO.add(seg.inicio, GEO.scale(seg.dir, posPx));
          const bF = GEO.add(bI, GEO.scale(seg.dir, aPx));
          
          const buf = 2; // Un poco más grande para que se note
          const hI1 = GEO.add(bI, GEO.scale(seg.v_int, buf));
          const hI2 = GEO.add(bF, GEO.scale(seg.v_int, buf));
          const hE1 = GEO.add(bI, GEO.scale(seg.v_ext, seg.grosorPx + buf));
          const hE2 = GEO.add(bF, GEO.scale(seg.v_ext, seg.grosorPx + buf));

          const ptsAttr = (pts: GEO.Point[]) => pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
          const pts = [hI1, hI2, hE2, hE1].map(p => GEO.add(p, [dx, dy]));
          
          out.push(`<polygon points="${ptsAttr(pts)}" fill="none" stroke="var(--acc)" stroke-width="3" style="animation: highlight-pulse 1.5s infinite" />`);
        }
      }
    } else if (selectedElement.type === 'elemento') {
      const el = ambiente.elementos.find(e => e.id === selectedElement.id);
      if (el) {
        const pos = getElementPos(el, segs, escala, dx, dy);
        out.push(`<circle cx="${pos[0].toFixed(1)}" cy="${pos[1].toFixed(1)}" r="14" fill="var(--acc)" fill-opacity="0.2" stroke="var(--acc)" stroke-width="2" style="animation: highlight-pulse 1s infinite" />`);
      }
    }

    return out.join('');
  }, [selectedElement, ambiente, meta]);

  if (!selectedElement || !overlaySvg) return null;

  const { pageW, pageH } = RENDERER.getLayout(ambiente, meta);

  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Muy importante para no bloquear clicks al plano real
        overflow: 'hidden'
      }}
    >
      <div 
        style={{
          position: 'absolute',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <svg 
          width={`${pageW}mm`}
          height={`${pageH}mm`}
          viewBox={`0 0 ${pageW} ${pageH}`} 
          preserveAspectRatio="xMidYMid meet"
          dangerouslySetInnerHTML={{ __html: overlaySvg }} 
        />
      </div>
    </div>
  );
};
