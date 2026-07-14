import type { UnifilDiagram } from './unifilar'
import type { Campania, MedicionCampania } from './measurements'

// ─── METADATOS DE PLANO ───

/**
 * Configuración de dibujo y dimensiones del plano.
 */
export interface DrawingConfig {
  /** Escala de dibujo (ej: 50 equivale a 1:50). */
  escala: number
  /** Grosor de pared por defecto en metros (ej: 0.15 para 15 cm). */
  grosor_pared_default: number
  /** Altura de local por defecto en metros, si no se especifica por ambiente. */
  alturaDefault?: number
}

/** Tipo alias por compatibilidad hacia atrás */
export type Meta = DrawingConfig & { nombre?: string };

// ─── ESTADOS Y TIPOS DEL MODELO RELACIONAL ───

/**
 * Estados posibles del ciclo de vida de un proyecto eléctrico.
 * - `relevamiento`: en etapa de toma de datos in situ
 * - `presupuesto`: cotización elaborada
 * - `en_ejecucion`: obra en curso
 * - `ejecutado`: obra terminada, pendiente de certificación
 * - `certificado`: proyecto finalizado y certificado
 */
export type ProjectEstado = 'relevamiento' | 'presupuesto' | 'en_ejecucion' | 'ejecutado' | 'certificado'

/**
 * Datos del inmueble donde se ejecuta el proyecto.
 */
export interface Inmueble {
  direccion: string
  /** Partido o municipio (nomenclatura argentina). */
  partido: string
  provincia: string
  /** Tipo de uso del inmueble según la clasificación del REBT. */
  uso: 'residencial' | 'comercial' | 'industrial'
}

/**
 * Datos del punto de suministro eléctrico proveniente de la distribuidora.
 */
export interface Suministro {
  /** Tensión nominal de suministro en Voltios (ej: 220, 380). */
  tension?: number            // V
  /** Cantidad de fases: 1 = monofásico, 3 = trifásico. */
  fases?: 1 | 3
  /** Potencia contratada con la distribuidora en kW. */
  potenciaContratadaKW?: number  // kW
  /** Número de identificación del medidor. */
  nroMedidor?: string
  /** Nombre de la empresa distribuidora de energía. */
  distribuidora?: string
  /** ID interno del medidor (para vinculación con mediciones). */
  medidorId?: string
  /** Categoría tarifaria del suministro (ej: T1-R1, T2). */
  categoriaTarifa?: string
}

// ─── PROJECT ───

/**
 * Entidad principal de la aplicación. Representa un proyecto eléctrico completo,
 * incluyendo el plano de ambientes, circuitos, tableros, mediciones y documentación.
 * Combina el modelo relacional nuevo con campos legacy mantenidos por compatibilidad.
 */
export interface Project {
  // Campos del nuevo modelo relacional V2
  id: string
  nombre: string
  /** Timestamp Unix (ms) de creación del proyecto. */
  createdAt: number
  /** Timestamp Unix (ms) de última modificación. */
  updatedAt: number

  // Relacional / config
  /** ID del cliente asociado al proyecto (referencia a colección `clientes`). */
  clienteId: string
  /** ID del electricista o proyectista responsable. */
  electricistaId: string
  estado: ProjectEstado
  /**
   * Sistema de distribución de la instalación según IEC 60364:
   * - TT: neutro de la fuente y masas a tierra independiente
   * - IT: fuente aislada o impedante
   * - TN-S/C/C-S: neutro y conductor de protección (separados, combinados o mixtos)
   */
  sistemaDistribucion?: 'TT' | 'IT' | 'TN-S' | 'TN-C' | 'TN-C-S'
  inmueble: Inmueble
  suministro: Suministro

  // Configuración de dibujo / plano (plana)
  escala: number
  grosor_pared_default: number
  alturaDefault: number

