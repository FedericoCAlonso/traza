// ═══════════════════════════════════════════════════════════════════════════
// MODULE: components/Preview.tsx
// El plano reacciona según la tab activa del editor:
//   - 'electrico'  → insertar símbolo eléctrico (cursor crosshair)
//   - 'aberturas'  → snap a pared más cercana y crear abertura (cursor pointer sobre paredes)
//   - otras tabs   → plano de solo lectura (cursor default)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { useZoomPan } from '../../../hooks/useZoomPan';
import { useEditorTab } from '../../../core/EditorTabContext';

import { RENDERER } from '../../../lib/renderer';
import * as GEO from '../../../lib/geometry';

import type { Ambiente, Project, Meta, EditorTab, SelectedElement } from '../../../types/index';
import type { DefinicionSimbolo } from '../../../lib/symbols';

interface PreviewProps {
  project: Project;
  ambiente: Ambiente;
  meta: Meta;
  symbolsLib: DefinicionSimbolo[];
  onCanvasClick: (rawX: number, rawY: number, snapIdx?: number, snapPos?: number, clickedId?: string, snapLado?: 'interior' | 'exterior') => void;
  creationFlow?: { active: boolean; step: string; anchor: any; offsetX: number; offsetY: number };
  selectedElement?: SelectedElement;
  onSelectElement?: (el: SelectedElement) => void;
  campaniaActivaId?: string | null;
}

/** Cursor del área del plano según el tab activo */
const CURSOR_BY_TAB: Record<EditorTab, string> = {
  resumen:    'default',
  general:    'default',
  hoja:       'default',
  paredes:    'default',
  aberturas:  'crosshair',
  electrico:  'crosshair',
  circuitos:  'default',
  conexiones: 'default',
  mediciones: 'default',
  maestro:    'default',
  cobertura:  'default',
  escaleras:  'default',
};

/** Texto de ayuda en el toolbar según el tab activo */
const HINT_BY_TAB: Record<EditorTab, string> = {
  resumen:   '— Solo lectura —',
  general:   '— Solo lectura —',
  hoja:      '— Solo lectura —',
  paredes:   '— Solo lectura —',
  aberturas: 'Tap: abertura · Arrastre: mover · Pellizco: zoom',
  electrico: 'Tap: insertar · Arrastre: mover · Pellizco: zoom',
  circuitos: '— Solo lectura —',
  conexiones:'Tap: conectar bocas · Arrastre: mover · Pellizco: zoom',
  mediciones:'Tap: registrar medición en boca/tablero · Arrastre: mover · Pellizco: zoom',
  maestro:   '— Plano Maestro —',
  cobertura: '— Solo lectura —',
  escaleras: '— Solo lectura —',
};

/** Tabs que permiten interacción táctil de selección/inserción */
const INTERACTIVE_TABS: EditorTab[] = ['electrico', 'aberturas', 'paredes', 'circuitos', 'conexiones', 'mediciones'];

/**
 * Busca el elemento SVG más cercano con el atributo dado,
 * dentro de un radio en píxeles alrededor del punto (cx, cy).
 * Usa elementsFromPoint en una cuadrícula de puntos para simular hit-testing expandido.
 */
function findNearestSVGAttr(cx: number, cy: number, attr: string, radius = 20): string | null {
  const step = 6;
  for (let dy = -radius; dy <= radius; dy += step) {
    for (let dx = -radius; dx <= radius; dx += step) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const els = document.elementsFromPoint(cx + dx, cy + dy);
      for (const el of els) {
        const found = (el as HTMLElement).closest?.(`[${attr}]`);
        if (found) {
          return found.getAttribute(attr);
        }
      }
    }
  }
  return null;
}

