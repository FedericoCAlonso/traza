/**
 * Módulos de medición disponibles en la aplicación.
 * Cada módulo corresponde a un tipo de ensayo eléctrico reglamentario:
 * - `puesta_tierra`: resistencia de la jabalina/malla de puesta a tierra
 * - `diferencial`: tiempo y corriente de disparo del interruptor diferencial
 * - `continuidad_masas`: verificación de la continuidad del conductor PE
 * - `resistencia_lazo`: impedancia del lazo de falla (Zloop)
 * - `corriente_cortocircuito`: corriente de cortocircuito prospectiva (Icc)
 * - `resistencia_aislacion`: resistencia de aislación entre conductores
 * - `calidad_potencia`: análisis de THD, factor de potencia y potencias
 */
export type ModuleType = 
  | 'puesta_tierra'
  | 'diferencial'
  | 'continuidad_masas'
  | 'resistencia_lazo'
  | 'corriente_cortocircuito'
  | 'resistencia_aislacion'
  | 'calidad_potencia'

/**
 * Resultado de evaluación de una medición contra los valores de referencia normativos.
 * - `aprobado`: el valor cumple con la norma
 * - `observado`: el valor está fuera de lo óptimo pero no es un rechazo definitivo
 * - `rechazado`: el valor incumple la norma y requiere corrección
 * - `no_aplica`: el ensayo no corresponde para este punto o configuración
 */
export type ResultadoMedicion = 'aprobado' | 'observado' | 'rechazado' | 'no_aplica'

/** Método de medición de resistencia de puesta a tierra. */
export type MetodoPuestaTierra = 'caida_de_tension' | 'dos_puntas'

/**
 * Categoría del electrodo de puesta a tierra:
 * - `principal`: electodo vinculado a la barra equipotencial principal
 * - `funcional_independiente`: puesta a tierra separada para sistemas específicos (IT, BT funcional)
 */
export type CategoriaPuestaTierra = 'principal' | 'funcional_independiente'

/**
 * Tipo de interruptor diferencial según la forma de corriente de falla que detecta.
 * Equivalente a las clases definidas en IEC 62423 / UNE-EN 62423.
 */
export type TipoDiferencial = 'ac' | 'a' | 'f' | 'b'

// ─── BASE DE MEDICIÓN ───

/**
 * Campos comunes a todos los tipos de medición eléctrica.
 * Toda medición debe estar vinculada a un proyecto y a un operador responsable.
 */
export interface MeasurementBase {
  id: string
  moduleType: ModuleType
  /** ID del proyecto al que pertenece esta medición. */
  projectId: string
  /** ID del ambiente donde se realizó la medición (si aplica). */
  ambienteId?: string
  elementoId?: string        // ElementoElectrico.id (bocas, puntos de p.tierra, etc.)
  circuitoId?: string        // Circuito.id
  diferencialId?: string     // Diferencial.id
  tableroId?: string         // Tablero.id (para calidad de potencia en tableros)
  lineaId?: string           // Conexion.id o tramo seccional
  ubicacion: string          // Descripción libre del punto de medición
  observaciones?: string
  resultado: ResultadoMedicion
  /** Nombre o identificador del técnico que realizó la medición. */
  operador: string
  instrumentoId?: string      // ID del instrumento usado (del perfil)
  errorMedicion?: string      // Ej: '± 2% + 3d' o '0.05Ω'
  fecha?: number              // timestamp de la medición (distinto al timestamp de carga)
  /** Timestamp Unix (ms) en que se registró la medición en el sistema. */
  timestamp: number
  /** Rutas de Firebase Storage de las fotos del ensayo. */
  photoStoragePaths?: string[]
}

// ─── TIPOS ESPECÍFICOS DE MEDICIÓN ───

/** Puesta a tierra */
export interface MeasurementTierra extends MeasurementBase {
  moduleType: 'puesta_tierra'
  metodo: MetodoPuestaTierra
  categoria: CategoriaPuestaTierra
  /** Descripción de la interconexión equipotencial hacia otros electrodos (ej: 'a barra principal'). */
  interconexionHacia?: string  // Ej: 'Estrella a barra principal' o 'Ninguna'
  /** Resistencia de puesta a tierra medida en Ohms. */
  resistenciaOhm: number
  /** Resistividad del suelo estimada en Ohms (si se midió). */
  resistenciaSueloOhm?: number
  /** Porcentaje de humedad del suelo al momento de la medición. */
  humedadSuelo?: number
}

