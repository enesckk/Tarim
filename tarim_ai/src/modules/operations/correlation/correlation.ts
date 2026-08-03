import { randomUUID } from 'node:crypto';

const CORRELATION_HEADER = 'x-correlation-id';
const MAX_LENGTH = 128;
// eslint-disable-next-line no-control-regex
const INVALID_CHARS = /[\x00-\x1f\x7f]/;

export function getCorrelationHeaderName(): string {
  return 'X-Correlation-Id';
}

export function normalizeCorrelationId(raw: unknown): {
  correlationId: string;
  generated: boolean;
  invalidInput: boolean;
} {
  if (raw == null || raw === '') {
    return { correlationId: randomUUID(), generated: true, invalidInput: false };
  }
  const value = String(raw).trim();
  if (
    value.length === 0 ||
    value.length > MAX_LENGTH ||
    INVALID_CHARS.test(value)
  ) {
    return { correlationId: randomUUID(), generated: true, invalidInput: true };
  }
  return { correlationId: value, generated: false, invalidInput: false };
}

export { CORRELATION_HEADER };