export function Preview(props: PreviewProps) {
  const { 
    project, ambiente, meta, symbolsLib, onCanvasClick, 
    creationFlow, selectedElement, onSelectElement, campaniaActivaId 
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoom, pan, resetZoom, zoomIn, zoomOut, wasTouchDrag } = useZoomPan(containerRef);
  const { activeTab } = useEditorTab();
  const isTouchDevice = useMemo(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0), []);

  const [toastVisible, setToastVisible] = useState(false);

  const isInteractive = INTERACTIVE_TABS.includes(activeTab);

  useEffect(() => {
    if (activeTab === 'electrico' || activeTab === 'aberturas') {
      setToastVisible(true);
      const t = setTimeout(() => setToastVisible(false), 3500);
      return () => clearTimeout(t);
    } else {
      setToastVisible(false);
    }
  }, [activeTab]);

  /**
   * Genera el string SVG. Memorizado para evitar re-renderizados pesados.
   */
  const svgContent = useMemo(() => {
    try {
      if (!ambiente || !meta) return '';
      if (activeTab === 'maestro') {
        return RENDERER.renderMaster(project, symbolsLib);
      }
      return RENDERER.render(ambiente, meta, symbolsLib, false, project, selectedElement, campaniaActivaId);
    } catch (err) {
      return '__ERROR__:' + (err as Error).stack;
    }
  }, [ambiente, meta, symbolsLib, activeTab, project, selectedElement, campaniaActivaId]);

  if (svgContent.startsWith('__ERROR__:')) {
    return (
      <div className="preview-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', background: '#fff' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <strong>⚠️ Error en el motor de dibujo</strong><br/>
          <small>Los datos de geometría contienen valores inválidos.</small>
          <pre style={{ textAlign: 'left', marginTop: 10, fontSize: 10, color: '#333' }}>
            {svgContent.substring(10)}
          </pre>
        </div>
      </div>
    );
  }

  /**
   * Maneja el clic en el área del plano.
   * Convierte coordenadas de pantalla → coordenadas del plano técnico
   * y delega al handler unificado de App con toda la info necesaria.
   * En dispositivos táctiles, usa hit-testing expandido para elementos pequeños.
   */
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!ambiente || !meta || !containerRef.current) return;

    // Suprimir click sintético que React dispara tras un arrastre táctil
    if (wasTouchDrag.current) {
      wasTouchDrag.current = false;
      return;
    }

    let target = e.target as HTMLElement;
    const isTouchClick = (e.nativeEvent as PointerEvent).pointerType === 'touch' || 
                         target.classList.contains('touch-overlay') || 
                         isTouchDevice;

    if (target.classList.contains('touch-overlay')) {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      target = (elements.find(el => el !== target) || target) as HTMLElement;
    }

    // 1. Lógica de selección (independiente de la inserción)
    if (onSelectElement) {
      let elecId: string | null = null;
      let aberturaId: string | null = null;
      let paredIdx: string | null = null;

      if (isTouchClick) {
        // Touch: hit-testing expandido buscando en radio de 22px para dedos
        elecId = findNearestSVGAttr(e.clientX, e.clientY, 'data-elec-id', 22);
        aberturaId = findNearestSVGAttr(e.clientX, e.clientY, 'data-abertura-id', 22);
        paredIdx = findNearestSVGAttr(e.clientX, e.clientY, 'data-pared-idx', 22);
      } else {
        // Mouse: selección exacta (comportamiento original)
        elecId = (target.closest('[data-elec-id]') as HTMLElement)?.getAttribute('data-elec-id') ?? null;
        aberturaId = (target.closest('[data-abertura-id]') as HTMLElement)?.getAttribute('data-abertura-id') ?? null;
        paredIdx = (target.closest('[data-pared-idx]') as HTMLElement)?.getAttribute('data-pared-idx') ?? null;
      }

      if (elecId && (activeTab === 'electrico' || activeTab === 'circuitos' || activeTab === 'conexiones')) {
        onSelectElement({ type: 'elemento', id: elecId });
        // En conexiones no retornamos temprano porque necesitamos gatillar el flujo de conexión en handleCanvasClick
        if (activeTab !== 'conexiones') {
          return;
        }
      } else if (aberturaId && activeTab === 'aberturas') {
        onSelectElement({ type: 'abertura', id: aberturaId });
        return;
      } else if (paredIdx && activeTab === 'paredes') {
        onSelectElement({ type: 'pared', idx: parseInt(paredIdx, 10) });
        return;
      } else if (activeTab === 'paredes' || activeTab === 'aberturas' || activeTab === 'electrico') {
        // Clic en el vacío: limpiar selección
        onSelectElement(null);
      }
    }

    // Tabs que no interactúan con el plano para inserción
    if (activeTab === 'general' || activeTab === 'hoja' || activeTab === 'paredes') return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Coordenadas en el espacio del plano (con zoom y pan)
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;

    const { dx, dy } = RENDERER.getBboxOffset(ambiente, meta);
    const px = rawX - dx;
    const py = rawY - dy;

    // Convertimos de unidades de dibujo (mm papel) a metros reales
    const pxM = GEO.pxToM(px, meta.escala);
    const pyM = GEO.pxToM(py, meta.escala);

    // ¿Se hizo click sobre un símbolo eléctrico existente? (hit-testing expandido en touch)
    let clickedElecId: string | undefined;
    if (isTouchClick) {
      clickedElecId = findNearestSVGAttr(e.clientX, e.clientY, 'data-elec-id', 22) ?? undefined;
    } else {
      clickedElecId = (target.closest('[data-elec-id]') as HTMLElement)?.getAttribute('data-elec-id') ?? undefined;
    }

    // Snap a la pared más cercana (útil tanto para eléctrico como aberturas)
    const { allSegs: segs } = RENDERER.buildSegs(ambiente, meta);
    const snap = GEO.snapAPared(px, py, segs);

    onCanvasClick(
      pxM,
      pyM,
      snap.segIdx !== -1 ? snap.segIdx : undefined,
      GEO.pxToM(snap.pos, meta.escala),
      clickedElecId,
      snap.segIdx !== -1 ? snap.lado : undefined
    );
  }, [ambiente, meta, activeTab, pan, zoom, onCanvasClick, onSelectElement, wasTouchDrag, isTouchDevice]);

  /** Información técnica de la geometría actual */
  const status = useMemo(() => {
    if (!ambiente) return null;
    const { chains, allSegs: segs } = RENDERER.buildSegs(ambiente, meta);
    const allClosed = chains.length > 0 && chains.every(c => c.cerrado);
    return { 
      paredes: segs.length, 
      cerrado: allClosed 
    };
  }, [ambiente, meta]);

  return (
    <div className="panel-right">
      <div className="preview-toolbar">
        <span className="toolbar-label">
          VISTA PREVIA · {ambiente?.nombre || '—'}
        </span>
        <div className="toolbar-spacer" />
        
        {status && (
          <div className="status-group">
            <span className="status-tag">{status.paredes} paredes</span>
            <span className={`status-tag ${status.cerrado ? 'ok' : 'warn'}`}>
              {status.cerrado ? '✓ Perímetro Cerrado' : '⚠ Perímetro Abierto'}
            </span>
          </div>
        )}
        
        <span className={`toolbar-help ${isInteractive ? 'active' : ''}`}>
          {HINT_BY_TAB[activeTab]}
        </span>
      </div>

      <div 
        className="preview-area" 
        ref={containerRef} 
        onClick={handleClick}
        style={{ 
          overflow: 'hidden', 
          position: 'relative', 
          cursor: CURSOR_BY_TAB[activeTab]
        }}
      >
        {/* Capa transparente estática para capturar gestos táctiles y evitar bug de transformación en WebKit */}
        <div
          className="touch-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 4,
            pointerEvents: isTouchDevice ? 'auto' : 'none',
            background: 'transparent',
            touchAction: 'none'
          }}
        />
        {svgContent ? (
          <div
            className="svg-container"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              position: 'absolute',
              touchAction: 'none',
              userSelect: 'none',
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="empty-overlay">
            <div className="empty-msg">
              Seleccioná un proyecto<br/>
              para visualizar la hoja
            </div>
          </div>
        )}

        {/* Marcador Paso B de creación */}
        {creationFlow?.active && creationFlow.step === 'B' && creationFlow.anchor && (
          <div 
            style={{
              position: 'absolute',
              left: pan.x + (RENDERER.getBboxOffset(ambiente, meta).dx + GEO.mToPx(creationFlow.anchor.x + creationFlow.offsetX, meta.escala)) * zoom,
              top: pan.y + (RENDERER.getBboxOffset(ambiente, meta).dy + GEO.mToPx(creationFlow.anchor.y + creationFlow.offsetY, meta.escala)) * zoom,
              pointerEvents: 'none',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="4" fill="none" stroke="var(--acc)" strokeWidth="1" strokeDasharray="2,2" />
              <line x1="0" y1="10" x2="20" y2="10" stroke="var(--acc)" strokeWidth="1" />
              <line x1="10" y1="0" x2="10" y2="20" stroke="var(--acc)" strokeWidth="1" />
            </svg>
          </div>
        )}

        {/* Toast Helper */}
        {toastVisible && (
          <div className="preview-mode-badge" style={{ animation: 'fadeDown 0.3s cubic-bezier(0.1, 0.9, 0.2, 1)' }}>
            {activeTab === 'electrico' ? '⚡ Tocá el plano para insertar' : 
             activeTab === 'aberturas' ? '🚪 Tocá una pared' : ''}
          </div>
        )}

        {/* Controles de Zoom */}
        <div className="zoom-controls" onClick={(e) => e.stopPropagation()}>
          <button className="zoom-btn" onClick={zoomIn} title="Aumentar">+</button>
          <button className="zoom-btn" onClick={zoomOut} title="Reducir">−</button>
          <button className="zoom-btn" onClick={resetZoom} title="Ajustar">↺</button>
        </div>

        <div className="preview-hint">Zoom: {Math.round(zoom * 100)}%</div>

      </div>
    </div>
  );
}