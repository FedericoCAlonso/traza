export type SymbolUsage = 'planta' | 'unifilar'
export type SymbolCategory = 'iluminacion' | 'tomacorrientes' | 'protecciones' | 'tableros' | 'medicion' | 'custom'

export type SymbolId = string;

export interface AnchorPoint {
  x: number
  y: number
  label?: string
}
export interface ElectricalSymbol {
  id: string
  nombre: string
  categoria: SymbolCategory
  uso: SymbolUsage
  svgPath: string
  escalaBase: number
  anchorPoints?: AnchorPoint[]
  norma?: string
  ownerId?: string
  createdAt?: number
}
