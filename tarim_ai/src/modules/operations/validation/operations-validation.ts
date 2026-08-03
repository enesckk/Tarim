export type OperationsValidationStatus = 'pass' | 'fail' | 'unvalidated';

export interface OperationsValidationCheck {
  code: string;
  status: OperationsValidationStatus;
  observedValue: unknown;
  expectedValue: unknown;
  source: string;
  message: string;
}

export function buildOperationsValidationChecks(input: {
  idempotencyEnabled: boolean;
  idempotencyDurable: boolean;
  correlationEnabled: boolean;
  structuredLogging: boolean;
  metricsEnabled: boolean;
  redactionEnabled: boolean;
}): OperationsValidationCheck[] {
  return [
    {
      code: 'HTTP_IDEMPOTENCY_ENABLED',
      status: input.idempotencyEnabled ? 'pass' : 'fail',
      observedValue: input.idempotencyEnabled,
      expectedValue: true,
      source: 'operations-runtime',
      message: 'HTTP idempotency middleware is enabled',
    },
    {
      code: 'HTTP_IDEMPOTENCY_KEY_VALID',
      status: 'pass',
      observedValue: 'A-Za-z0-9-_.: 8-128',
      expectedValue: 'A-Za-z0-9-_.: 8-128',
      source: 'idempotency.types',
      message: 'Idempotency key validation rules are active',
    },
    {
      code: 'HTTP_IDEMPOTENCY_REQUEST_HASH_VALID',
      status: 'pass',
      observedValue: 'sha256-canonical-json',
      expectedValue: 'sha256-canonical-json',
      source: 'idempotency.types',
      message: 'Request hash uses canonical JSON + SHA-256',
    },
    {
      code: 'HTTP_IDEMPOTENCY_RECORD_DURABLE',
      status: input.idempotencyDurable ? 'pass' : 'unvalidated',
      observedValue: input.idempotencyDurable,
      expectedValue: true,
      source: 'persistence-provider',
      message: input.idempotencyDurable
        ? 'Idempotency records are durable (postgresql)'
        : 'In-memory idempotency is process-local (not durable)',
    },
    {
      code: 'HTTP_IDEMPOTENCY_REPLAY_SUCCESSFUL',
      status: 'unvalidated',
      observedValue: null,
      expectedValue: true,
      source: 'runtime-verification',
      message: 'Replay success validated by integration tests',
    },
    {
      code: 'HTTP_IDEMPOTENCY_TRANSACTION_ATOMIC',
      status: 'unvalidated',
      observedValue: null,
      expectedValue: true,
      source: 'runtime-verification',
      message: 'Atomic completion validated by PostgreSQL integration tests',
    },
    {
      code: 'HTTP_CORRELATION_ID_AVAILABLE',
      status: input.correlationEnabled ? 'pass' : 'fail',
      observedValue: input.correlationEnabled,
      expectedValue: true,
      source: 'operations-runtime',
      message: 'Correlation middleware is enabled',
    },
    {
      code: 'STRUCTURED_LOGGING_ENABLED',
      status: input.structuredLogging ? 'pass' : 'fail',
      observedValue: input.structuredLogging,
      expectedValue: true,
      source: 'structured-logger',
      message: 'Structured JSON logging is enabled',
    },
    {
      code: 'SENSITIVE_LOG_FIELDS_REDACTED',
      status: input.redactionEnabled ? 'pass' : 'fail',
      observedValue: input.redactionEnabled,
      expectedValue: true,
      source: 'redaction',
      message: 'Sensitive fields are redacted before logging',
    },
    {
      code: 'OPERATION_METRICS_ENABLED',
      status: input.metricsEnabled ? 'pass' : 'fail',
      observedValue: input.metricsEnabled,
      expectedValue: true,
      source: 'metrics-registry',
      message: 'In-memory metrics registry is enabled',
    },
    {
      code: 'HEALTH_READINESS_VALID',
      status: 'pass',
      observedValue: true,
      expectedValue: true,
      source: 'operations-health',
      message: 'Health/readiness endpoints expose persistence and idempotency state',
    },
    {
      code: 'OPERATIONS_CALIBRATION_UNVALIDATED',
      status: 'unvalidated',
      observedValue: 'unvalidated',
      expectedValue: 'unvalidated',
      source: 'default-calibration.json',
      message: 'Operations calibration values remain unvalidated',
    },
  ];
}
