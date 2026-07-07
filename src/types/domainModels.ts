// =============================================================================
// ENUMS GLOBALES
// =============================================================================

/** Nivel de tensión eléctrica (Baja, Media o Alta Tensión) */
export type NivelTension = 'BT' | 'MT' | 'AT';

/** Tipo de conexión o acometida a la red eléctrica */
export type TipoConexion =
  | 'monofasica_2h'
  | 'monofasica_3h'
  | 'bifasica'
  | 'trifasica_3h'
  | 'trifasica_4h'
  | 'trifasica_5h';

/** Esquema de conexión a tierra (p.ej. TT, TN-S) */
export type EsquemaTierra = 'tt' | 'tn-s' | 'tn-c' | 'tn-c-s' | 'it';

/** Categoría de tarifa asignada por la distribuidora de energía */
export type TipoTarifa = 'T1R' | 'T1G' | 'T2' | 'T3' | 'AP' | 'otro';

/** Material conductor de los cables eléctricos (Cobre o Aluminio) */
export type MaterialConductor = 'Cu' | 'Al';

/** Tipo de aislamiento del conductor eléctrico */
export type TipoAislacion = 'PVC' | 'XLPE' | 'EPR' | 'desnudo';

/** Modo de montaje/instalación física de canalizaciones o conductores */
export type TipoMontaje =
  | 'embutido'
  | 'aplicado'
  | 'suspendido'
  | 'subterraneo'
  | 'subterraneo_directo'
  | 'aereo'
  | 'encastrado';

/** Tipo de dispositivo de protección eléctrica */
export type TipoProteccion =
  | 'termomagnetica'
  | 'diferencial'
  | 'magnetico'
  | 'fusible'
  | 'DPS';

/** Tipo de canalización o envolvente física de infraestructura */
export type TipoInfraestructura =
  | 'caño_rigido'
  | 'caño_flexible'
  | 'bandeja_perforada'
  | 'bandeja_ciega'
  | 'cable_canal'
  | 'zocalo_canal'
  | 'caja_pase'
  | 'caja_derivacion'
  | 'gabinete'
  | 'tablero_embutido';

/** Tipo de módulo o accesorio terminal (llaves, tomas, etc.) */
export type TipoModulo =
  | 'tomacorriente_2p'
  | 'tomacorriente_2pt'
  | 'tomacorriente_trifasico'
  | 'llave_simple'
  | 'llave_doble'
  | 'llave_conmutada'
  | 'llave_cruzada'
  | 'luminaria'
  | 'señalizacion'
  | 'timbre_zumbador'
  | 'persiana_motor';

/** Tipo de instrumento de medición o indicador visual */
export type TipoMedicion =
  | 'medidor_kWh'
  | 'medidor_bidirecional'
  | 'TC'
  | 'TP'
  | 'voltimetro'
  | 'amperimetro'
  | 'analizador_de_redes'
  | 'ojo_de_buey';

/** Fuentes de generación distribuida o respaldo de energía */
export type TipoGeneracion =
  | 'grupo_electrogeno'
  | 'panel_fotovoltaico'
  | 'inversor_fv'
  | 'inversor_bateria'
  | 'bateria'
  | 'ups';

/** Elementos componentes de la puesta a tierra (PAT) */
export type TipoPAT = 'jabalina' | 'malla_equipotencial' | 'placa_enterrada' | 'conductor_pat';

/** Tipos de conexiones mecánicas o empalmes en la instalación */
export type TipoConexionPuntual = 'terminal' | 'bornera' | 'conector_ficha' | 'empalme';

// =============================================================================
// CAPA 1: CATÁLOGO — ElementoElectrico y subclases
// =============================================================================

/**
 * Interfaz base para cualquier elemento eléctrico del catálogo.
 * Define los atributos comunes de inventariado, especificación técnica y costos.
 */
