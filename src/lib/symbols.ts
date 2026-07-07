
// ═══════════════════════════════════════════════════════════════════════════
// MODULE: symbols.ts
// Librería dinámica de símbolos eléctricos. Reemplaza los símbolos hardcodeados.
//
// Estado de las funciones:
//   ✅ ACTIVAS  → getDefaultSymbolsSync, getDefaultCategoriesSync,
//                 getSymbolsByUsoSync, getSymbolsByCategorySync,
//                 loadCustomSymbolsFromStorage, saveSymbols
//   ❌ DEPRECATED → fetchSymbolsFile, fetchDefaultSymbols, loadSymbolsAsync
// ═══════════════════════════════════════════════════════════════════════════

import symbolsFileData from '../symbols.json';
import type { ModuleType } from '../types/index';

/**
 * Categoría de la librería de símbolos (ej: "Iluminación", "Tomas").
 */
export interface SymbolCategory {
  /** Identificador único de la categoría. */
  id: string;
  /** Nombre legible para mostrar en la UI. */
  name: string;
}

/** Rol eléctrico de un pin de conexión de símbolo. */
export type SymbolPinRole = 'phase' | 'neutral' | 'pe' | 'other';

/**
 * Punto de conexión eléctrica dentro del espacio normalizado del símbolo.
 */
