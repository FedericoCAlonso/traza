/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE: storage.ts
 *
 * Gestión de persistencia en LocalStorage y fábricas de objetos del dominio.
 * Asegura que cada nueva entidad (Proyecto, Ambiente, Pared, etc.) cumpla con
 * las interfaces definidas en types/index.ts y tenga valores sensatos por defecto.
 *
 * Organización:
 *  1. Gestión de persistencia (loadProjects / saveProjects)
 *  2. Fábricas básicas (generateId, createPared, createAmbiente, createProject…)
 *  3. Fábricas de entidades del modelo relacional (createCircuito, createTablero…)
 *  4. Helpers de migración legacy (getAmbienteParedes, migrateAmbiente)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { 
  Ambiente, 
  Project, 
  Pared, 
  Abertura, 
  ElementoElectrico, 
  TextoPlano,
  Circuito,
  Tablero,
  Conexion,
  Cable,
  TipoCircuito,
  Tramo,
  ZonaCobertura,
  ElementoEstructural
} from '../types/index';

/** Clave de localStorage donde se persiste la lista completa de proyectos (versión 2). */
const KEY = 'ieba_croquis_v2';

// ─── GESTIÓN DE PERSISTENCIA ───

/**
 * Carga la lista de proyectos desde el LocalStorage.
 * @returns Array de proyectos deserializado, o array vacío en caso de error o ausencia de datos.
 */
export const loadProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error al cargar desde STORAGE:", error);
    return [];
  }
};

/**
 * Guarda la lista completa de proyectos en el LocalStorage, sobrescribiendo
 * cualquier dato previo bajo la misma clave.
 * @param projects Array de proyectos a persistir.
 */
export const saveProjects = (projects: Project[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Error al guardar en STORAGE:", error);
  }
};

// ─── FÁBRICAS BÁSICAS ───

/**
 * Genera un ID único combinando el timestamp actual con una cadena aleatoria.
 * Suficientemente único para uso cliente sin coordinación de servidor.
 * @returns String de ID único.
 */
export const generateId = (): string => 
  Date.now().toString() + Math.random().toString(36).slice(2, 9);

/**
 * Crea una nueva instancia de `Pared` con valores por defecto.
 * - `grosor: null` indica que debe heredarse el valor por defecto del proyecto (`meta.grosor_pared_default`).
 * - `esquina_saliente: null` indica que el comportamiento de esquina es estándar.
 * @param overide Propiedades opcionales a sobreescribir sobre los valores por defecto.
 */
export const createPared = (overide: Partial<Pared> = {}): Pared => ({
  id: generateId(),
  largo: 0,
  angulo: 90,
  grosor: null, // null hereda el valor por defecto del proyecto
  esquina_saliente: null,
  irregularidades: [],
  ...overide
});

/**
 * Crea un nuevo tramo de paredes.
 * @deprecated Usar el array `paredes[]` directamente en `Ambiente`. El modelo de
 * tramos fue reemplazado por el modelo plano en la versión 2.0 del esquema de datos.
 * @param overide Propiedades a sobreescribir.
 */
export const createTramo = (overide: Partial<Tramo> = {}): Tramo => ({
  id: generateId(),
  cerrado: true,
  paredes: [createPared()],
  ...overide
});

/**
 * Obtiene la lista plana de paredes de un ambiente, manejando de forma
 * transparente la migración desde el modelo legacy de tramos.
 * - Si el ambiente ya tiene `paredes[]`, las retorna directamente.
 * - Si solo tiene `tramos[]` (modelo legacy), aplana todas sus paredes.
 * @param amb Ambiente del que extraer las paredes.
 * @returns Array plano de `Pared`.
 */
export const getAmbienteParedes = (amb: Ambiente): Pared[] => {
  if (amb.paredes && amb.paredes.length > 0) return amb.paredes;
  // Migración: flatten legacy tramos
  return (amb.tramos || []).flatMap(t => t.paredes);
};

/**
 * Migra un ambiente del modelo legacy (tramos anidados) al nuevo modelo plano
 * (array de paredes directamente en el ambiente). Si el ambiente ya está migrado,
 * retorna la misma referencia sin modificaciones.
 * @param amb Ambiente a migrar.
 * @returns Ambiente con `paredes[]` en formato plano.
 */
export const migrateAmbiente = (amb: Ambiente): Ambiente => {
  if (amb.paredes && amb.paredes.length > 0) return amb;
  const flatParedes = (amb.tramos || []).flatMap(t => t.paredes);
  return {
    ...amb,
    paredes: flatParedes.length > 0 ? flatParedes : [createPared()],
  };
};

/**
 * Crea una nueva instancia de `Ambiente` con una pared inicial y configuración
 * de hoja A4 horizontal por defecto.
 * @param nombre Nombre del ambiente (default: `'Ambiente'`).
 */
export const createAmbiente = (nombre = 'Ambiente'): Ambiente => ({
  id: generateId(),
  nombre,
  tipoAmbiente: 'interior',
  sentido: 'horario',
  alturaLocal: undefined,
  mostrar_cotas: true,
  paredes: [createPared()],
  aberturas: [],
  elementos: [],
  textos: [],
  configHoja: {
    formato: 'A4',
    orientacion: 'horizontal'
  }
});

/**
 * Crea una nueva instancia de `Project` con valores por defecto.
 * Incluye los campos obligatorios del modelo relacional introducidos en v2:
 * `clienteId`, `electricistaId`, `inmueble`, `suministro`, `circuitos`, `tableros`, `conexiones`.
 * @param nombre Nombre del proyecto (default: `'Nuevo Proyecto'`).
 */
