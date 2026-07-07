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
