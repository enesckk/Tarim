# Notification Engine Architecture

## Overview
The Notification Engine is an additive, independent module responsible for delivering alerts, reminders, and system announcements to users. It integrates closely with the Production Planning Engine but operates asynchronously via an `EventBus`.

## Core Components
1. **EventBus**: Captures domain events (e.g., `PLAN_CREATED`, `TASK_OVERDUE`) and schedules notifications.
2. **NotificationSchedulerService**: Evaluates rules and user preferences (like Quiet Hours) to generate scheduled notifications.
3. **NotificationDeliveryService**: Routes notifications to their designated provider (IN_APP, SMS, EMAIL, PUSH) and handles retries via Exponential Backoff.
4. **NotificationPreferenceService**: Manages user-specific delivery channels, quiet hours, and timezone constraints.
5. **Repositories**: Stores notifications, delivery attempts, preferences, and audit logs using PostgreSQL (with an in-memory fallback for testing).

## Delivery Flow
1. Domain Event Occurs -> EventBus
2. Scheduler Evaluates -> Rules & Preferences applied
3. Delivery Service -> Attempts to send to provider
4. On Success -> Mark as DELIVERED
5. On Failure -> Check if retryable. If yes, SCHEDULED for next attempt. If no, FAILED.
