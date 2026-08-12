import type { Request } from 'express';
import { createRequestId } from '../idempotency/idempotency.types.js';

export interface RequestObservabilityContext {
  correlationId: string;
  requestId: string;
  operation: string | null;
  idempotencyKey: string | null;
  idempotencyKeyHash: string | null;
  idempotencyReplay: boolean;
  skipIdempotencyFinalize: boolean;
  startTime: number;
  actorSummary: string | null;
  resourceId: string | null;
  resourceType: string | null;
  routeTemplate: string | null;
  capturedResponseBody: unknown | null;
  providerDurationsMs: Record<string, number>;
  databaseDurationMs: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    observability?: RequestObservabilityContext;
  }
}

// Express 5's Request extends the global Express.Request interface. Keep the
// augmentation on both surfaces so production `tsc` and test transpilation
// resolve the same request contract across compatible @types versions.
declare global {
  namespace Express {
    interface Request {
      observability?: RequestObservabilityContext;
    }
  }
}

export function ensureObservabilityContext(
  req: Request,
  partial?: Partial<RequestObservabilityContext>,
): RequestObservabilityContext {
  if (!req.observability) {
    req.observability = {
      correlationId: partial?.correlationId ?? createRequestId(),
      requestId: createRequestId(),
      operation: null,
      idempotencyKey: null,
      idempotencyKeyHash: null,
      idempotencyReplay: false,
      skipIdempotencyFinalize: false,
      startTime: Date.now(),
      actorSummary: null,
      resourceId: null,
      resourceType: null,
      routeTemplate: null,
      capturedResponseBody: null,
      providerDurationsMs: {},
      databaseDurationMs: 0,
      ...partial,
    };
  } else if (partial) {
    Object.assign(req.observability, partial);
  }
  return req.observability;
}
