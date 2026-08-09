import type { AppNotification } from '../types/notification.types.js';

export interface NotificationProviderResult {
  success: boolean;
  providerMessageId?: string;
  status: string;
  sentAt?: string;
  errorCode?: string;
  safeErrorMessage?: string;
  retryable: boolean;
}

export interface NotificationProvider {
  send(notification: AppNotification): Promise<NotificationProviderResult>;
}

export class InAppNotificationProvider implements NotificationProvider {
  async send(notification: AppNotification): Promise<NotificationProviderResult> {
    // In-app notifications don't actually "send" anywhere outside our DB.
    // They just need to be marked as delivered in our system.
    return {
      success: true,
      providerMessageId: `inapp-${notification.id}`,
      status: 'DELIVERED',
      sentAt: new Date().toISOString(),
      retryable: false
    };
  }
}

export class MockPushNotificationProvider implements NotificationProvider {
  async send(notification: AppNotification): Promise<NotificationProviderResult> {
    console.log(`[PUSH] Sending push notification to user ${notification.userId}: ${notification.title}`);
    return {
      success: true,
      providerMessageId: `mock-push-${notification.id}`,
      status: 'DELIVERED',
      sentAt: new Date().toISOString(),
      retryable: false
    };
  }
}

export class MockSmsNotificationProvider implements NotificationProvider {
  async send(notification: AppNotification): Promise<NotificationProviderResult> {
    console.log(`[SMS] Sending SMS notification to user ${notification.userId}: ${notification.title}`);
    return {
      success: true,
      providerMessageId: `mock-sms-${notification.id}`,
      status: 'DELIVERED',
      sentAt: new Date().toISOString(),
      retryable: false
    };
  }
}

export class MockEmailNotificationProvider implements NotificationProvider {
  async send(notification: AppNotification): Promise<NotificationProviderResult> {
    console.log(`[EMAIL] Sending Email notification to user ${notification.userId}: ${notification.title}`);
    return {
      success: true,
      providerMessageId: `mock-email-${notification.id}`,
      status: 'DELIVERED',
      sentAt: new Date().toISOString(),
      retryable: false
    };
  }
}
