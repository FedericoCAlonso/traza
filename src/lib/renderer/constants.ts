// ═══════════════════════════════════════════════════════════════════════════
// MODULE: renderer/constants.ts
// Configuración visual: Colores, grosores de línea y offsets.
// ═══════════════════════════════════════════════════════════════════════════

export const C = {
  PARED_FILL: '#D0D0D0', // Color de relleno de los muros
  EXT: '#111111',        // Línea de cara externa (Negro)
  INT: '#444444',        // Línea de cara interna (Gris para editor)
  MASTER_LINE: '#000000',// Color único para todas las líneas en plano maestro
  EXT_W: 1.2,            // Grosor línea externa
  INT_W: 0.4,            // Grosor línea interna
  INT_FILL: '#F8F8F0',   // Color de fondo del interior del ambiente
  COTA: '#1040A0',       // Color de las líneas de dimensión
  VENTANA: '#3366AA',    // Color para representar carpintería de vidrio
  PUERTA: '#222222',     // Color para carpintería de madera/metal
  ELEC: '#CC0000',       // Rojo técnico para elementos eléctricos
  MARGEN: 80,            // Margen de seguridad (padding) del SVG
  COTA_OFF: 0.50,        // Distancia de la cota respecto al muro (metros)
  COTA_ARR: 0.12,        // Largo de los "arrastres" o terminales de cota
  COTA_MAR: 0.08,        // Margen del texto sobre la línea de cota
  COTA_SIZE_DEFAULT: 2.5 // mm en papel
} as const;
