import type { Request, Response } from 'express';
import type { NotificationRepository } from '../repositories/notification.repository.js';
import type { NotificationPreferenceService } from '../services/notification-preference.service.js';
import { sharedEventBus } from '../events/event-bus.js';

// Helper to extract fake userId from request (until full auth)
function getUserId(req: Request): string {
  return req.headers['x-user-id'] as string || 'default-user-id';
}

export class NotificationController {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly preferenceService: NotificationPreferenceService
  ) {}

  // IN_APP API
  async getNotifications(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const unreadOnly = req.query.unreadOnly === 'true';
      const notifications = await this.repository.getNotificationsByUserId(userId, { unreadOnly });
      res.json(notifications);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const notifications = await this.repository.getNotificationsByUserId(userId, { unreadOnly: true });
      res.json({ count: notifications.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  async readNotification(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const notif = await this.repository.updateNotificationStatus(id, 'READ', { readAt: new Date().toISOString() });
      res.json(notif);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  async readAll(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const notifications = await this.repository.getNotificationsByUserId(userId, { unreadOnly: true });
      for (const n of notifications) {
        await this.repository.updateNotificationStatus(n.id, 'READ', { readAt: new Date().toISOString() });
      }
      res.json({ success: true, count: notifications.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  async dismissNotification(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      // In this system dismiss = CANCELLED or soft delete (isActive = false)
      // Since it's user dismissing, we can mark as read and cancelled, or just inactive.
      // Let's use an update field for isActive (if repository supported) or status CANCELLED.
      const notif = await this.repository.updateNotificationStatus(id, 'CANCELLED');
      res.json(notif);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  // PREFERENCES API
  async getPreferences(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const prefs = await this.preferenceService.getPreferences(userId);
      res.json(prefs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  async updatePreferences(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const updates = req.body;
      const prefs = await this.preferenceService.updatePreferences(userId, updates);
      res.json(prefs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  // ADMIN API
  async broadcast(req: Request, res: Response) {
    try {
      // Simulate broadcasting to 'default-user-id' for now
      const payload = req.body;
      await sharedEventBus.publish({
        type: 'GENERAL_ANNOUNCEMENT' as any,
        occurredAt: new Date().toISOString(),
        payload: {
          userId: 'default-user-id',
          title: payload.title,
          message: payload.message,
          priority: payload.priority || 'NORMAL',
          channels: payload.channels || ['IN_APP']
        }
      });
      res.json({ success: true, message: 'Broadcast event triggered' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