/** Interruptor diferencial */
export interface MeasurementDiferencial extends MeasurementBase {
  moduleType: 'diferencial'
  tipo: TipoDiferencial
  /** Sensibilidad nominal del diferencial en miliamperios (según placa). */
  sensibilidadNominalmA: number
  /** Tiempo de disparo medido en milisegundos. */
  tiempoDisparoms: number
  /** Corriente de disparo real medida en miliamperios. */
  corrienteDisparomA: number
  /** Tensión de prueba aplicada durante el ensayo en Voltios. */
  tensionPruebaV: number
  /** Indica si el botón de prueba manual del diferencial funcionó correctamente. */
  funcionaManual: boolean
}

/** Continuidad de masas (bajas impedancias) */
export interface MeasurementContinuidad extends MeasurementBase {
  moduleType: 'continuidad_masas'
  /** Resistencia del conductor de protección medida en Ohms. */
  resistenciaOhm: number
  referenciaOhm?: number      // Valor de referencia esperado
  /** Corriente de prueba inyectada durante el ensayo en Amperios. */
  corrientePruebaA: number
}

/** Resistencia de lazo de tierra (Zloop) */
export interface MeasurementLazo extends MeasurementBase {
  moduleType: 'resistencia_lazo'
  /** Impedancia de lazo medida en Ohms (fase-PE). */
  impedanciaOhm: number
  /** Corriente de cortocircuito prospectiva calculada a partir de la impedancia de lazo, en Amperios. */
  corrienteProspectivaA: number
  /** Tensión de red durante la medición en Voltios. */
  tensionRedV: number
}

/** Corriente de cortocircuito (Icc prospectiva) */
export interface MeasurementCortocircuito extends MeasurementBase {
  moduleType: 'corriente_cortocircuito'
  /** Corriente de cortocircuito prospectiva medida en Amperios. */
  corrienteIccA: number
  /** Impedancia de secuencia directa en Ohms (si se calculó). */
  impedanciaZ1Ohm?: number
  /** Impedancia de referencia en Ohms (si se usa método de impedancia). */
  impedanciaZrefOhm?: number
  /** Método de obtención de la Icc: por cálculo de impedancias o medición directa. */
  metodo: 'impedancia' | 'directa'
}

/** Resistencia de aislación */
export interface MeasurementAislacion extends MeasurementBase {
  moduleType: 'resistencia_aislacion'
  tensionPruebaV: number      // 500V, 1000V, etc.
  /** Resistencia de aislación medida en MegaOhms. */
  resistenciaMOhm: number
  /** Temperatura ambiente al momento del ensayo en °C (afecta el resultado). */
  temperaturaAmbiente?: number
  /** Humedad relativa ambiente al momento del ensayo en porcentaje. */
  humedadRelativa?: number
}



/** Calidad de potencia (THD, FP, etc.) */
export interface MeasurementCalidadPotencia extends MeasurementBase {
  moduleType: 'calidad_potencia'
  /** Potencia activa total medida en Watts. */
  potenciaActivaW?: number
  /** Potencia reactiva total medida en VAr. */
  potenciaReactivaVAr?: number
  /** Potencia aparente total medida en VA. */
  potenciaAparenteVA?: number
  /** Distorsión armónica total de tensión en porcentaje (THDv). */
  thdVPercent?: number
  /** Distorsión armónica total de corriente en porcentaje (THDi). */
  thdIPercent?: number
  /** Factor de potencia (cos φ o fp desplazamiento + distorsión). */
  factorPotencia?: number
  /** Tensión de neutro a fase en Voltios. */
  tensionVN?: number
  /** Corriente de neutro medida en Amperios. */
  corrienteAN?: number
}

// ─── UNIÓN DISCRIMINADA ───

/**
 * Tipo unión que representa cualquier medición eléctrica del sistema.
 * El campo `moduleType` actúa como discriminante para el narrowing de TypeScript.
 */