  // Entidades internas
  ambientes: Ambiente[]
  circuitos: Circuito[]
  conexiones: Conexion[]
  tableros: Tablero[]
  diferenciales: Diferencial[]
  tramos: TramoConductor[]
  unifilDiagrams: UnifilDiagram[]
  hojasMaestras: HojaMaestra[]

  /** Campañas de medición eléctrica del proyecto. */
  campanias: Campania[]
  /** Mediciones registradas en el contexto de campañas. */
  medicionesCampania: MedicionCampania[]

  /** UIDs de usuarios con acceso compartido de lectura/edición. */
  sharedWith?: string[]
}

/**
 * Agrupa un conjunto de ambientes bajo un nombre de hoja imprimible.
 * Permite organizar el proyecto en varias láminas de plano.
 */
export interface HojaMaestra {
  id: string
  nombre: string
  descripcion?: string
  /** IDs de los ambientes incluidos en esta hoja. */
  ambientesIds: string[]
}

/**
 * Tipos de elemento que pueden actuar como cabecera de un tablero eléctrico.
 * - `TM`: Termomagnético
 * - `DR`: Diferencial
 */
export type TipoElementoCabecera = 'seccionador' | 'interruptor_seccionador' | 'TM' | 'DR' | 'otro';

/**
 * Configuración del elemento de cabecera (principal) de un tablero.
 */
export interface CabeceraConfig {
  tipo: TipoElementoCabecera;
  /** Cantidad de polos del dispositivo de cabecera. */
  polos?: 2 | 3 | 4;
  /** Corriente nominal en Amperios. */
  inominalA?: number;
  /** Sensibilidad del diferencial de cabecera en miliamperios (si aplica). */
  sensibilidadMA?: number;
  descripcion?: string;
}

// ─── CIRCUITOS ───

/**
 * Tipos de circuito según la clasificación de la instalación eléctrica de BT:
 * - `IUG/IUE`: Iluminación uso general/especial
 * - `TUG/TUE`: Tomas uso general/especial
 * - `ACU`: Acometida / Alimentador
 * - `MBT/MBTF`: Muy Baja Tensión (funcional)
 * - `TEC`: Tomacorriente especial (climatización, etc.)
 * - `DPS`: Dispositivo de Protección contra Sobretensiones
 */
export type TipoCircuito = 'IUG' | 'IUE' | 'TUG' | 'TUE' | 'ACU' | 'MBT' | 'MBTF' | 'TEC' | 'DPS' | 'OTRO';

/**
 * Método de canalización del conductor eléctrico.
 */
export type TipoConducto = 'cano_rigido' | 'bandeja' | 'enterrado' | 'canaleta' | 'otro';

/**
 * Representa un circuito eléctrico dentro de un tablero.
 * Contiene todos los parámetros necesarios para el cálculo de sección,
 * caída de tensión y selección de protecciones.
 */
export interface Circuito {
  id: string;
  nombre: string;
  tipo: TipoCircuito;
  tableroId: string;           // ID del tablero al que pertenece (obligatorio)
  seccionBase?: number;        // Sección troncal del cable en mm² (ej: 2.5)
  conductoresBase?: number;    // Cantidad de conductores troncales (ej: 3)
  color?: string;              // Color para visualización
  descripcion?: string;
  parentId?: string;           // ID del elemento aguas arriba (ej: Diferencial u otro circuito)
}

// ─── TABLERO ───

/**
 * Representa un tablero eléctrico dentro del proyecto.
 * Puede ser general (origen de la instalación), seccional o auxiliar.
 */
