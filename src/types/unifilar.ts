/**
 * tipos/unifilar.ts
 * Estructura de datos para diagrama unifilar paramétrico IEC 60617
 */

import type { TipoConducto } from './project'

// ─── NODO DEL DIAGRAMA UNIFILAR ───

export type UnifilNodeTipo =
  | 'alimentador'              // línea de entrada al tablero
  | 'seccionador'
  | 'seccionador_nh'           // portafusible tipo NH
  | 'interruptor_seccionador'
  | 'termomagnetico'           // TM / termomagnético
  | 'diferencial'              // DR
  | 'diferencial_selectivo'
  | 'caja_moldeada'            // MCCB
  | 'barra_distribuidora'
  | 'peine'                    // distribuidor tipo peine
  | 'borne'
  | 'barra_equipotencial'
  | 'dps'                      // protector de sobretensión
  | 'circuito_terminal'        // representación final del circuito (salida)

export interface UnifilNodeParams {
  polos?: 2 | 3 | 4
  inominalA?: number
  sensibilidadMA?: number      // solo diferencial
  curvaDisparo?: 'B' | 'C' | 'D'  // solo TM / caja moldeada
  fusibleA?: number            // solo NH
  cantSalidas?: number         // solo barra/peine
  icuKA?: number               // poder de corte (caja moldeada)
  descripcionLibre?: string
}

export interface UnifilNode {
  id: string
  tipo: UnifilNodeTipo
  tableroId: string
  label?: string
  
  // Referencia al elemento del modelo real (si existe)
  circuitoId?: string
  diferencialId?: string
  interruptorCabeceraRef?: boolean  // true si representa el campo `interruptorCabecera` del tablero
  
  // Posición en el canvas (calculada automáticamente, editable)
  posX: number
  posY: number
  
  // Metadatos del elemento para renderizado del símbolo
  params: UnifilNodeParams
}

// ─── DESCRIPCIÓN DE CONDUCTORES ───

export interface UnifilConductorDesc {
  cantFases: 1 | 2 | 3
  conNeutro: boolean
  conPE: boolean
  seccionMM2: number
  material?: 'Cu' | 'Al'
  tipoConducto?: TipoConducto
}

// ─── CONEXIÓN ENTRE NODOS ───

export interface UnifilEdge {
  id: string
  tableroId: string
  fromNodeId: string
  toNodeId: string
  
  // Representación del cable en unifilar (línea oblicua IEC)
  conductores?: UnifilConductorDesc
}

// ─── DIAGRAMA COMPLETO DE UN TABLERO ───

export interface UnifilDiagram {
  tableroId: string
  nodes: UnifilNode[]
  edges: UnifilEdge[]
}