export interface SymbolPin {
  /** Identificador único del pin dentro del símbolo. */
  id: string;
  /** Nombre descriptivo del pin (ej: "Línea", "Neutro"). */
  name?: string;
  /** Rol eléctrico del conductor que conecta en este pin. */
  role: SymbolPinRole;
  /** Coordenada X normalizada dentro del espacio del símbolo. */
  x: number;
  /** Coordenada Y normalizada dentro del espacio del símbolo. */
  y: number;
  /** Lado del símbolo desde el que sale el conductor. */
  anchor?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Definición completa de un símbolo eléctrico de la librería.
 */
export interface DefinicionSimbolo {
  /** Identificador único del símbolo (ej: `'boca_enchufe_bipolar'`). */
  id: string;
  /** Nombre legible mostrado en la paleta de símbolos. */
  label: string;
  /** 
   * SVG path u otros elementos gráficos asumiendo un espacio normalizado
   * donde 1 unidad geométrica = 1k (aprox. 0.22m).
   * El color se hereda mediante 'currentColor'.
   */
  svgContent: string;
  /** Factor de escala por defecto si el símbolo se dibujó más grande/chico */
  escalaBase: number;
  /** Punto de anclaje (por defecto 0,0) */
  anclaje: { x: number; y: number };
  /** Uso del símbolo: 'planta' (croquis), 'unifilar' (diagrama), etc. */
  uso?: 'planta' | 'unifilar';
  /** Categoría para filtrado en la paleta */
  categoria?: string;
  /** Tipo de medición asociada a este símbolo, si la hubiera */
  medicionAsociada?: ModuleType;
  /** Puntos de conexión eléctrica dentro del espacio del símbolo */
  pins?: SymbolPin[];
}

/**
 * Estructura del archivo `symbols.json` del bundle.
 */
export interface SymbolsFile {
  /** Categorías para filtrado y navegación en la paleta. */
  categories: SymbolCategory[];
  /** Definiciones completas de todos los símbolos de la librería base. */
  symbols: DefinicionSimbolo[];
}

// ─── FUNCIONES ACTIVAS: SÍMBOLOS ESTÁNDAR DEL BUNDLE (SÍNCRONOS) ───

/**
 * ✅ Retorna todos los símbolos de la librería base, importados directamente
 * del bundle (`symbols.json`) de forma síncrona.
 * @returns Array de definiciones de símbolos.
 */
export const getDefaultSymbolsSync = (): DefinicionSimbolo[] => {
  return (symbolsFileData.symbols || []) as DefinicionSimbolo[];
};

/**
 * ✅ Retorna todas las categorías de la librería base de forma síncrona.
 * @returns Array de categorías.
 */
export const getDefaultCategoriesSync = (): SymbolCategory[] => {
  return (symbolsFileData.categories || []) as SymbolCategory[];
};

/** Tipo de uso de un símbolo: en planta o en diagrama unifilar. */
export type SymbolUso = 'planta' | 'unifilar';

/**
 * ✅ Filtra los símbolos del bundle por su campo `uso`.
 * Si no se especifica uso, retorna todos los símbolos.
 * @param uso Tipo de uso a filtrar.
 * @returns Símbolos cuyo `uso` coincide, o todos si `uso` es `undefined`.
 */
export const getSymbolsByUsoSync = (uso?: SymbolUso): DefinicionSimbolo[] => {
  if (!uso) return getDefaultSymbolsSync();
  return getDefaultSymbolsSync().filter(symbol => symbol.uso === uso);
};

/**
 * ✅ Filtra los símbolos del bundle por su campo `categoria`.
 * Si no se especifica categoría, retorna todos los símbolos.
 * @param categoria ID de la categoría a filtrar.
 * @returns Símbolos de la categoría indicada, o todos si `categoria` es `undefined`.
 */
export const getSymbolsByCategorySync = (categoria?: string): DefinicionSimbolo[] => {
  if (!categoria) return getDefaultSymbolsSync();
  return getDefaultSymbolsSync().filter(symbol => symbol.categoria === categoria);
};

// ─── GESTIÓN DE SÍMBOLOS CUSTOM EN STORAGE ───

/** Clave de localStorage para persistir símbolos personalizados del usuario. */
const SYMBOLS_KEY = 'ieba_custom_symbols_v1';

// ─── FUNCIONES DEPRECATED: REEMPLAZADAS POR VERSIONES SÍNCRONAS ───

/**
 * ❌ Carga el archivo completo de símbolos (categorías y definiciones).
 * @deprecated Usar `getDefaultSymbolsSync()` y `getDefaultCategoriesSync()` por separado
 * para evitar promesas innecesarias (los símbolos ya están en el bundle).
 */
export const fetchSymbolsFile = async (): Promise<SymbolsFile> => {
  return {
    categories: getDefaultCategoriesSync(),
    symbols: getDefaultSymbolsSync(),
  };
};

/**
 * ❌ Carga solo los símbolos base estáticos de forma asíncrona.
 * @deprecated Usar `getDefaultSymbolsSync()` directamente; no hay I/O que esperar.
 */
export const fetchDefaultSymbols = async (): Promise<DefinicionSimbolo[]> => {
  return getDefaultSymbolsSync();
};

// ─── FUNCIONES ACTIVAS: SÍMBOLOS CUSTOM ───

/**
 * ✅ Carga los símbolos personalizados guardados por el usuario en localStorage.
 * @returns Array de símbolos custom, o arreglo vacío si no existen o hay error de parseo.
 */
export const loadCustomSymbolsFromStorage = (): DefinicionSimbolo[] => {
  try {
    const data = localStorage.getItem(SYMBOLS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data) as DefinicionSimbolo[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error al cargar símbolos locales:", error);
    return [];
  }
};

/**
 * ❌ Carga la librería completa (símbolos base + custom) de forma asíncrona.
 * @deprecated Usar `getDefaultSymbolsSync()` + `loadCustomSymbolsFromStorage()` directamente
 * para una carga no bloqueante y sin overhead de Promise.
 */
export const loadSymbolsAsync = async (): Promise<DefinicionSimbolo[]> => {
  const defaults = getDefaultSymbolsSync();
  const custom = loadCustomSymbolsFromStorage();
  return [...defaults, ...custom];
};

/**
 * ✅ Persiste los símbolos personalizados en localStorage.
 * Sobrescribe completamente la lista anterior de símbolos custom.
 * @param symbols Array de símbolos a guardar.
 */
export const saveSymbols = (symbols: DefinicionSimbolo[]): void => {
  try {
    localStorage.setItem(SYMBOLS_KEY, JSON.stringify(symbols));
  } catch (error) {
    console.error("Error al guardar símbolos:", error);
  }
};