export interface Tablero {
  id: string;
  nombre: string;
  tipo: 'general' | 'seccional' | 'auxiliar';
  /** Descripción textual de la ubicación física en el inmueble. */
  ubicacion?: string;
  elementoId?: string;         // ID del ElementoElectrico que lo representa
  ambienteId?: string;         // ID del Ambiente donde está físicamente
  factorSimultaneidad?: number; // default 1.0, editable por el proyectista
  diferencialesIds?: string[];   // IDs de diferenciales instalados en este tablero
  /** ID del tablero del que recibe alimentación, o `'red_distribuidora'` si es el origen. */
  alimentadorDesdeTableroId?: string | 'red_distribuidora'; // ID del tablero aguas arriba o red
  alimentadorDesdeCircuitoId?: string; // ID del circuito que oficia de alimentador en el tablero superior
  interruptorCabecera?: CabeceraConfig; // Elemento de cabecera del tablero
}

// ─── DIFERENCIAL ───

/**
 * Interruptor diferencial instalado en un tablero.
 * Protege un grupo de circuitos contra corrientes de falla a tierra.
 */
export interface Diferencial {
  id: string;
  /** ID del tablero donde está instalado físicamente este diferencial. */
  tableroId: string;
  /** Sensibilidad de disparo en miliamperios (30 mA = protección personal). */
  sensibilidadMA: 10 | 30 | 100 | 300 | 500;
  /**
   * Tipo de diferencial según la forma de onda que detecta:
   * - `AC`: solo corriente alterna sinusoidal
   * - `A`: CA + corriente pulsante rectificada
   * - `F`: CA + pulsos rectificados + alta frecuencia
   * - `B`: universal (CA, CC y alta frecuencia)
   * - `S`: selectivo (con retardo de tiempo)
   * - `G`: selectivo para grupos
   */
  tipo: 'AC' | 'A' | 'F' | 'B' | 'S' | 'G';
  /** Corriente nominal en Amperios. */
  inominalA: number;
  polos: 2 | 4;
  circuitosIds: string[];       // circuitos que protege
  descripcion?: string;
  parentId?: string;            // ID del elemento aguas arriba en el unifilar
}

// ─── TRAMO CONDUCTOR ───

/**
 * Representa un segmento físico de conductor entre dos puntos del plano.
 * Permite calcular longitudes reales de canalización para cada conexión.
 */
export interface TramoConductor {
  id: string;
  /** ID de la Conexion (netlist) a la que pertenece este tramo. */
  conexionId: string;
  /**
   * Origen de la longitud del tramo:
   * - `auto`: calculado a partir de las coordenadas de los puntos en el plano
   * - `manual`: ingresado explícitamente por el proyectista
   * - `interhoja`: tramo entre ambientes en distintas hojas del plano
   */
  tipo: 'auto' | 'manual' | 'interhoja';
  longitudAuto?: number;        // calculada desde coordenadas, solo si mismo ambiente
  longitudManual?: number;      // ingresada por usuario
  longitudEfectiva: number;      // manual tiene prioridad sobre auto
  descripcion?: string;         // ej: "bajada desde techo", "cruce de jardín"
}

// ─── CONEXIONES (NETLIST) ───

/**
 * Conductor individual que forma parte de una conexión eléctrica.
 */
export interface Cable {
  /** Función eléctrica del conductor dentro del circuito. */
  tipo: 'fase' | 'neutro' | 'pe' | 'comando' | 'retorno';
  seccion: number;             // mm²
  color?: string;
  referencia?: string;         // Ej: "a", "b" para enlazar retornos con llaves y bocas
}

/**
 * Indica cómo se determina la longitud de una conexión:
 * - `calculada`: derivada automáticamente del plano
 * - `declarada`: ingresada manualmente por el proyectista
 * - `por_tramos`: suma de tramos individuales definidos en TramoConductor
 */
export type OrigenLongitud = 'calculada' | 'declarada' | 'por_tramos';

/**
 * Conexión eléctrica entre dos elementos del plano (netlist).
 * Representa el tendido físico de conductores entre un origen y un destino.
 */
