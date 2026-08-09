import { getPool } from '../../database/database-client.js';
import type {
  AppNotification,
  NotificationPreference,
  ReminderRule,
  NotificationDeliveryAttempt,
  NotificationAuditEvent
} from '../types/notification.types.js';

export interface NotificationRepository {
  createNotification(notification: AppNotification): Promise<AppNotification>;
  getNotificationById(id: string): Promise<AppNotification | null>;
  updateNotificationStatus(id: string, status: string, additionalFields?: Partial<AppNotification>): Promise<AppNotification | null>;
  getPendingNotifications(currentTime: string): Promise<AppNotification[]>;
  getNotificationsByUserId(userId: string, filters?: any): Promise<AppNotification[]>;
  checkIdempotency(key: string): Promise<boolean>;

  getPreferences(userId: string): Promise<NotificationPreference | null>;
  updatePreferences(userId: string, prefs: Partial<NotificationPreference>): Promise<NotificationPreference>;

  getReminderRules(): Promise<ReminderRule[]>;

  addDeliveryAttempt(attempt: NotificationDeliveryAttempt): Promise<NotificationDeliveryAttempt>;
  addAuditEvent(event: NotificationAuditEvent): Promise<NotificationAuditEvent>;
}

export class PostgresNotificationRepository implements NotificationRepository {
  async createNotification(notification: AppNotification): Promise<AppNotification> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO ntf_notifications (
        id, idempotency_key, user_id, producer_id, parcel_id, production_plan_id, task_id,
        type, channel, title, message, priority, status, scheduled_at, source, metadata_json, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        notification.id, notification.idempotencyKey, notification.userId, notification.producerId,
        notification.parcelId, notification.productionPlanId, notification.taskId, notification.type,
        notification.channel, notification.title, notification.message, notification.priority,
        notification.status, notification.scheduledAt, notification.source, notification.metadataJson,
        notification.createdAt, notification.updatedAt
      ]
    );
    return notification;
  }

  async getNotificationById(id: string): Promise<AppNotification | null> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM ntf_notifications WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapToNotification(res.rows[0]);
  }

  async updateNotificationStatus(id: string, status: string, fields: Partial<AppNotification> = {}): Promise<AppNotification | null> {
    const pool = getPool();
    const setClause = [];
    const values: any[] = [status, new Date().toISOString(), id];
    let idx = 4;

    if (fields.sentAt) { setClause.push(`sent_at = $${idx++}`); values.push(fields.sentAt); }
    if (fields.readAt) { setClause.push(`read_at = $${idx++}`); values.push(fields.readAt); }
    if (fields.failedAt) { setClause.push(`failed_at = $${idx++}`); values.push(fields.failedAt); }
    if (fields.failureReason) { setClause.push(`failure_reason = $${idx++}`); values.push(fields.failureReason); }

    const setString = setClause.length > 0 ? `, ${setClause.join(', ')}` : '';
    
    const res = await pool.query(
      `UPDATE ntf_notifications 
       SET status = $1, updated_at = $2${setString}
       WHERE id = $3 RETURNING *`,
      values
    );
    if (res.rows.length === 0) return null;
    return this.mapToNotification(res.rows[0]);
  }

  async getPendingNotifications(currentTime: string): Promise<AppNotification[]> {
    const pool = getPool();
    const res = await pool.query(
      `SELECT * FROM ntf_notifications 
       WHERE status IN ('DRAFT', 'SCHEDULED') AND scheduled_at <= $1 AND is_active = TRUE`,
      [currentTime]
    );
    return res.rows.map(row => this.mapToNotification(row));
  }

  async getNotificationsByUserId(userId: string, filters: any = {}): Promise<AppNotification[]> {
    const pool = getPool();
    let query = `SELECT * FROM ntf_notifications WHERE user_id = $1 AND is_active = TRUE`;
    const values: any[] = [userId];

    if (filters.unreadOnly) {
      query += ` AND read_at IS NULL`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT 50`;

    const res = await pool.query(query, values);
    return res.rows.map(row => this.mapToNotification(row));
  }

  async checkIdempotency(key: string): Promise<boolean> {
    const pool = getPool();
    const res = await pool.query('SELECT 1 FROM ntf_notifications WHERE idempotency_key = $1', [key]);
    return res.rows.length > 0;
  }

  async getPreferences(userId: string): Promise<NotificationPreference | null> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM ntf_notification_preferences WHERE user_id = $1 LIMIT 1', [userId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      channel: row.channel,
      enabled: row.enabled,
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
      timezone: row.timezone,
      language: row.language,
      taskNotificationsEnabled: row.task_notifications_enabled,
      expertNotificationsEnabled: row.expert_notifications_enabled,
      weatherNotificationsEnabled: row.weather_notifications_enabled,
      systemNotificationsEnabled: row.system_notifications_enabled,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      version: row.version
    };
  }

  async updatePreferences(userId: string, prefs: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const pool = getPool();
    
    const existing = await this.getPreferences(userId);
    if (!existing) {
      // create default
      const id = require('crypto').randomUUID();
      await pool.query(
        `INSERT INTO ntf_notification_preferences (id, user_id, channel) VALUES ($1, $2, $3)`,
        [id, userId, 'IN_APP']
      );
    }

    const setClause = [];
    const values: any[] = [new Date().toISOString(), userId];
    let idx = 3;

    if (prefs.enabled !== undefined) { setClause.push(`enabled = $${idx++}`); values.push(prefs.enabled); }
    if (prefs.quietHoursStart !== undefined) { setClause.push(`quiet_hours_start = $${idx++}`); values.push(prefs.quietHoursStart); }
    if (prefs.quietHoursEnd !== undefined) { setClause.push(`quiet_hours_end = $${idx++}`); values.push(prefs.quietHoursEnd); }
    
    if (setClause.length > 0) {
      await pool.query(
        `UPDATE ntf_notification_preferences SET updated_at = $1, ${setClause.join(', ')} WHERE user_id = $2`,
        values
      );
    }
    
    return (await this.getPreferences(userId))!;
  }

  async getReminderRules(): Promise<ReminderRule[]> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM ntf_reminder_rules WHERE enabled = TRUE');
    return res.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      notificationType: row.notification_type,
      triggerType: row.trigger_type,
      daysBefore: row.days_before,
      hoursBefore: row.hours_before,
      repeatIntervalHours: row.repeat_interval_hours,
      maximumRepeatCount: row.maximum_repeat_count,
      supportedChannels: row.supported_channels,
      priority: row.priority,
      enabled: row.enabled,
      source: row.source,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      version: row.version
    }));
  }

  async addDeliveryAttempt(attempt: NotificationDeliveryAttempt): Promise<NotificationDeliveryAttempt> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO ntf_delivery_attempts (id, notification_id, provider_message_id, status, error_code, safe_error_message, retryable, attempt_number, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [attempt.id, attempt.notificationId, attempt.providerMessageId, attempt.status, attempt.errorCode, attempt.safeErrorMessage, attempt.retryable, attempt.attemptNumber, attempt.createdAt]
    );
    return attempt;
  }

  async addAuditEvent(event: NotificationAuditEvent): Promise<NotificationAuditEvent> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO ntf_audit_events (id, notification_id, event_type, previous_status, new_status, reason, correlation_id, request_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [event.id, event.notificationId, event.eventType, event.previousStatus, event.newStatus, event.reason, event.correlationId, event.requestId, event.createdAt]
    );
    return event;
  }

  private mapToNotification(row: any): AppNotification {
    return {
      id: row.id,
      idempotencyKey: row.idempotency_key,
      userId: row.user_id,
      producerId: row.producer_id,
      parcelId: row.parcel_id,
      productionPlanId: row.production_plan_id,
      taskId: row.task_id,
      type: row.type,
      channel: row.channel,
      title: row.title,
      message: row.message,
      priority: row.priority,
      status: row.status,
      scheduledAt: row.scheduled_at.toISOString(),
      sentAt: row.sent_at?.toISOString() || null,
      readAt: row.read_at?.toISOString() || null,
      failedAt: row.failed_at?.toISOString() || null,
      failureReason: row.failure_reason,
      source: row.source,
      metadataJson: row.metadata_json,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      version: row.version,
      isActive: row.is_active
    };
  }
}

export class InMemoryNotificationRepository implements NotificationRepository {
  private notifications = new Map<string, AppNotification>();
  private preferences = new Map<string, NotificationPreference>();
  private rules = new Map<string, ReminderRule>();
  private attempts = new Map<string, NotificationDeliveryAttempt>();
  private audits = new Map<string, NotificationAuditEvent>();

  constructor() {
    // Initial mock rules
    this.rules.set('rule1', {
      id: 'rule1', code: 'TASK_READY_1D', name: '1 Day Before', notificationType: 'TASK_DUE_SOON',
      triggerType: 'BEFORE_DUE_DATE', daysBefore: 1, hoursBefore: null, repeatIntervalHours: null, maximumRepeatCount: null,
      supportedChannels: ['IN_APP'], priority: 'HIGH', enabled: true, source: 'SYSTEM', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1
    });
    this.rules.set('rule2', {
      id: 'rule2', code: 'TASK_OVERDUE_1D', name: '1 Day Overdue', notificationType: 'TASK_OVERDUE',
      triggerType: 'AFTER_DUE_DATE', daysBefore: -1, hoursBefore: null, repeatIntervalHours: null, maximumRepeatCount: null,
      supportedChannels: ['IN_APP'], priority: 'CRITICAL', enabled: true, source: 'SYSTEM', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1
    });
  }

  async createNotification(notification: AppNotification): Promise<AppNotification> {
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async getNotificationById(id: string): Promise<AppNotification | null> {
    return this.notifications.get(id) || null;
  }

  async updateNotificationStatus(id: string, status: string, fields: Partial<AppNotification> = {}): Promise<AppNotification | null> {
    const notif = this.notifications.get(id);
    if (!notif) return null;
    const updated = { ...notif, status, ...fields, updatedAt: new Date().toISOString() };
    this.notifications.set(id, updated as AppNotification);
    return updated as AppNotification;
  }

  async getPendingNotifications(currentTime: string): Promise<AppNotification[]> {
    return Array.from(this.notifications.values()).filter(
      n => (n.status === 'DRAFT' || n.status === 'SCHEDULED') && new Date(n.scheduledAt) <= new Date(currentTime) && n.isActive
    );
  }

  async getNotificationsByUserId(userId: string, filters: any = {}): Promise<AppNotification[]> {
    let list = Array.from(this.notifications.values()).filter(n => n.userId === userId && n.isActive);
    if (filters.unreadOnly) {
      list = list.filter(n => n.readAt === null);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async checkIdempotency(key: string): Promise<boolean> {
    return Array.from(this.notifications.values()).some(n => n.idempotencyKey === key);
  }

  async getPreferences(userId: string): Promise<NotificationPreference | null> {
    return this.preferences.get(userId) || null;
  }

  async updatePreferences(userId: string, prefs: Partial<NotificationPreference>): Promise<NotificationPreference> {
    let existing = this.preferences.get(userId);
    if (!existing) {
      existing = {
        id: require('crypto').randomUUID(),
        userId,
        channel: 'IN_APP',
        enabled: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: 'Europe/Istanbul',
        language: 'tr',
        taskNotificationsEnabled: true,
        expertNotificationsEnabled: true,
        weatherNotificationsEnabled: true,
        systemNotificationsEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };
    }
    const updated = { ...existing, ...prefs, updatedAt: new Date().toISOString() };
    this.preferences.set(userId, updated);
    return updated;
  }

  async getReminderRules(): Promise<ReminderRule[]> {
    return Array.from(this.rules.values()).filter(r => r.enabled);
  }

  async addDeliveryAttempt(attempt: NotificationDeliveryAttempt): Promise<NotificationDeliveryAttempt> {
    this.attempts.set(attempt.id, attempt);
    return attempt;
  }

  async addAuditEvent(event: NotificationAuditEvent): Promise<NotificationAuditEvent> {
    this.audits.set(event.id, event);
    return event;
  }
}
