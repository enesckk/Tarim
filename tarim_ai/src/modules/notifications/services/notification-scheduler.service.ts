import { randomUUID } from 'crypto';
import type { NotificationRepository } from '../repositories/notification.repository.js';
import type { NotificationPreferenceService } from './notification-preference.service.js';
import type { NotificationDeliveryService } from './notification-delivery.service.js';
import type { AppNotification } from '../types/notification.types.js';

export class NotificationSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly repository: NotificationRepository,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly deliveryService: NotificationDeliveryService
  ) {}

  start(intervalMs = 60000) {
    if (this.timer) return;
    this.timer = setInterval(() => this.processPendingNotifications(), intervalMs);
    // Initial run
    this.processPendingNotifications();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async processPendingNotifications() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      const now = new Date().toISOString();
      const pending = await this.repository.getPendingNotifications(now);
      
      for (const notification of pending) {
        // Check preferences
        const prefs = await this.preferenceService.getPreferences(notification.userId);
        
        if (!prefs.enabled) {
          await this.repository.updateNotificationStatus(notification.id, 'CANCELLED');
          continue;
        }

        // Feature toggles based on types
        if (notification.type.startsWith('TASK_') && !prefs.taskNotificationsEnabled) {
          await this.repository.updateNotificationStatus(notification.id, 'CANCELLED');
          continue;
        }
        if (notification.type.startsWith('EXPERT_') && !prefs.expertNotificationsEnabled) {
          await this.repository.updateNotificationStatus(notification.id, 'CANCELLED');
          continue;
        }

        // Quiet hours check
        if (notification.priority !== 'CRITICAL') {
          if (this.preferenceService.isQuietHour(prefs, Date.now())) {
            // Postpone by 1 hour (simplistic logic)
            const postponedDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            await this.repository.updateNotificationStatus(notification.id, 'SCHEDULED', { scheduledAt: postponedDate } as any);
            continue;
          }
        }

        // Deliver
        await this.deliveryService.deliver(notification);
      }
    } catch (e) {
      console.error('[NotificationSchedulerService] Error processing pending notifications', e);
    } finally {
      this.isProcessing = false;
    }
  }

  // Method to be called by EventBus listener
  async scheduleNotification(params: {
    userId: string;
    producerId?: string;
    parcelId?: string;
    productionPlanId?: string;
    taskId?: string;
    type: string;
    title: string;
    message: string;
    priority: string;
    scheduledAt: string;
    source: string;
    metadataJson?: any;
    channels?: string[]; // typically IN_APP
  }) {
    const channels = params.channels || ['IN_APP'];

    for (const channel of channels) {
      const idempotencyKey = `${params.type}_${params.userId}_${params.taskId || 'none'}_${params.scheduledAt}_${channel}`;
      
      const exists = await this.repository.checkIdempotency(idempotencyKey);
      if (exists) continue;

      const notif: AppNotification = {
        id: randomUUID(),
        idempotencyKey,
        userId: params.userId,
        producerId: params.producerId || null,
        parcelId: params.parcelId || null,
        productionPlanId: params.productionPlanId || null,
        taskId: params.taskId || null,
        type: params.type as any,
        channel: channel as any,
        title: params.title,
        message: params.message,
        priority: params.priority as any,
        status: 'SCHEDULED',
        scheduledAt: params.scheduledAt,
        sentAt: null,
        readAt: null,
        failedAt: null,
        failureReason: null,
        source: params.source,
        metadataJson: params.metadataJson || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        isActive: true
      };

      await this.repository.createNotification(notif);

      await this.repository.addAuditEvent({
        id: randomUUID(),
        notificationId: notif.id,
        eventType: 'notification.created',
        previousStatus: null,
        newStatus: 'SCHEDULED',
        reason: 'Event triggered scheduling',
        correlationId: null,
        requestId: null,
        createdAt: new Date().toISOString()
      });
    }
  }
}
