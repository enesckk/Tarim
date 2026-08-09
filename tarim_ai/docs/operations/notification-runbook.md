# Notification Engine Runbook

## Troubleshooting Delivery Failures

1. **Check Delivery Attempts**
   Query the `ntf_delivery_attempts` table to inspect the exact `errorCode` returned by the provider.
   ```sql
   SELECT * FROM ntf_delivery_attempts WHERE notification_id = 'failed-uuid';
   ```

2. **Verify Quiet Hours**
   If a notification is stuck in `SCHEDULED`, verify the user's `ntf_notification_preferences`. A notification might be validly delayed due to local quiet hours.

3. **Check Idempotency Locks**
   If notifications are not being created for a specific event, check if the `idempotency_key` (combining Type + User + Task + ScheduledAt) already exists in `ntf_notifications`.

## Database Restarts & State
The `NotificationSchedulerService` will automatically pick up any notifications with status `SCHEDULED` that were missed during downtime, as long as `scheduledAt` is less than or equal to the current time. No manual replay is required for standard downtime.
