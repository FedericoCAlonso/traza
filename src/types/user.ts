/**
 * Plan de suscripción del usuario en la plataforma.
 * - `free`: acceso gratuito con funcionalidades limitadas
 * - `beta`: acceso completo durante la etapa de pruebas cerradas
 * - `pro`: plan pago con todas las funcionalidades habilitadas
 */
export type UserPlan = 'free' | 'beta' | 'pro'

/**
 * Perfil de usuario autenticado en la aplicación.
 * Almacenado en Firestore bajo la colección `users/{uid}`.
 */
export interface AppUser {
  /** UID único asignado por Firebase Authentication. */
  uid: string
  email: string
  displayName?: string
  plan: UserPlan
  /** Timestamp Unix (ms) de la primera vez que el usuario inició sesión. */
  createdAt: number
  /** Datos profesionales opcionales del electricista. */
  perfil?: {
    /** CUIT del profesional (formato sin guiones). */
    cuit?: string
    telefono?: string
    domicilioProfesional?: string
  }
  /** Matrículas habilitantes del profesional, puede tener varias por jurisdicción. */
  matriculas?: {
    numero: string
    /** Colegio de Ingenieros o entidad habilitante que otorgó la matrícula. */
    colegio: string
    /** Provincia o municipio de habilitación. */
    jurisdiccion: string
    /** Timestamp Unix (ms) de vencimiento de la matrícula. */
    vencimiento?: number
  }[]
  /** Instrumentos de medición registrados en el perfil del profesional. */
  instrumentos?: {
    id: string
    /** Tipo de instrumento (ej: 'telurímetro', 'megóhmetro', 'analizador de redes'). */
    tipo: string
    marca: string
    modelo: string
    nroSerie?: string
    /** Timestamp Unix (ms) de la última calibración. */
    fechaCalibracion?: number
    /** Ruta del certificado de calibración en Firebase Storage. */
    certificadoStoragePath?: string
  }[]
}

// ─── ELECTRICISTA (Perfil Técnico) ───

/**
 * Matrícula habilitante de un profesional electricista.
 * Puede existir una por cada jurisdicción donde esté habilitado.
 */
export interface Matricula {
  numero: string
  /** Colegio o entidad que emitió la matrícula. */
  colegio: string
  /** Provincia o municipio de habilitación. */
  jurisdiccion: string
}

/**
 * Instrumento de medición eléctrica registrado en el perfil del profesional.
 * Incluye datos de trazabilidad de calibración para informes técnicos.
 */
export interface Instrumento {
  id: string
  /** Categoría del instrumento (ej: 'telurímetro', 'megóhmetro'). */
  tipo: string
  marca: string
  modelo: string
  nroSerie: string
  /** Datos del último certificado de calibración válido. */
  calibracion?: {
    /** Número identificatorio del certificado emitido por el laboratorio. */
    certificadoNro: string
    /** Timestamp Unix (ms) de la fecha de emisión del certificado. */
    fechaEmision: number
    /** Timestamp Unix (ms) de la fecha de vencimiento de la calibración. */
    fechaVencimiento: number
    /** Nombre del laboratorio acreditado que realizó la calibración. */
    laboratorio: string
    /** Magnitudes o rangos cubiertos por la calibración. */
    alcance: string
    adjuntoPath?: string      // URL de Storage si se sube PDF
  }
}

/**
 * Perfil extendido de un usuario con rol de electricista o instalador matriculado.
 * Extiende `AppUser` con campos obligatorios para la habilitación profesional.
 */
export interface Electricista extends AppUser {
  /** CUIT del profesional (obligatorio para emitir documentación técnica). */
  cuit: string
  telefono: string
  domicilioProfesional: string
  matriculas: Matricula[]
  instrumentos: Instrumento[]
}

// ─── CLIENTE ───

/**
 * Cliente o comitente de un proyecto eléctrico.
 * Puede ser una persona física o jurídica (empresa).
 */
export interface Cliente {
  id: string
  /** Nombre completo o razón social del cliente. */
  razonSocial: string
  /** DNI (persona física) o CUIT (persona jurídica). */
  dniCuit?: string
  email?: string
  telefono?: string
  domicilio?: string
  /** Nombre de la persona de contacto en caso de ser una empresa. */
  contacto?: string
  /** Timestamp Unix (ms) de creación del registro del cliente. */
  createdAt: number
  /** IDs de proyectos asociados a este cliente. */
  proyectosIds?: string[]
}
