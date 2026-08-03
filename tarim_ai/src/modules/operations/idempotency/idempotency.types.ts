import { createHash, randomUUID } from 'node:crypto';

export type IdempotencyState =
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

export interface IdempotencyRecord {
  key: string;
  operation: string;
  requestHash: string;
  state: IdempotencyState;
  resourceId: string | null;
  responseStatus: number | null;
  responseBody: unknown | null;
  responseHeaders: Record<string, string>;
  errorCode: string | null;
  lockedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  originalCorrelationId: string | null;
  generation: number;
}

export interface IdempotencyRepository {
  find(operation: string, key: string): Promise<IdempotencyRecord | null>;
  createProcessing(input: {
    key: string;
    operation: string;
    requestHash: string;
    expiresAt: string;
    originalCorrelationId?: string | null;
  }): Promise<IdempotencyRecord>;
  complete(input: {
    operation: string;
    key: string;
    requestHash: string;
    responseStatus: number;
    responseBody: unknown;
    responseHeaders?: Record<string, string>;
    resourceId?: string | null;
    errorCode?: string | null;
  }): Promise<IdempotencyRecord>;
  markFailed(input: {
    operation: string;
    key: string;
    requestHash: string;
    errorCode?: string | null;
    responseStatus?: number | null;
    responseBody?: unknown | null;
  }): Promise<IdempotencyRecord | null>;
  deleteExpired(beforeIso: string, limit: number): Promise<number>;
  clear?(): void;
}

export function hashIdempotencyKey(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

export function createRequestId(): string {
  return randomUUID();
}

/** Canonical JSON stringify with sorted object keys; arrays preserve order. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const v = obj[key];
    if (v === undefined) continue;
    out[key] = canonicalize(v);
  }
  return out;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function buildRequestHash(parts: {
  method: string;
  operation: string;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
  actor?: unknown;
  resourceId?: string | null;
}): string {
  return sha256Hex(
    canonicalJson({
      method: parts.method.toUpperCase(),
      operation: parts.operation,
      params: parts.params ?? {},
      query: parts.query ?? {},
      body: parts.body ?? null,
      actor: parts.actor ?? null,
      resourceId: parts.resourceId ?? null,
    }),
  );
}

const KEY_REGEX = /^[A-Za-z0-9\-_.:]{8,128}$/;

export function validateIdempotencyKey(raw: unknown): {
  ok: true;
  key: string;
} | {
  ok: false;
  code: 'IDEMPOTENCY_KEY_INVALID' | 'IDEMPOTENCY_KEY_REQUIRED';
  message: string;
} {
  if (raw == null || raw === '') {
    return {
      ok: false,
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'Idempotency-Key header is required',
    };
  }
  const key = String(raw).trim();
  if (!KEY_REGEX.test(key)) {
    return {
      ok: false,
      code: 'IDEMPOTENCY_KEY_INVALID',
      message:
        'Idempotency-Key must be 8-128 chars of [A-Za-z0-9-_.:]',
    };
  }
  return { ok: true, key };
}

export function isExpired(record: IdempotencyRecord, now = new Date()): boolean {
  return new Date(record.expiresAt).getTime() <= now.getTime();
}
