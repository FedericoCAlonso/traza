/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useZoomPan
 *
 * Gestiona la lógica de manipulación espacial (Zoom y Pan) para el Preview.
 * Soporta Mouse (Wheel, Drag) y Touch (Pinch-to-zoom, Pan).
 *
 * Estado que maneja:
 * - `zoom`: factor de escala actual (entre 0.1 y 10).
 * - `pan`: desplazamiento {x, y} en píxeles del viewport.
 *
 * Efectos secundarios:
 * - Registra y limpia event listeners directamente sobre el elemento del DOM
 *   referenciado por `containerRef`, más `mousemove` / `mouseup` en `window`
 *   para capturar el drag fuera del contenedor.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Vector 2D usado para representar la posición del pan y el último punto
 * de contacto durante el drag.
 */
interface Vector2 {
  x: number;
  y: number;
}

/**
 * Umbral en píxeles para distinguir un tap de un arrastre en pantallas táctiles.
 * Si el dedo se movió más de este valor, el touchend se trata como pan (no como tap).
 */
const TOUCH_DRAG_THRESHOLD = 8;

/**
 * Modos de interacción táctil.
 * - 'pan': el dedo único hace desplazamiento del plano.
 * - 'select': el dedo único hace tap para seleccionar (no desplaza).
 */
export type PanMode = 'pan' | 'select';

/**
 * Hook que agrega zoom y pan sobre un elemento HTML arbitrario.
 *
 * @param containerRef Referencia al elemento DOM sobre el que se escuchan los eventos.
 * @param initialPanMode Modo táctil inicial ('pan' por defecto).
 * @returns Objeto con el estado actual de zoom/pan, funciones de control,
 *          `wasTouchDrag` (ref) para ignorar onClick sintéticos, y `panMode` / `setPanMode`.
 */
export function useZoomPan(
  containerRef: React.RefObject<HTMLElement | null>,
  initialPanMode: PanMode = 'pan'
) {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<Vector2>({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState<PanMode>(initialPanMode);

  // Refs para tracking de estado sin disparar re-renders
  const dragging = useRef<boolean>(false);
  const lastPos = useRef<Vector2>({ x: 0, y: 0 });
  // Distancia entre dedos en el frame anterior del gesto pinch-to-zoom
  const lastDist = useRef<number | null>(null);
  // Punto medio del pinch en el frame anterior (para pan centrado)
  const lastPinchMid = useRef<Vector2 | null>(null);
  // Posición inicial del touch para calcular distancia recorrida
  const touchStartPos = useRef<Vector2>({ x: 0, y: 0 });
  // Indica si el último gesto táctil fue un arrastre (no un tap)
  // Expuesto para que Preview pueda ignorar el onClick sintético
  const wasTouchDrag = useRef<boolean>(false);
  // Ref sincronizado del panMode para usarlo dentro de event listeners sin stale closure
  const panModeRef = useRef<PanMode>(initialPanMode);

  // Detectar si el dispositivo tiene pantalla táctil
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Mantener panModeRef sincronizado con panMode
  useEffect(() => {
    panModeRef.current = panMode;
  }, [panMode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // ─── MOUSE EVENTS ───

    const onWheel = (e: WheelEvent) => {
      // Prevenimos el scroll de la página al usar la rueda sobre el plano
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      // Zoom centrado en la posición del cursor
      setZoom(z => {
        const newZ = Math.max(0.1, Math.min(10, z * factor));
        const ratio = newZ / z;
        setPan(p => ({
          x: mouseX - ratio * (mouseX - p.x),
          y: mouseY - ratio * (mouseY - p.y),
        }));
        return newZ;
      });
    };

    const onMouseDown = (e: MouseEvent) => {
      // Activamos pan con botón central o Alt + Click izquierdo
      if (e.button === 1 || e.altKey) {
        dragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        el.style.cursor = 'grabbing';
        e.preventDefault();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      dragging.current = false;
      if (el) el.style.cursor = '';
    };

    // ─── TOUCH EVENTS (MOBILE) ───

    const onTouchStart = (e: TouchEvent) => {
      wasTouchDrag.current = false;
      if (e.touches.length === 2) {
        // Pinch-to-zoom: prevenimos el zoom nativo del navegador inmediatamente en touchstart
        e.preventDefault();
        // calculamos distancia inicial entre dedos
        lastDist.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        // Punto medio del pinch (para centrar el zoom)
        lastPinchMid.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        // Cancelar pan de 1 dedo si el segundo dedo aparece
        dragging.current = false;
      } else if (e.touches.length === 1) {
        // En modo 'pan', o siempre para tracking de inicio
        dragging.current = true;
        const pos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastPos.current = pos;
        touchStartPos.current = pos;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastDist.current !== null) {
        // ── Pinch-to-zoom centrado en el punto medio ──
        e.preventDefault();
        wasTouchDrag.current = true;

        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = el.getBoundingClientRect();
        const localMidX = midX - rect.left;
        const localMidY = midY - rect.top;

        const ratio = d / (lastDist.current as number);
        setZoom(z => {
          const newZ = Math.max(0.1, Math.min(10, z * ratio));
          const zRatio = newZ / z;
          // Pan para mantener el punto medio fijo
          setPan(p => ({
            x: localMidX - zRatio * (localMidX - p.x),
            y: localMidY - zRatio * (localMidY - p.y),
          }));
          return newZ;
        });

        lastDist.current = d;
        lastPinchMid.current = { x: midX, y: midY };

      } else if (e.touches.length === 1 && dragging.current) {
        // ── Pan de 1 dedo ──
        // Prevenir inmediatamente el scroll nativo del navegador para que no aborte el paneo
        e.preventDefault();

        const dx = e.touches[0].clientX - lastPos.current.x;
        const dy = e.touches[0].clientY - lastPos.current.y;

        const totalDx = e.touches[0].clientX - touchStartPos.current.x;
        const totalDy = e.touches[0].clientY - touchStartPos.current.y;
        const totalDist = Math.hypot(totalDx, totalDy);

        if (totalDist > TOUCH_DRAG_THRESHOLD) {
          wasTouchDrag.current = true;
          setPan(p => ({ x: p.x + dx, y: p.y + dy }));
          lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      }
    };

    const onTouchEnd = () => {
      dragging.current = false;
      lastDist.current = null;
      lastPinchMid.current = null;
      // wasTouchDrag se mantiene hasta el próximo touchstart para que
      // el onClick sintético que dispara React (unos ms después) pueda ignorarse
    };

    // ─── SUSCRIPCIÓN DE EVENTOS ───
    
    // Wheel debe ser no-pasivo para poder usar preventDefault()
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    // Touch: touchmove y touchstart deben ser no-pasivos para preventDefault() en pan y pinch en iOS Safari
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    // ─── CLEANUP ───
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [containerRef]); // Se reinicia si cambia la referencia del contenedor

  // ─── FUNCIONES DE CONTROL EXPUESTAS ───

  /** Restablece zoom a 1× y pan a (0, 0). */
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  /** Incrementa el zoom en un 25%, con límite superior de 10×. */
  const zoomIn = useCallback(() => setZoom(z => Math.min(10, z * 1.25)), []);
  
  /** Reduce el zoom en un 20%, con límite inferior de 0.1×. */
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.1, z * 0.8)), []);

  return { zoom, pan, resetZoom, zoomIn, zoomOut, wasTouchDrag, panMode, setPanMode, isTouchDevice };
}