export interface ElementoElectricoBase {
  /** Identificador único universal (UUID) del elemento */
  codigo_ref: string;
  /** Nombre comercial o descriptivo del elemento */
  nombre: string;
  /** Marca comercial del fabricante */
  marca?: string;
  /** Modelo o línea del fabricante */
  modelo?: string;
  /** Costo o precio de referencia por unidad de medida */
  precio_unitario: number;
  /** Unidad en la que se cuantifica el elemento (ej: "unidad", "metro") */
  unidad_medida: string;
  /** Nivel de tensión nominal en el que opera el elemento */
  nivel_tension: NivelTension;
  /** Notas aclaratorias o detalles adicionales */
  notas?: string;
  /** Discriminador para el subtipo específico de elemento */
  tipo_elemento: string;
}

/**
 * Canalización o envolvente física que aloja a los conductores eléctricos.
 */
export interface Infraestructura extends ElementoElectricoBase {
  tipo_elemento: 'infraestructura';
  /** Subtipo específico de infraestructura (ej: bandeja, caño, gabinete) */
  tipo: TipoInfraestructura;
  /** Tipo de instalación o montaje (embutido, suspendido, etc.) */
  montaje?: TipoMontaje;
  /** Longitud en metros del tramo (si aplica) */
  longitud_m?: number;
  /** Diámetro o ancho en milímetros */
  diametro_o_ancho_mm?: number;
  /** Alto o profundidad en milímetros */
  alto_mm?: number;
  /** Grado de protección contra ingreso de sólidos y líquidos (ej: "IP65") */
  grado_proteccion_ip?: string;
}

/**
 * Conductor o cable eléctrico para el transporte de corriente.
 */
export interface Conductor extends ElementoElectricoBase {
  tipo_elemento: 'conductor';
  /** Metal conductor del cable (Cu o Al) */
  material: MaterialConductor;
  /** Sección nominal del conductor en mm² */
  seccion_mm2: number;
  /** Número de polos o conductores activos contenidos en el cable */
  cantidad_conductores: number;
  /** Aislamiento dieléctrico del conductor (PVC, XLPE, etc.) */
  aislacion: TipoAislacion;
  /** Tensión nominal de diseño en Voltios */
  tension_nominal_v: number;
  /** Corriente máxima admisible según catálogo bajo condiciones de diseño (Amp) */
  corriente_admisible_a?: number;
}

/**
 * Dispositivo de protección contra sobrecorrientes, sobretensiones o fugas.
 */
export interface Proteccion extends ElementoElectricoBase {
  tipo_elemento: 'proteccion';
  /** Subtipo de protección (ej: termomagnética, diferencial, fusible) */
  tipo: TipoProteccion;
  /** Corriente nominal o de disparo (Calibre) en Amperios */
  corriente_nominal_a: number;
  /** Número de polos protegidos/maniobrables */
  polos: number;
  /** Tensión nominal de aislamiento en Voltios */
  tension_nominal_v: number;
  /** Poder de corte nominal ante cortocircuitos en kiloamperios (kA) */
  poder_de_corte_ka?: number;
  /** Sensibilidad de corriente diferencial de fuga en miliamperios (mA) */
  sensibilidad_diferencial_ma?: number;
  /** Nivel de protección de tensión residual Up en kilovoltios (kV) para DPS */
  nivel_proteccion_up_kv?: number;
}

/**
 * Elemento de maniobra y control de circuitos (contactores, llaves, etc.)
 */
export interface Maniobra extends ElementoElectricoBase {
  tipo_elemento: 'maniobra';
  /** Corriente nominal de maniobra en Amperios */
  corriente_nominal_a: number;
  /** Número de polos que interrumpe o conmuta */
  polos: number;
  /** Tensión de alimentación de la bobina de control en Voltios (ej: 24V, 220V) */
  tension_bobina_v?: number;
  /** Categoría de servicio bajo norma (ej: "AC-3" para motores) */
  categoria_utilizacion?: string;
}

/**
 * Módulos de efecto terminal instalados en cajas de pase (tomas, interruptores, luminarias).
 */
export interface Modulo extends ElementoElectricoBase {
  tipo_elemento: 'modulo';
  /** Tipo funcional del módulo (tomacorriente, interruptor, etc.) */
  tipo: TipoModulo;
  /** Corriente nominal admisible en Amperios (ej: 10A, 20A) */
  corriente_nominal_a?: number;
  /** Tensión nominal en Voltios */
  tension_nominal_v: number;
  /** Indica si cuenta con contacto para conexión de puesta a tierra */
  con_puesta_a_tierra: boolean;
  /** Potencia máxima admitida o consumida en Vatios (W) */
  potencia_w?: number;
  /** Flujo luminoso emitido en Lúmenes (para luminarias) */
  flujo_luminoso_lm?: number;
  /** Temperatura de color en Kelvin (para luminarias) */
  temperatura_color_k?: number;
}