export interface Conexion {
  id: string;
  circuitoId?: string;         // LEGACY
  circuitosIds?: string[];     // NUEVO: Soporta múltiples circuitos
  /** Elemento eléctrico de origen de la conexión (tablero o punto de partida). */
  from: { ambienteId: string; elementoId: string };
  /** Elemento eléctrico de destino de la conexión (boca, toma, luminaria, etc.). */
  to: { ambienteId: string; elementoId: string };
  cables: Cable[];
  conducto?: string;
  tipoConducto?: TipoConducto;
  normaCable?: string;         // Norma del conductor para este tramo (ej: IRAM 247-3, IRAM 2178)
  origenLongitud?: OrigenLongitud;
  /** Sección de conducción del conducto (diámetro interior) en milímetros. */
  seccionConduccion?: number;  // mm
  descripcion?: string;
  referencia?: string;         // Etiqueta en plano (ej: C1, X1)
}

// ─── AMBIENTE ───

/**
 * Condición de exposición ambiental del local:
 * - `interior`: dentro del envolvente protegido del edificio
 * - `exterior`: a la intemperie
 * - `semi_cubierto`: galería, pérgola u otras situaciones intermedias
 */
export type TipoAmbiente = 'interior' | 'exterior' | 'semi_cubierto';

/**
 * Local o espacio físico dentro del proyecto. Contiene el polígono de planta,
 * aberturas, elementos eléctricos y estructurales, y metadatos de configuración.
 */
export interface Ambiente {
  id: string
  nombre: string
  /** Etiqueta corta para identificar el ambiente en plano (ej: "D1", "BA"). */
  etiqueta?: string
  tipoAmbiente?: TipoAmbiente
  /** Sentido de trazado del polígono de paredes. */
  sentido: 'horario' | 'antihorario'
  /** Altura libre del local en metros. */
  alturaLocal?: number
  /** Lista plana de paredes. Reemplaza a tramos[]. */
  paredes: Pared[]
  /** @deprecated Usar paredes[]. Se mantiene solo para migración de datos legacy. */
  tramos?: Tramo[]
  aberturas: Abertura[]
  escaleras?: Escalera[]
  elementos: ElementoElectrico[]
  /** Zonas de cobertura de techo (losa, galería, sin techo, etc.). */
  coberturas?: ZonaCobertura[]
  elementosEstructurales?: ElementoEstructural[]
  /** Textos libres superpuestos en el plano del ambiente. */
  textos?: TextoPlano[]
  /** Configuración de la hoja de impresión asociada al ambiente. */
  configHoja?: ConfigHoja
  /** Indica si se deben mostrar las cotas de dimensionamiento en el plano. */
  mostrar_cotas: boolean
  /** Tamaño de fuente de las cotas en el plano. */
  cotaSize?: number
  /** Rotación del ambiente en el canvas, en grados. */
  rotation?: number
  /** Posición X del ambiente en el canvas global. */
  posX?: number
  /** Posición Y del ambiente en el canvas global. */
  posY?: number
}

/** @deprecated Solo para migración de datos legacy. */
export interface Tramo {
  id: string
  cerrado: boolean
  paredes: Pared[]
  origenX?: number
  origenY?: number
  amarre?: PuntoAmarre
}

/** @deprecated Solo para migración de datos legacy. */
export interface PuntoAmarre {
  tipo: 'vertice' | 'medida_libre' | 'pendiente'
  ambienteRefId?: string
  tramoRefId?: string
  verticeRefIdx?: number
  offsetX?: number
  offsetY?: number
}

/**
 * Zona de cobertura de techo asociada a un ambiente exterior o semi-cubierto.
 * Se define mediante una secuencia de segmentos (largo y ángulo).
 */
export interface ZonaCobertura {
  id: string
  tipo: 'total' | 'galeria' | 'pergola' | 'sin_techo'
  /** Segmentos que definen el perímetro de la zona de cobertura. */
  segmentos: { largo: number; angulo: number }[]
  origenX?: number
  origenY?: number
}

