export type OpsTaskItem = {
  id: string
  title: string
  producerId: string
  landId?: string
  dueDate?: string
  status: number
}

export type LandAlertItem = {
  id: string
  title: string
  landId: string
  landName?: string
  parcelNumber?: string
  dueDate?: string
  status: number
  message: string
}

export type OpsInspectionItem = {
  id: string
  title: string
  producerId: string
  scheduledDate: string
  status: number
}

export type OpsHarvestItem = {
  id: string
  productName: string
  producerId: string
  quantity: number
  unit: string
  harvestDate: string
  deliveredQuantity: number
  remainingQuantity: number
}

export type OpsActivityItem = {
  at: string
  kind: string
  title: string
  refId: string
}

export type LandMapStatus = 'normal' | 'today' | 'critical' | 'harvest'

export type LandMapItem = {
  id: string
  name: string
  latitude: number
  longitude: number
  mapStatus: LandMapStatus
  neighborhood?: string | null
  district?: string | null
  parcelNumber?: string | null
}

export type OperationsSummary = {
  producers: number
  lands: number
  activeSeasons: number
  pendingTasks: number
  overdueTasks: number
  openInspections: number
  harvestRecords: number
  activeProductionWorkflows: number
  unreadNotifications: number
  openConversations: number
  tasksDueToday: OpsTaskItem[]
  overdueTaskItems: OpsTaskItem[]
  landAlerts?: LandAlertItem[]
  pendingInspectionItems: OpsInspectionItem[]
  harvestPipeline: OpsHarvestItem[]
  recentActivity: OpsActivityItem[]
  mapLands?: LandMapItem[]
}

/** @deprecated Prefer OperationsSummary — kept for compatibility */
export type DashboardSummary = OperationsSummary

export type Producer = {
  id: string
  firstName: string
  lastName: string
  fullName: string
  nationalId: string
  phone: string
  email?: string
  address?: string
  isActive: boolean
}

export type ProducerNote = {
  id: string
  producerId: string
  authorUserId: string
  body: string
  createdAtUtc: string
}

export type Land = {
  id: string
  name: string
  parcelNumber: string
  sizeInDecares: number
  soilType?: string
  soilNotes?: string | null
  neighborhood?: string | null
  cadastralBlock?: string | null
  latitude?: number | null
  longitude?: number | null
  producerId?: string
  assignedOfficerUserId?: string
  isActive: boolean
  alertCount?: number
  mapStatus?: LandMapStatus
  activeCropType?: string | null
  activeWorkflowName?: string | null
  activeProduction?: {
    id: string
    seasonId: string
    workflowId: string
    workflowName: string
    cropType?: string | null
    status: number
    currentStepOrder: number
    producerId: string
  } | null
}

export type LandAlert = {
  id: string
  title: string
  dueDate?: string
  status: number
  message: string
  landId: string
  landName?: string
  parcelNumber?: string
}

export type LandNote = {
  id: string
  landId: string
  authorUserId: string
  body: string
  createdAtUtc: string
}

export type StaffUser = {
  id: string
  email?: string
  fullName: string
  phoneNumber?: string
}

export type LandProduction = {
  id: string
  landId: string
  seasonId: string
  workflowId: string
  workflowName: string
  cropType?: string | null
  producerId: string
  status: number
  currentStepOrder: number
  stepCount: number
  startedAtUtc?: string | null
  completedAtUtc?: string | null
}

export const PRODUCTION_WORKFLOW_STATUS: Record<number, string> = {
  0: 'Başlamadı',
  1: 'Devam ediyor',
  2: 'Tamamlandı',
  3: 'İptal',
}

export type Season = {
  id: string
  name: string
  year: number
  startDate: string
  endDate?: string
  status: number
  description?: string
}

export type WorkflowStep = {
  id?: string
  name: string
  /** Producer-facing guidance shown on the mobile task screen. */
  description?: string | null
  order: number
  dueDaysFromStart?: number | null
  requiresPhoto: boolean
  requiresQuantity: boolean
  requiresDate: boolean
  quantityUnit?: string | null
  videoUrl?: string | null
  imageUrl?: string | null
}

export type Workflow = {
  id: string
  name: string
  description?: string
  cropType?: string
  status: number
  steps: WorkflowStep[]
}

export type TaskPhoto = {
  id: string
  storageKey: string
  fileName: string
  contentType: string
  uploadedAtUtc: string
}

export type TaskItem = {
  id: string
  producerId: string
  landId: string
  title: string
  description?: string
  dueDate?: string
  status: number
  requiresPhoto: boolean
  requiresQuantity?: boolean
  requiresDate?: boolean
  quantityUnit?: string | null
  videoUrl?: string | null
  imageUrl?: string | null
  revisionReason?: string | null
  completedAtUtc?: string
  photoCount: number
  photos: TaskPhoto[]
}

export type ConversationListItem = {
  id: string
  subject: string
  lastMessagePreview?: string
  lastMessageAtUtc?: string
  status: number
  type?: number
  landId?: string
  officerUserId?: string
  adminUserId?: string
  hasUnread?: boolean
}

export type ChatMessage = {
  id: string
  senderUserId: string
  body: string
  sentAtUtc: string
}

export type ConversationDetail = {
  id: string
  subject: string
  producerUserId: string
  officerUserId?: string
  adminUserId?: string
  landId?: string
  type?: number
  messages: ChatMessage[]
}

export const CONVERSATION_TYPE = {
  Expert: 0,
  Staff: 1,
} as const

export type Inspection = {
  id: string
  landId: string
  producerId: string
  inspectorUserId: string
  title: string
  scheduledDate: string
  status: number
  result: number
  completedAtUtc?: string
}

export type HarvestRecord = {
  id: string
  seasonId: string
  producerId: string
  landId: string
  productName: string
  quantity: number
  unit: string
  harvestDate: string
  buyerName?: string | null
  unitPrice?: number | null
  totalAmount?: number | null
}

export type DeliveryRecord = {
  id: string
  harvestRecordId: string
  producerId: string
  quantity: number
  unit: string
  deliveryDate: string
  destination?: string
  notes?: string
}

export type SupportProgram = {
  id: string
  name: string
  supportType: string
  startDate: string
  endDate?: string
  status: number
  budget?: number
}

export type NotificationItem = {
  id: string
  title: string
  body: string
  isRead: boolean
  createdAtUtc: string
  relatedEntityType?: string
  relatedEntityId?: string
}

export const TASK_STATUS = [
  'Bekliyor',
  'Devam ediyor',
  'Onaylandı',
  'Gecikmiş',
  'İptal',
  'Onay bekliyor',
  'Düzeltme gerekli',
] as const
export const SEASON_STATUS = ['Taslak', 'Aktif', 'Tamamlandı', 'İptal'] as const
export const WORKFLOW_STATUS = ['Taslak', 'Aktif', 'Arşiv'] as const
export const INSPECTION_STATUS = ['Planlandı', 'Devam ediyor', 'Tamamlandı', 'İptal'] as const
export const INSPECTION_RESULT = ['Bekliyor', 'Geçti', 'Kaldı', 'Şartlı'] as const
export const SUPPORT_STATUS = ['Taslak', 'Açık', 'Kapalı'] as const

export function activityKindLabel(kind: string) {
  switch (kind) {
    case 'task':
      return 'Görev'
    case 'inspection':
      return 'Denetim'
    case 'harvest':
      return 'Hasat'
    case 'message':
      return 'Mesaj'
    default:
      return kind
  }
}