/**
 * Equipos destinados a la medición y visualización de parámetros eléctricos.
 */
export interface Medicion extends ElementoElectricoBase {
  tipo_elemento: 'medicion';
  /** Tipo de instrumento de medición */
  tipo: TipoMedicion;
  /** Magnitud eléctrica que mide (ej: "Tensión", "Energía Activa") */
  magnitud_medida?: string;
  /** Protocolo o señal física de salida (ej: "4-20mA", "Modbus RTU") */
  señal_salida?: string;
  /** Clase de precisión del instrumento (ej: "Clase 1", "Clase 0.5") */
  clase_precision?: string;
}

/**
 * Fuentes generadoras distribuidas o sistemas de almacenamiento y respaldo energético.
 */
export interface Generacion extends ElementoElectricoBase {
  tipo_elemento: 'generacion';
  /** Subtipo de fuente o almacenamiento */
  tipo: TipoGeneracion;
  /** Potencia nominal aparente en kVA */
  potencia_nominal_kva: number;
  /** Tensión nominal de salida en Voltios */
  tension_salida_v: number;
  /** Tensión nominal de entrada o carga en Voltios */
  tension_entrada_v?: number;
  /** Rendimiento o eficiencia global en porcentaje */
  rendimiento_pct?: number;
  /** Autonomía estimada del sistema en horas */
  autonomia_horas?: number;
}

/**
 * Dispositivos y electrodos de la red de puesta a tierra.
 */
export interface PuestaATierra extends ElementoElectricoBase {
  tipo_elemento: 'puesta_a_tierra';
  /** Tipo físico del electrodo de dispersión o conductor */
  tipo: TipoPAT;
  /** Resistencia máxima recomendada en Ohms */
  resistencia_maxima_ohm?: number;
  /** Resistencia real obtenida en la última medición (Ohms) */
  resistencia_medida_ohm?: number;
  /** Sección transversal del conductor de PAT o equipotencial en mm² */
  seccion_mm2?: number;
}

/**
 * Accesorios de conexión puntual o empalme en borneras o cajas.
 */
export interface ConexionPuntual extends ElementoElectricoBase {
  tipo_elemento: 'conexion_puntual';
  /** Tipo específico de empalme o conector */
  tipo: TipoConexionPuntual;
  /** Corriente máxima admisible en Amperios */
  corriente_nominal_a?: number;
  /** Sección máxima de cable admitida en mm² */
  seccion_max_mm2?: number;
}

/** Unión de todos los tipos de elementos disponibles en el catálogo */
export type ElementoCatalogo =
  | Infraestructura
  | Conductor
  | Proteccion
  | Maniobra
  | Modulo
  | Medicion
  | Generacion
  | PuestaATierra
  | ConexionPuntual;

// =============================================================================
// CAPA 1.5: SUMINISTRO — Límite del sistema (frontera con la distribuidora)
// =============================================================================

/**
 * Describe las propiedades del punto de frontera o acometida con la distribuidora eléctrica.
 */
export interface PuntoSuministro {
  /** Identificador único del punto de suministro */
  codigo_ref: string;
  /** Nivel de tensión del suministro (generalmente BT) */
  nivel_tension: NivelTension;
  /** Tensión nominal provista por la distribuidora en Voltios */
  tension_nominal_v: number;
  /** Tipo de conexión (ej: monofásica, trifásica) */
  tipo_conexion: TipoConexion;
  /** Tarifa asignada por la distribuidora (T1R, T2, etc.) */
  tarifa: TipoTarifa;
  /** Potencia máxima contratada en kW */
  potencia_contratada_kw?: number;
  /** Demanda máxima simultánea prevista en kW */
  demanda_maxima_kw?: number;
  /** Nombre de la empresa distribuidora de energía eléctrica */
  empresa_distribuidora?: string;
  /** Número de Identificación de Suministro (NIS) */
  numero_nis?: string;
  /** Número de contrato administrativo */
  numero_contrato?: string;
  /** Breve descripción del punto de acometida */
  descripcion?: string;
}

