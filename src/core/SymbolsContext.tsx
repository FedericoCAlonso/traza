import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  getDefaultSymbolsSync,
  getDefaultCategoriesSync,
  loadCustomSymbolsFromStorage,
  saveSymbols,
  type SymbolCategory,
  type DefinicionSimbolo
} from '../lib/symbols';

// ─── INTERFAZ DEL CONTEXTO ────────────────────────────────────────────────────

/**
 * Valor expuesto por `SymbolsContext` a los componentes consumidores.
 */
interface SymbolsContextType {
  /**
   * Librería activa de símbolos eléctricos: combina los símbolos por defecto
   * del bundle con los personalizados del usuario (locales y de la nube).
   * Los símbolos personalizados tienen precedencia sobre los por defecto
   * cuando comparten el mismo `id`.
   */
  symbolsLib: DefinicionSimbolo[];
  /** Categorías disponibles para organizar la librería de símbolos. */
  categoriesLib: SymbolCategory[];
  /**
   * Reemplaza la librería de símbolos activa, persiste en localStorage y,
   * si hay usuario autenticado, sincroniza los símbolos personalizados con Firestore.
   * Solo los símbolos cuyo `id` comienza con `'sym-custom-'` se consideran
   * personalizados y se sincronizan a la nube.
   *
   * @param newLibrary - Nueva librería completa de símbolos a establecer.
   */
  setSymbolsLib: (newLibrary: DefinicionSimbolo[]) => void;
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

/**
 * Contexto React que gestiona la librería de símbolos eléctricos disponibles
 * en el editor. Combina símbolos por defecto con personalizados del usuario
 * y sincroniza con Firestore cuando hay sesión activa.
 */
const SymbolsContext = createContext<SymbolsContextType | undefined>(undefined);

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

/**
 * Proveedor del contexto de símbolos eléctricos.
 *
 * **Inicialización síncrona:** al montar, fusiona los símbolos por defecto del
 * bundle con los personalizados guardados en `localStorage`, usando un `Map`
 * indexado por `id` para que los personalizados sobrescriban los por defecto.
 *
 * **Sincronización en segundo plano:** cuando el usuario se autentica, descarga
 * sus símbolos personalizados de Firestore y vuelve a fusionar la librería sin
 * bloquear la UI. Usa una bandera `cancelled` para evitar race conditions.
 *
 * @param children - Árbol de componentes que tendrán acceso al contexto.
 */
export const SymbolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicialización síncrona: símbolos estándar del bundle + custom locales
  const [symbolsLib, setSymbolsLibState] = useState<DefinicionSimbolo[]>(() => {
    const defaults = getDefaultSymbolsSync();
    const custom = loadCustomSymbolsFromStorage();
    const merged = new Map<string, DefinicionSimbolo>();
    defaults.forEach(symbol => merged.set(symbol.id, symbol));
    custom.forEach(symbol => merged.set(symbol.id, symbol));
    return Array.from(merged.values());
  });

  const [categoriesLib] = useState<SymbolCategory[]>(() => getDefaultCategoriesSync());

  /**
   * Actualiza la librería de símbolos en el estado local, persiste en
   * `localStorage` y sube únicamente los símbolos personalizados a Firestore
   * (aquellos cuyo `id` empieza con `'sym-custom-'`).
   */
  const updateSymbols = useCallback((newLibrary: DefinicionSimbolo[]) => {
    setSymbolsLibState(newLibrary);
    saveSymbols(newLibrary);
  }, []);

  return (
    <SymbolsContext.Provider value={{
      symbolsLib,
      categoriesLib,
      setSymbolsLib: updateSymbols
    }}>
      {children}
    </SymbolsContext.Provider>
  );
};

// ─── HOOK ─────────────────────────────────────────────────────────────────────

/**
 * Hook que consume el `SymbolsContext`. Provee acceso a la librería de
 * símbolos eléctricos activa, las categorías y la función para actualizarla.
 *
 * @returns El valor completo de `SymbolsContextType`.
 * @throws Error si se usa fuera de un `SymbolsProvider`.
 */
export const useSymbols = () => {
  const context = useContext(SymbolsContext);
  if (context === undefined) {
    throw new Error('useSymbols must be used within a SymbolsProvider');
  }
  return context;
};