export const createProject = (nombre = 'Nuevo Proyecto'): Project => ({
  id: Date.now().toString(),
  clienteId: '',
  electricistaId: '',
  nombre,
  estado: 'relevamiento',
  inmueble: {
    direccion: '',
    partido: '',
    provincia: '',
    uso: 'residencial'
  },
  suministro: {
    tension: 220,
    fases: 1
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  escala: 50,
  grosor_pared_default: 0.15,
  alturaDefault: 2.6,
  ambientes: [createAmbiente('Ambiente 1')],
  circuitos: [],
  conexiones: [],
  tableros: [],
  diferenciales: [],
  tramos: [],
  unifilDiagrams: [],
  hojasMaestras: [],
});

/**
 * Crea una nueva instancia de `Abertura` (puerta, ventana o vano) vinculada a una pared.
 * - `posicion: 0.5` ubica la abertura centrada en la pared.
 * - `lado: 'interior'` define que la abertura se abre hacia adentro del ambiente.
 * @param overide Propiedades a sobreescribir sobre los valores por defecto.
 */
export const createAbertura = (overide: Partial<Abertura> = {}): Abertura => ({
  id: generateId(),
  pared: 0,
  tipo: 'puerta',
  posicion: 0.5,
  ancho: 0.9,
  hojas: 1,
  lado: 'interior',
  sentido: 'derecha',
  ...overide
});

/**
 * Crea un nuevo elemento eléctrico posicionable en el croquis.
 * @param tipo ID del símbolo en la librería (`symbols.json`).
 * @param x Posición X inicial en metros (relevante solo si no está anclado a pared).
 * @param y Posición Y inicial en metros.
 */
export const createElemento = (
  tipo: string, 
  x = 0, 
  y = 0
): ElementoElectrico => ({
  id: generateId(),
  tipo,
  referencia: '',
  x,
  y,
  paredIdx: null, // null indica que no está anclado a pared (ej: boca de techo)
  paredPos: null,
  datos: [],
  mostrarDato: false,
});

/**
 * Crea una nueva anotación de texto libre sobre el croquis.
 * @param texto Contenido de la anotación (default: `'Texto'`).
 * @param x Posición X en metros (default: `0`).
 * @param y Posición Y en metros (default: `0`).
 */
export const createTexto = (texto = 'Texto', x = 0, y = 0): TextoPlano => ({
  id: generateId(),
  texto,
  x,
  y,
  tamano: 12,
});

// ─── FÁBRICAS DE ENTIDADES DEL MODELO RELACIONAL ───

/**
 * Crea un nuevo circuito eléctrico con los valores reglamentarios más comunes.
 * El nombre sigue el convenio `"{tableroId}.C{número}"` (ej: `"TS1.C1"`).
 * - `seccion: 2.5 mm²` es la sección mínima habitual en circuitos TUG (Reglamento AEA 90364).
 * - `caidaTensionMax: 3 %` es el límite máximo permitido para circuitos terminales.
 * @param overide Propiedades a sobreescribir.
 */
export const createCircuito = (overide: Partial<Circuito> = {}): Circuito => ({
  id: generateId(),
  nombre: 'TS1.C1',
  tipo: 'TUG' as TipoCircuito,
  tableroId: '',
  seccionBase: 2.5,
  conductoresBase: 3,
  color: '#4A90D9',
  ...overide
});

/**
 * Crea un nuevo tablero eléctrico.
 * - `tipo: 'seccional'` representa un tablero seccional estándar.
 * - `factorSimultaneidad: 1.0` sin reducción (todos los circuitos activos simultáneamente).
 * @param overide Propiedades a sobreescribir.
 */
export const createTablero = (overide: Partial<Tablero> = {}): Tablero => ({
  id: generateId(),
  nombre: 'TS1',
  tipo: 'seccional',
  factorSimultaneidad: 1.0,
  diferencialesIds: [],
  ...overide
});

/**
 * Crea una conexión (netlist) entre dos nodos del circuito eléctrico.
 * Inicializa tres conductores por defecto: fase (negro), neutro (celeste) y PE (verde-amarillo),
 * todos de 2.5 mm² en conducto PVC 20mm.
 * @param from Nodo de origen de la conexión.
 * @param to Nodo de destino de la conexión.
 * @param overide Propiedades adicionales a sobreescribir.
 */
export const createConexion = (
  from: Conexion['from'],
  to: Conexion['to'],
  overide: Partial<Conexion> = {}
): Conexion => ({
  id: generateId(),
  from,
  to,
  cables: [
    { tipo: 'fase', seccion: 2.5, color: 'negro' } as Cable,
    { tipo: 'neutro', seccion: 2.5, color: 'celeste' } as Cable,
    { tipo: 'pe', seccion: 2.5, color: 'verde-amarillo' } as Cable,
  ],
  conducto: 'PVC 20mm',
  ...overide
});

/**
 * Crea una nueva zona de cobertura (ej: galería, alero) con un segmento inicial.
 * @param overide Propiedades a sobreescribir.
 */
export const createZonaCobertura = (overide: Partial<ZonaCobertura> = {}): ZonaCobertura => ({
  id: generateId(),
  tipo: 'galeria',
  segmentos: [{ largo: 1, angulo: 0 }],
  ...overide
});

/**
 * Crea un nuevo elemento estructural (columna u otro tipo) con geometría cuadrada de 20×20 cm.
 * @param overide Propiedades a sobreescribir (ej: `tipo`, `ancho`, `profundidad`).
 */
export const createElementoEstructural = (overide: Partial<ElementoEstructural> = {}): ElementoEstructural => ({
  id: generateId(),
  tipo: 'columna',
  x: 1,
  y: 1,
  ancho: 0.2,
  profundidad: 0.2,
  ...overide
});