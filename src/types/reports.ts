export type ProtocolStatus = 'borrador' | 'completo' | 'firmado'
export type ItemStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'no_aplica'
export interface ProtocolMeta {
  protocolId: string
  projectId: string
  tipo: 'srt_900_15' | 'puesta_tierra' | 'diferencial'
  status: ProtocolStatus
  operador: string
  fechaCierre?: number
  snapshotInventarioId?: string
  numeroProtocolo?: string
}
export interface ReportMeta {
  reportId: string
  protocolId: string
  projectId: string
  formato: 'pdf' | 'csv'
  storageUrl: string
  generadoEn: number
  appVersion?: string
}
