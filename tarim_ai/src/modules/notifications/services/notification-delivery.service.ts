import { randomUUID } from 'crypto';
import type { NotificationRepository } from '../repositories/notification.repository.js';
import type { AppNotification, NotificationDeliveryAttempt } from '../types/notification.types.js';
import type { NotificationProvider } from '../providers/notification.providers.js';

export class NotificationDeliveryService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly providers: Record<string, NotificationProvider>
  ) {}

  async deliver(notification: AppNotification): Promise<boolean> {
    if (notification.status === 'CANCELLED' || notification.status === 'EXPIRED') {
      return false;
    }

    const provider = this.providers[notification.channel];
    if (!provider) {
      await this.markFailed(notification, `No provider found for channel ${notification.channel}`, false);
      return false;
    }

    try {
      // Mark processing
      await this.repository.updateNotificationStatus(notification.id, 'PROCESSING');
      
      const result = await provider.send(notification);
      
      const attempt: NotificationDeliveryAttempt = {
        id: randomUUID(),
        notificationId: notification.id,
        providerMessageId: result.providerMessageId || null,
        status: result.status,
        errorCode: result.errorCode || null,
        safeErrorMessage: result.safeErrorMessage || null,
        retryable: result.retryable,
        attemptNumber: 1, // in a full implementation, we'd query past attempts or track it in metadata
        createdAt: new Date().toISOString()
      };
      await this.repository.addDeliveryAttempt(attempt);

      if (result.success) {
        await this.repository.updateNotificationStatus(notification.id, result.status, {
          sentAt: result.sentAt || new Date().toISOString()
        });
        
        await this.repository.addAuditEvent({
          id: randomUUID(),
          notificationId: notification.id,
          eventType: 'notification.sent',
          previousStatus: 'PROCESSING',
          newStatus: result.status,
          reason: 'Provider accepted',
          correlationId: null,
          requestId: null,
          createdAt: new Date().toISOString()
        });
        return true;
      } else {
        await this.markFailed(notification, result.safeErrorMessage || 'Provider rejected', result.retryable);
        return false;
      }
    } catch (e: any) {
      // Safe error log
      console.error(`[DeliveryService] Error delivering notification ${notification.id}:`, e.message);
      await this.markFailed(notification, 'Internal error during delivery', true);
      return false;
    }
  }

  private async markFailed(notification: AppNotification, reason: string, retryable: boolean) {
    const newStatus = retryable ? 'SCHEDULED' : 'FAILED';
    // If retryable, we would ideally set scheduledAt to a future time based on exponential backoff.
    // For now, we just leave it SCHEDULED so the next pass might pick it up (though in a real system we'd delay it).
    
    await this.repository.updateNotificationStatus(notification.id, newStatus, {
      failedAt: newStatus === 'FAILED' ? new Date().toISOString() : null,
      failureReason: newStatus === 'FAILED' ? reason : null
    });

    await this.repository.addAuditEvent({
      id: randomUUID(),
      notificationId: notification.id,
      eventType: 'notification.failed',
      previousStatus: notification.status,
      newStatus,
      reason,
      correlationId: null,
      requestId: null,
      createdAt: new Date().toISOString()
    });
  }
}
