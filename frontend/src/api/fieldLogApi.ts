import { tarimAiFetch as apiFetch } from './tarimAi'

export interface FieldLogEntry {
  id: string
  entryCode: string
  producerId: string
  userId: string
  parcelId: string
  operationType: string
  operationDate: string
  status: string
  description?: string
  verificationStatus?: string
  reviewStatus?: string
}

export const fieldLogApi = {
  getLogsByProducer: (producerId: string) => 
    apiFetch<FieldLogEntry[]>(`/api/field-logs?producerId=${producerId}`),
  
  getLogsByParcel: (parcelId: string) => 
    apiFetch<FieldLogEntry[]>(`/api/field-logs?parcelId=${parcelId}`),

  createDraft: (data: any) => 
    apiFetch<FieldLogEntry>('/api/field-logs', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  submitLog: (id: string) => 
    apiFetch<FieldLogEntry>(`/api/field-logs/${id}/submit`, {
      method: 'POST'
    }),

  expertReview: (id: string, action: 'verify' | 'request-revision' | 'reject', reviewNotes?: string) => 
    apiFetch<FieldLogEntry>(`/api/field-logs/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify({ status: action === 'verify' ? 'VERIFIED' : action === 'reject' ? 'REJECTED' : 'REVISION_REQUIRED', reviewNotes })
    }),

  addInputUsage: (id: string, data: any) =>
    apiFetch<any>(`/api/field-logs/${id}/inputs`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  addEvidence: (id: string, data: any) =>
    apiFetch<any>(`/api/field-logs/${id}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
}