/**
 * Elemento estructural del inmueble visible en el plano (columna, viga, pilar).
 * Se dibuja como referencia para el posicionamiento de canalizaciones.
 */
export interface ElementoEstructural {
  id: string
  tipo: 'columna' | 'viga' | 'pilar'
  /** Posición X dentro del ambiente en metros. */
  x: number
  /** Posición Y dentro del ambiente en metros. */
  y: number
  ancho?: number
  profundidad?: number
  descripcion?: string
}

/**
 * Configuración de la hoja de impresión asociada a un ambiente.
 */
export interface ConfigHoja {
  formato: 'A5' | 'A4' | 'A3' | 'A2' | 'A1' | 'A0'
  orientacion: 'vertical' | 'horizontal'
  escalaSimbolos?: number
}

// ─── PARED ───

/**
 * Segmento de pared que forma parte del polígono de un ambiente.
 * Encadenadas en orden, las paredes definen el perímetro del local.
 */
export interface Pared {
  id: string
  /** Longitud de la pared en metros. `'auto'` calcula el largo por cierre de polígono. */
  largo: number | 'auto'
  /** Ángulo relativo respecto a la pared anterior, en grados. */
  angulo: number
  /** Espesor de la pared en metros. `null` indica pared sin grosor (virtual). */
  grosor: number | null
  /** Definición de una esquina saliente en el extremo final de la pared. */
  esquina_saliente: { ancho: number } | null
  irregularidades: Irregularidad[]
  /** Índice de la pared de referencia para el sistema de amarres (si aplica). */
  refParedIdx?: number
  /** Distancia al punto de referencia en el sistema de amarres, en metros. */
  refDistancia?: number
}

/**
 * Entrante o saliente en el trazado de una pared (nichos, columnas integradas, etc.).
 */
export interface Irregularidad {
  /** Posición del inicio de la irregularidad a lo largo de la pared, en metros. */
  posicion: number
  /** Ancho de la irregularidad en metros. */
  ancho: number
  /** Profundidad de la irregularidad en metros (siempre positivo). */
  profundidad: number
  /** Lado de la pared hacia donde se proyecta la irregularidad. */
  lado?: 'interior' | 'exterior'
}

// ─── ESCALERA ───

/**
 * Representa una escalera que vincula dos niveles o ambientes del proyecto.
 */
export interface Escalera {
  id: string;
  /** Índice de la pared sobre la que se apoya la escalera (`null` si es libre). */
  paredIdx: number | null;
  /** Posición a lo largo de la pared en metros. */
  posicion: number;
  ancho: number;
  sentido: 'sube' | 'baja';
  /**
   * Forma geométrica de la escalera:
   * - `recta`: tramo recto simple
   * - `L_der/L_izq`: en L con giro a derecha o izquierda
   * - `U_der/U_izq`: en U (dos giros)
   * - `caracol`: escalera helicoidal
   */
  forma: 'recta' | 'L_der' | 'L_izq' | 'U_der' | 'U_izq' | 'caracol';
  /** Longitud del primer tramo en metros. */
  largo1: number;
  /** Longitud del segundo tramo (solo en formas L y U). */
  largo2?: number;
  /** Radio de la escalera caracol en metros. */
  radio?: number;
  /** ID del ambiente al que se accede por esta escalera. */
  ambienteVecinoId?: string;
  /** ID de la escalera espejo en el ambiente vecino. */
  escaleraVecinaId?: string;
}

// ─── ABERTURA ───

/** Subtipos de puerta disponibles para representación gráfica. */
export type SubtipoPuerta = 'batiente' | 'corrediza' | 'vaiven' | 'pivotante';
/** Subtipos de ventana disponibles para representación gráfica. */
export type SubtipoVentana = 'abatible' | 'corrediza' | 'guillotina' | 'pivotante' | 'fija';

/**
 * Hueco en una pared que representa una puerta, ventana o vano libre.
 */