/** Contexto contenedor de los puntos de acometida eléctrica del inmueble */
export interface ContextoSuministro {
  puntos: PuntoSuministro[];
}

// =============================================================================
// CAPA 2: GRAFO — Nodos y tramos de la instalación
// =============================================================================

/**
 * Representa un punto de interconexión eléctrica en el grafo de la instalación.
 * Puede corresponder a una caja de paso, un borne de tablero, un borne de un elemento, etc.
 */
export interface NodoInstalacion {
  /** Identificador único del nodo (UUID) */
  codigo_ref: string;
  /** Etiqueta corta o nombre identificatorio visible (ej: "TSGeneral") */
  etiqueta: string;
  /** Descripción del propósito del nodo */
  descripcion?: string;
  /** Nivel de tensión presente en el nodo */
  nivel_tension: NivelTension;
  /** Tensión nominal en Voltios */
  tension_nominal_v: number;
  /** UUID del elemento eléctrico asociado en el catálogo (si corresponde) */
  elemento_ref?: string;
  /** Indicación de la ubicación física o ambiente donde se encuentra el nodo */
  ubicacion?: string;
}

/**
 * Representa el vínculo físico y eléctrico entre dos nodos (un cable o línea).
 */
export interface TramoInstalacion {
  /** Identificador único del tramo (UUID) */
  codigo_ref: string;
  /** Etiqueta identificatoria del tramo (ej: "Subalimentador_A") */
  etiqueta: string;
  /** Nodo de origen (alimentación o upstream) */
  nodo_origen: string;
  /** Nodo de destino (consumo o downstream) */
  nodo_destino: string;
  /** UUID del cable/conductor asociado en el catálogo */
  conductor_ref: string;
  /** Longitud física del tramo en metros */
  longitud_m: number;
  /** Método de montaje utilizado en el tramo */
  montaje: TipoMontaje;
  /** UUID de la infraestructura de canalización utilizada (si corresponde) */
  infraestructura_ref?: string;
  /** UUID del circuito del dominio al que pertenece este tramo (si corresponde) */
  circuito_ref?: string;
  /** Indica si se permite flujo bidireccional de energía (ej: con paneles solares) */
  bidireccional: boolean;
}

/**
 * Define un circuito eléctrico conceptual dentro del dominio de la instalación.
 */
export interface CircuitoDominio {
  /** Identificador único del circuito (UUID) */
  codigo_ref: string;
  /** Etiqueta identificatoria del circuito (ej: "C1_IUG") */
  etiqueta: string;
  /** Descripción o función del circuito (ej: "Iluminación de Uso General") */
  descripcion?: string;
  /** UUID de la protección de cabecera asociada en el catálogo */
  proteccion_ref?: string;
  /** Nivel de tensión del circuito */
  nivel_tension: NivelTension;
  /** Uso o clasificación del circuito (ej: "IUG", "TUG", "MBTS") */
  uso?: string;
}

// =============================================================================
// CAPA 3: INSTALACIÓN — Raíz del modelo
// =============================================================================

/**
 * Modelo raíz de la instalación eléctrica. Agrupa todas las capas de datos:
 * Suministro de red, catálogo de elementos, grafo de nodos, tramos conductores y circuitos.
 */
export interface Instalacion {
  /** Identificador único del modelo de instalación */
  codigo_ref: string;
  /** Nombre descriptivo del modelo de instalación */
  nombre: string;
  /** Descripción detallada o alcances de la instalación */
  descripcion?: string;
  /** Contexto y puntos de suministro con la red externa */
  contexto_suministro: ContextoSuministro;
  /** Inventario de elementos eléctricos (catálogo del proyecto) */
  catalogo: Record<string, ElementoCatalogo>;
  /** Mapa de puntos de interconexión eléctrica en la instalación */
  nodos: Record<string, NodoInstalacion>;
  /** Mapa de tramos o cables de vinculación eléctrica */
  tramos: Record<string, TramoInstalacion>;
  /** Mapa de circuitos eléctricos de distribución configurados */
  circuitos: Record<string, CircuitoDominio>;
}
