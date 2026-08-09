# Notification Provider Contract

## Interface Implementation
Any external service integrated into the Tarım AI notification engine must implement the `NotificationProvider` interface.

```typescript
export interface NotificationProvider {
  channel: NotificationChannel;
  send(notification: NotificationEntity): Promise<ProviderResponse>;
}

export interface ProviderResponse {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  safeErrorMessage?: string;
  retryable?: boolean;
}
```

## Security Requirements
- Providers MUST NOT leak raw API errors to the user.
- All credentials (API Keys, Tokens) must be passed via standard environment variables and not hardcoded.
- Implementations must respect the `retryable` boolean: if false, the delivery engine will permanently mark the notification as `FAILED`.