export interface Abertura {
  id: string
  /** Índice de la pared donde se ubica la abertura. */
  pared: number
  tipo: 'puerta' | 'ventana' | 'vano';
  subtipo?: SubtipoPuerta | SubtipoVentana;
  /** Posición del inicio de la abertura a lo largo de la pared, en metros. */
  posicion: number
  ancho: number
  /** Cantidad de hojas de la puerta o ventana. */
  hojas: number
  /** Lado de apertura de la hoja (ej: 'izquierda', 'derecha'). */
  lado: string
  /** Sentido de apertura (ej: 'interior', 'exterior'). */
  sentido: string
  /** Indica si es la puerta principal de acceso al inmueble. */
  esPrincipal?: boolean;
  /** ID del ambiente contiguo accesible a través de esta abertura. */
  ambienteVecinoId?: string;
  /** ID de la abertura espejo en el ambiente vecino (para vinculación bidireccional). */
  aberturaVecinaId?: string;
  /** Índice de la pared en el ambiente vecino donde se ubica la abertura espejo. */
  paredVecinaIdx?: number;
}

// ─── ELEMENTO ELÉCTRICO ───

/**
 * Elemento de la instalación eléctrica posicionado en el plano de un ambiente.
 * Puede representar bocas de salida, tomas, tableros, puntos de puesta a tierra,
 * sensores, cámaras, etc. El tipo es una cadena libre para máxima extensibilidad.
 */
export interface ElementoElectrico {
  id: string;
  /** Tipo de elemento (ej: 'toma', 'luz', 'tablero', 'pat', 'camara'). */
  tipo: string;
  /** Código o etiqueta de referencia visible en el plano (ej: 'T1', 'L3'). */
  referencia: string;
  /** Posición X dentro del ambiente en metros. */
  x: number;
  /** Posición Y dentro del ambiente en metros. */
  y: number;
  /** Índice de la pared sobre la que está adosado el elemento (`null` si es de techo o piso). */
  paredIdx: number | null;
  /** Posición a lo largo de la pared en metros (`null` si no está sobre pared). */
  paredPos: number | null;
  /** Datos configurables del elemento (clave-valor), usados en fichas técnicas. */
  datos: { clave: string; valor: string }[];
  /** Indica si se muestra el primer dato del array como etiqueta en el plano. */
  mostrarDato: boolean;
  /** Altura de montaje en metros sobre el nivel de piso terminado. */
  altura?: number;
  /** ID del circuito al que pertenece (legacy, un solo circuito). */
  circuitoId?: string;
  sistemaId?: string;          // NUEVO: ID del sistema MBT
  estado?: 'existente' | 'proyectado' | 'a_reemplazar'; // NUEVO
  /** Indica si este elemento representa un tablero eléctrico en el plano. */
  esTablero?: boolean;
  /** ID de la columna estructural a la que está vinculado (si aplica). */
  columnaId?: string;
  /** Lado de la pared donde se ubica el elemento (para elementos pasantes o doble faz). */
  lado?: 'interior' | 'exterior';
  /** Resultado de medición de puesta a tierra registrado directamente en el elemento. */
  medicionPAT?: {
    /** Resistencia de puesta a tierra medida en Ohms. */
    valorOhms: number;
    /** Método de medición utilizado. */
    metodo: 'caida_tension' | 'dos_puntas';
    /** Fecha de la medición en formato ISO 8601. */
    fecha: string;
  };
}

/**
 * Texto libre posicionado en el plano de un ambiente.
 * Permite agregar anotaciones o rótulos sin asociarlos a elementos eléctricos.
 */
export interface TextoPlano {
  id: string;
  texto: string;
  /** Posición X dentro del ambiente en metros. */
  x: number;
  /** Posición Y dentro del ambiente en metros. */
  y: number;
  /** Tamaño de fuente en unidades del canvas. */
  tamano: number;
}
