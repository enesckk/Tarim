import { getEnv } from '../../config/env.js';
import { PostgresNotificationRepository, InMemoryNotificationRepository, type NotificationRepository } from './repositories/notification.repository.js';
import { NotificationPreferenceService } from './services/notification-preference.service.js';
import { NotificationDeliveryService } from './services/notification-delivery.service.js';
import { NotificationSchedulerService } from './services/notification-scheduler.service.js';
import { NotificationController } from './controllers/notification.controller.js';
import { createNotificationRouter } from './routes/notification.routes.js';
import {
  InAppNotificationProvider,
  MockPushNotificationProvider,
  MockSmsNotificationProvider,
  MockEmailNotificationProvider,
  type NotificationProvider
} from './providers/notification.providers.js';
import { sharedEventBus } from './events/event-bus.js';

let sharedRepository: NotificationRepository | null = null;
let sharedScheduler: NotificationSchedulerService | null = null;

export function getNotificationRepository(): NotificationRepository {
  if (!sharedRepository) {
    const env = getEnv();
    if (env.PERSISTENCE_PROVIDER === 'postgresql' && env.DATABASE_ENABLED) {
      sharedRepository = new PostgresNotificationRepository();
    } else {
      sharedRepository = new InMemoryNotificationRepository();
    }
  }
  return sharedRepository;
}

export function createNotificationModule() {
  const repository = getNotificationRepository();
  const preferenceService = new NotificationPreferenceService(repository);
  
  const providers: Record<string, NotificationProvider> = {
    'IN_APP': new InAppNotificationProvider(),
    'PUSH': new MockPushNotificationProvider(),
    'SMS': new MockSmsNotificationProvider(),
    'EMAIL': new MockEmailNotificationProvider(),
  };

  const deliveryService = new NotificationDeliveryService(repository, providers);
  
  if (!sharedScheduler) {
    sharedScheduler = new NotificationSchedulerService(repository, preferenceService, deliveryService);
    // Auto-start scheduler in background (runs every minute)
    sharedScheduler.start(60000);

    // Setup event listeners
    sharedEventBus.subscribe('PLAN_CREATED', async (event) => {
      await sharedScheduler!.scheduleNotification({
        userId: event.payload.userId || 'default-user-id',
        productionPlanId: event.payload.planId,
        type: 'PLAN_CREATED',
        title: 'Yeni Üretim Planı',
        message: `${event.payload.cropCode} için üretim planınız oluşturuldu.`,
        priority: 'NORMAL',
        scheduledAt: new Date().toISOString(), // Immediately schedule
        source: 'SYSTEM',
        channels: ['IN_APP']
      });
    });

    sharedEventBus.subscribe('TASK_RESCHEDULED', async (event) => {
      await sharedScheduler!.scheduleNotification({
        userId: event.payload.userId || 'default-user-id',
        taskId: event.payload.taskId,
        productionPlanId: event.payload.planId,
        type: 'TASK_RESCHEDULED',
        title: 'Görev Tarihi Değişti',
        message: `${event.payload.taskName} görevinizin tarihi yeniden planlandı.`,
        priority: 'NORMAL',
        scheduledAt: new Date().toISOString(),
        source: 'SYSTEM',
        channels: ['IN_APP']
      });
    });

    sharedEventBus.subscribe('TASK_OVERDUE', async (event) => {
      await sharedScheduler!.scheduleNotification({
        userId: event.payload.userId || 'default-user-id',
        taskId: event.payload.taskId,
        productionPlanId: event.payload.planId,
        type: 'TASK_OVERDUE',
        title: 'Geciken Görev',
        message: `${event.payload.taskName} görevinizin bitiş tarihi geçti!`,
        priority: 'CRITICAL',
        scheduledAt: new Date().toISOString(),
        source: 'SYSTEM',
        channels: ['IN_APP', 'PUSH'] // PUSH as per critical requirement
      });
    });

    sharedEventBus.subscribe('GENERAL_ANNOUNCEMENT', async (event) => {
      await sharedScheduler!.scheduleNotification({
        userId: event.payload.userId,
        type: 'GENERAL_ANNOUNCEMENT',
        title: event.payload.title,
        message: event.payload.message,
        priority: event.payload.priority,
        scheduledAt: new Date().toISOString(),
        source: 'ADMIN',
        channels: event.payload.channels
      });
    });
  }

  const controller = new NotificationController(repository, preferenceService);
  const router = createNotificationRouter(controller);

  return { router, scheduler: sharedScheduler };
}

export * from './types/notification.types.js';
export { sharedEventBus } from './events/event-bus.js';
