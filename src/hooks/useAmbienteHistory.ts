// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useAmbienteHistory
// Gestión del stack de deshacer (undo) para el ambiente activo.
// Se reinicia automáticamente cuando cambia el ambiente activo.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useCallback, useEffect, useRef } from 'react';
import type { Ambiente } from '../types/index';

/** Cantidad máxima de estados almacenados en el historial de deshacer */
const MAX_HISTORY = 20;

/**
 * Hook de historial de deshacer (undo) para un ambiente del croquis.
 *
 * Implementa un stack LIFO de snapshots del estado `Ambiente`.
 * El stack se reinicia automáticamente al cambiar de ambiente activo,
 * evitando que un undo de un ambiente afecte a otro.
 *
 * Estado que maneja:
 * - `history`: array de snapshots de `Ambiente`, limitado a `MAX_HISTORY` entradas.
 *
 * @param activeAmbienteId ID del ambiente actualmente seleccionado,
 *   o `null` si no hay ninguno activo. Cambios en este valor reinician el historial.
 * @returns Objeto con las funciones de push/pop y la bandera `canUndo`.
 */
export function useAmbienteHistory(activeAmbienteId: string | null) {
  const [history, setHistory] = useState<Ambiente[]>([]);

  // Reiniciar historial cuando cambia el ambiente activo
  useEffect(() => {
    setHistory([]);
  }, [activeAmbienteId]);

  const lastPushRef = useRef<number>(0);

  /**
   * Registra el estado anterior del ambiente ANTES de una modificación.
   * Debe llamarse desde `updateAmbiente` antes de aplicar el cambio.
   * Trunca el historial al máximo permitido eliminando la entrada más antigua.
   * Aplica un throttle de 800ms para evitar saturar el stack durante arrastres.
   * @param prev Snapshot del ambiente antes de la modificación.
   */
  const pushHistory = useCallback((prev: Ambiente) => {
    const now = Date.now();
    if (now - lastPushRef.current > 800) {
      setHistory(h => [...h, prev].slice(-MAX_HISTORY));
      lastPushRef.current = now;
    }
  }, []);

  /**
   * Extrae el último estado del historial para restaurarlo (LIFO).
   * Retorna `null` si el historial está vacío.
   * @returns El snapshot más reciente, o `null`.
   */
  const popHistory = useCallback((): Ambiente | null => {
    if (history.length === 0) return null;
    const popped = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    return popped;
  }, [history]);

  return {
    history,
    pushHistory,
    popHistory,
    /** `true` si hay al menos un estado disponible para deshacer */
    canUndo: history.length > 0,
  };
}
