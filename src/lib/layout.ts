/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE: layout.ts
 *
 * Tipos e interfaces para la configuración del carátula (title block) de los
 * planos exportados. La configuración se carga en runtime desde `layout.json`
 * para permitir personalización sin recompilar.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Elemento gráfico individual dentro del carátula del plano.
 * Soporta tres formas primitivas: rectángulo, línea y texto.
 */
export interface LayoutElement {
  /** Tipo de primitiva gráfica. */
  type: 'rect' | 'line' | 'text';
  /** Coordenada X de origen (para `rect` y `text`). */
  x?: number;
  /** Coordenada Y de origen (para `rect` y `text`). */
  y?: number;
  /** Coordenada X del punto inicial (para `line`). */
  x1?: number;
  /** Coordenada Y del punto inicial (para `line`). */
  y1?: number;
  /** Coordenada X del punto final (para `line`). */
  x2?: number;
  /** Coordenada Y del punto final (para `line`). */
  y2?: number;
  /** Ancho del rectángulo en unidades del plano. */
  width?: number;
  /** Alto del rectángulo en unidades del plano. */
  height?: number;
  /** Contenido textual (para `text`). */
  text?: string;
  /** Tamaño de fuente en puntos (para `text`). */
  fontSize?: number;
  /** Color de relleno CSS (para `rect` y `text`). */
  fill?: string;
  /** Color de borde CSS (para `rect` y `line`). */
  stroke?: string;
  /** Grosor del borde en unidades del plano. */
  strokeWidth?: number;
  /** Alineación horizontal del texto respecto al punto `x`. */
  anchor?: 'start' | 'middle' | 'end';
}

/**
 * Configuración completa del carátula del plano.
 * Define el área reservada para la información del proyecto, escala, fecha, etc.
 */
export interface TitleBlockConfig {
  /** Ancho total del carátula en unidades del plano. */
  width: number;
  /** Alto total del carátula en unidades del plano. */
  height: number;
  /** Lista de elementos gráficos que componen el carátula. */
  elements: LayoutElement[];
}

/**
 * Configuración global de layout del plano exportado.
 * Cargada en runtime desde `layout.json` mediante `loadLayoutAsync`.
 */
export interface LayoutConfig {
  /** Configuración del carátula (título, firma, escala, etc.). */
  titleBlock: TitleBlockConfig;
}

/**
 * Carga la configuración de layout desde el archivo `layout.json` público.
 * Si el archivo no existe o la respuesta HTTP no es exitosa, lanza un error
 * que debe ser capturado por el llamador (generalmente con un fallback de valores por defecto).
 *
 * @returns Promesa que resuelve con la configuración de layout.
 * @throws Error si el fetch falla o el servidor responde con un status no OK.
 */
export async function loadLayoutAsync(): Promise<LayoutConfig> {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const resp = await fetch(`${baseUrl}layout.json`);
  if (!resp.ok) throw new Error("No se pudo cargar layout.json");
  return resp.json();
}
