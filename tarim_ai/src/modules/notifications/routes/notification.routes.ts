import { Router } from 'express';
import type { NotificationController } from '../controllers/notification.controller.js';

export function createNotificationRouter(controller: NotificationController): Router {
  const router = Router();

  // IN_APP API
  router.get('/notifications', controller.getNotifications.bind(controller));
  router.get('/notifications/unread-count', controller.getUnreadCount.bind(controller));
  router.post('/notifications/:id/read', controller.readNotification.bind(controller));
  router.post('/notifications/read-all', controller.readAll.bind(controller));
  router.post('/notifications/:id/dismiss', controller.dismissNotification.bind(controller));

  // PREFERENCE API
  router.get('/notification-preferences', controller.getPreferences.bind(controller));
  router.put('/notification-preferences', controller.updatePreferences.bind(controller));

  // ADMIN API
  router.post('/admin/notifications/broadcast', controller.broadcast.bind(controller));

  return router;
}
