import { z } from 'zod';

export const notificationPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']);
export const notificationStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED', 'EXPIRED']);
export const notificationChannelSchema = z.enum(['IN_APP', 'PUSH', 'SMS', 'EMAIL']);
export const notificationTypeSchema = z.enum([
  'TASK_READY',
  'TASK_DUE_SOON',
  'TASK_DUE_TODAY',
  'TASK_OVERDUE',
  'TASK_COMPLETED',
  'TASK_RESCHEDULED',
  'PLAN_CREATED',
  'PLAN_UPDATED',
  'EXPERT_MESSAGE',
  'EXPERT_REVISION_REQUEST',
  'WEATHER_WARNING',
  'SYSTEM_WARNING',
  'GENERAL_ANNOUNCEMENT'
]);
export const triggerTypeSchema = z.enum([
  'TASK_CREATED',
  'TASK_READY',
  'BEFORE_DUE_DATE',
  'ON_DUE_DATE',
  'AFTER_DUE_DATE',
  'STATUS_CHANGED',
  'MANUAL',
  'SYSTEM_EVENT'
]);

export type NotificationPriority = z.infer<typeof notificationPrioritySchema>;
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type TriggerType = z.infer<typeof triggerTypeSchema>;

export interface NotificationPreference {
  id: string;
  userId: string;
  channel: NotificationChannel;
  enabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  language: string;
  taskNotificationsEnabled: boolean;
  expertNotificationsEnabled: boolean;
  weatherNotificationsEnabled: boolean;
  systemNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ReminderRule {
  id: string;
  code: string;
  name: string;
  notificationType: NotificationType;
  triggerType: TriggerType;
  daysBefore: number | null;
  hoursBefore: number | null;
  repeatIntervalHours: number | null;
  maximumRepeatCount: number | null;
  supportedChannels: NotificationChannel[];
  priority: NotificationPriority;
  enabled: boolean;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface AppNotification {
  id: string;
  idempotencyKey: string;
  userId: string;
  producerId: string | null;
  parcelId: string | null;
  productionPlanId: string | null;
  taskId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  scheduledAt: string;
  sentAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  source: string | null;
  metadataJson: any | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
}

export interface NotificationDeliveryAttempt {
  id: string;
  notificationId: string;
  providerMessageId: string | null;
  status: string;
  errorCode: string | null;
  safeErrorMessage: string | null;
  retryable: boolean;
  attemptNumber: number;
  createdAt: string;
}

export interface NotificationAuditEvent {
  id: string;
  notificationId: string;
  eventType: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  correlationId: string | null;
  requestId: string | null;
  createdAt: string;
}