export type Measurement =
  | MeasurementTierra
  | MeasurementDiferencial
  | MeasurementContinuidad
  | MeasurementLazo
  | MeasurementCortocircuito
  | MeasurementAislacion
  | MeasurementCalidadPotencia

// ─── CAMPAÑAS DE MEDICIÓN ───

/**
 * Estado de una campaña de medición.
 * - `activa`: acepta nuevas mediciones
 * - `cerrada`: bloqueada, no se pueden agregar mediciones
 */
export type EstadoCampania = 'activa' | 'cerrada'

/**
 * Campaña de medición eléctrica.
 * Agrupa un conjunto de mediciones del mismo tipo, realizadas con el mismo
 * instrumento y en el mismo período, por un equipo técnico definido.
 *
 * Diseñada para ser compatible con una futura migración a Firebase Firestore
 * (IDs UUID, timestamps en epoch ms, arrays sin objetos anidados profundos).
 */
export interface Campania {
  /** UUID generado con crypto.randomUUID(). */
  id: string
  /** Nombre descriptivo de la campaña (ej: "Continuidad de masas - Julio 2026"). */
  nombre: string
  /**
   * Tipo o norma de referencia del ensayo (campo libre).
   * Ejemplos: "SRT 900/15", "Resistencia de lazo a tierra", "Verificación de diferenciales".
   */
  tipoMedicion: string
  /** Nombre y modelo del instrumento utilizado (ej: "Fluke 1664 FC"). */
  instrumento: string
  /** Número de serie del instrumento (para trazabilidad en el informe). */
  instrumentoSerie?: string
  /**
   * Unidad de medida base para las lecturas de esta campaña.
   * Puede sobreescribirse por lectura individual. Ejemplos: "Ω", "mA", "ms", "MΩ".
   */
  unidad: string
  /** Lista de nombres de los técnicos participantes (texto libre). */
  tecnicos: string[]
  /** Timestamp Unix (ms) de inicio de la campaña. */
  fechaInicio: number
  /** Timestamp Unix (ms) de finalización. Opcional hasta que se cierra. */
  fechaFin?: number
  estado: EstadoCampania
  /** Notas adicionales sobre condiciones del ensayo, observaciones generales, etc. */
  notas?: string
}

// ─── LECTURAS INDIVIDUALES (dentro de una Medicion) ───

/**
 * Lectura individual dentro de una medición de campaña.
 * Una medición puede tener múltiples lecturas (ej: diferencial con varios presets).
 */
export interface LecturaMedicion {
  /** Etiqueta descriptiva de la lectura (ej: "½ΔIn", "ΔIn", "2ΔIn", "THD R", "t disparo"). */
  etiqueta: string
  valor: number
  /** Unidad de esta lectura. Hereda de la campaña si no se especifica. */
  unidad?: string
  /** Resultado de evaluación individual de esta lectura. */
  aprobado?: boolean
}

/**
 * Referencia al elemento físico sobre el que se realiza la medición.
 * Discriminada por `tipo` para permitir narrowing en TypeScript.
 */
export type ElementoMedicionRef =
  | { tipo: 'boca';     ambienteId: string; elementoId: string }
  | { tipo: 'tablero';  ambienteId: string; elementoId: string }
  | { tipo: 'tierra';   descripcion: string }
  | { tipo: 'circuito'; circuitoId: string }
  | { tipo: 'diferencial'; tableroId: string; diferencialId: string }

/**
 * Medición registrada en el contexto de una campaña.
 * Cada medición pertenece a exactamente una campaña y referencia un elemento físico.
 */
export interface MedicionCampania {
  /** UUID generado con crypto.randomUUID(). */
  id: string
  campaniaId: string
  elementoRef: ElementoMedicionRef
  /** Lista de lecturas del ensayo. Mínimo una, múltiples para ensayos multi-preset. */
  lecturas: LecturaMedicion[]
  /** Resultado global de la medición (puede diferir del resultado lectura a lectura). */
  aprobado?: boolean
  /** Timestamp Unix (ms) de la medición. Auto-generado, editable por el técnico. */
  fechaHora: number
  notas?: string
}
