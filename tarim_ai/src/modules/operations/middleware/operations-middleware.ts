import type { NextFunction, Request, Response } from 'express';
import {
  getCorrelationHeaderName,
  normalizeCorrelationId,
  CORRELATION_HEADER,
} from '../correlation/correlation.js';
import { ensureObservabilityContext } from '../observability/request-context.js';
import { runWithRequestObservabilityContext } from '../observability/async-local-request-context.js';
import { getStructuredLogger } from '../logging/structured-logger.js';
import { getMetricsRegistry } from '../metrics/metrics-registry.js';
import { getOperationsRuntime } from '../operations-runtime.js';
import {
  buildRequestHash,
  hashIdempotencyKey,
  validateIdempotencyKey,
} from '../idempotency/idempotency.types.js';
import {
  extractResourceIdFromBody,
  resolveCriticalOperation,
} from '../idempotency/operation-catalog.js';
import { ApiError } from '../../../utils/api-error.js';

function headerValue(
  headers: Request['headers'],
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  const raw = headers[lower] ?? headers[name];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function sendError(
  res: Response,
  req: Request,
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): void {
  const correlationId = req.observability?.correlationId;
  res.status(status).json({
    error: message,
    code,
    correlationId,
    ...(extra ?? {}),
  });
}

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const raw = headerValue(req.headers, CORRELATION_HEADER);
  const normalized = normalizeCorrelationId(raw);
  const ctx = ensureObservabilityContext(req, {
    correlationId: normalized.correlationId,
  });
  runWithRequestObservabilityContext(ctx, () => {
    res.setHeader(getCorrelationHeaderName(), ctx.correlationId);
    if (normalized.invalidInput) {
      getStructuredLogger().warn({
        event: 'http.correlation.invalid',
        correlationId: ctx.correlationId,
        requestId: ctx.requestId,
        message: 'Invalid X-Correlation-Id replaced with generated UUID',
      });
    }
    next();
  });
}

export function httpObservabilityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ctx = ensureObservabilityContext(req);
  const logger = getStructuredLogger();
  const metrics = getMetricsRegistry();
  const runtime = getOperationsRuntime();

  logger.info({
    event: 'http.request.started',
    correlationId: ctx.correlationId,
    requestId: ctx.requestId,
    method: req.method,
    route: req.path,
    persistenceProvider: runtime.persistenceProvider,
  });

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    ctx.capturedResponseBody = body;
    return originalJson(body);
  }) as Response['json'];

  res.on('finish', () => {
    const durationMs = Date.now() - ctx.startTime;
    const statusCode = res.statusCode;
    metrics.increment('http_requests_total');
    metrics.observe('http_request_duration_ms', durationMs);
    if (statusCode >= 400) {
      metrics.increment('http_request_errors_total');
    }

    const errorCode =
      bodyErrorCode(ctx.capturedResponseBody) ??
      (statusCode >= 400 ? `HTTP_${statusCode}` : null);

    const baseFields = {
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      method: req.method,
      route: ctx.routeTemplate ?? req.route?.path ?? req.path,
      operation: ctx.operation,
      statusCode,
      durationMs,
      idempotencyKeyHash: ctx.idempotencyKeyHash,
      idempotencyReplay: ctx.idempotencyReplay,
      resourceType: ctx.resourceType,
      resourceId: ctx.resourceId,
      persistenceProvider: runtime.persistenceProvider,
      errorCode,
      providerDurationsMs: ctx.providerDurationsMs,
      databaseDurationMs: ctx.databaseDurationMs,
    };

    if (statusCode >= 500) {
      logger.error({ event: 'http.request.failed', ...baseFields });
    } else {
      logger.info({ event: 'http.request.completed', ...baseFields });
    }

    if (durationMs >= runtime.config.slowRequestThresholdMs) {
      logger.warn({
        event: 'http.request.slow',
        ...baseFields,
      });
    }
  });

  next();
}

function bodyErrorCode(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  if (typeof obj.code === 'string') return obj.code;
  if (obj.error && typeof obj.error === 'object') {
    const nested = obj.error as Record<string, unknown>;
    if (typeof nested.code === 'string') return nested.code;
  }
  return null;
}

export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void handleIdempotency(req, res, next);
}

async function handleIdempotency(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const runtime = getOperationsRuntime();
  const logger = getStructuredLogger();
  const metrics = getMetricsRegistry();
  const ctx = ensureObservabilityContext(req);

  const resolved = resolveCriticalOperation(req.method, req.path);
  if (!resolved) {
    next();
    return;
  }

  ctx.operation = resolved.operation;
  ctx.routeTemplate = resolved.operation;
  ctx.resourceId = extractResourceIdFromBody(
    resolved.operation,
    req.body,
    resolved.params,
  );

  if (!runtime.config.idempotencyEnabled) {
    next();
    return;
  }

  const rawKey = headerValue(req.headers, 'idempotency-key');
  if (rawKey == null || String(rawKey).trim() === '') {
    if (runtime.config.requiredForCriticalWrites) {
      sendError(
        res,
        req,
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Idempotency-Key header is required for this endpoint',
      );
      return;
    }
    next();
    return;
  }

  const validated = validateIdempotencyKey(rawKey);
  if (!validated.ok) {
    sendError(res, req, 400, validated.code, validated.message);
    return;
  }

  const key = validated.key;
  ctx.idempotencyKey = key;
  ctx.idempotencyKeyHash = hashIdempotencyKey(key);

  const requestHash = buildRequestHash({
    method: req.method,
    operation: resolved.operation,
    params: resolved.params,
    query: req.query as Record<string, unknown>,
    body: req.body,
    actor: extractActor(req.body),
    resourceId: ctx.resourceId,
  });

  try {
    const begin = await runtime.idempotency.begin({
      operation: resolved.operation,
      key,
      requestHash,
      correlationId: ctx.correlationId,
    });

    if (begin.action === 'replay') {
      metrics.increment('idempotency_replays_total');
      ctx.idempotencyReplay = true;
      ctx.skipIdempotencyFinalize = true;
      if (begin.record.resourceId) {
        ctx.resourceId = begin.record.resourceId;
      }
      logger.info({
        event: 'idempotency.request.replayed',
        correlationId: ctx.correlationId,
        requestId: ctx.requestId,
        operation: resolved.operation,
        idempotencyKeyHash: ctx.idempotencyKeyHash,
        resourceId: begin.record.resourceId,
        statusCode: begin.record.responseStatus,
      });
      res.setHeader('Idempotency-Replayed', 'true');
      for (const [h, v] of Object.entries(begin.record.responseHeaders ?? {})) {
        if (h.toLowerCase() === 'idempotency-replayed') continue;
        res.setHeader(h, v);
      }
      res.status(begin.record.responseStatus ?? 200).json(begin.record.responseBody);
      return;
    }

    if (begin.action === 'conflict') {
      metrics.increment('idempotency_conflicts_total');
      ctx.skipIdempotencyFinalize = true;
      const event =
        begin.code === 'IDEMPOTENCY_REQUEST_IN_PROGRESS'
          ? 'idempotency.request.in_progress'
          : begin.code === 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD'
            ? 'idempotency.payload.conflict'
            : 'idempotency.record.failed';
      logger.warn({
        event,
        correlationId: ctx.correlationId,
        requestId: ctx.requestId,
        operation: resolved.operation,
        idempotencyKeyHash: ctx.idempotencyKeyHash,
        errorCode: begin.code,
      });
      if (begin.retryAfterSeconds) {
        res.setHeader('Retry-After', String(begin.retryAfterSeconds));
      }
      sendError(res, req, begin.statusCode, begin.code, begin.message);
      return;
    }

    metrics.increment('idempotency_records_created_total');
    logger.info({
      event: 'idempotency.record.created',
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      operation: resolved.operation,
      idempotencyKeyHash: ctx.idempotencyKeyHash,
    });

    const originalJson = res.json.bind(res);
    let finalizeStarted = false;
    res.json = ((body: unknown) => {
      ctx.capturedResponseBody = body;
      if (!finalizeStarted) {
        finalizeStarted = true;
        const statusCode = res.statusCode;
        void finalizeIdempotency(
          req,
          requestHash,
          key,
          resolved.operation,
          statusCode,
        );
      }
      return originalJson(body);
    }) as Response['json'];

    res.on('finish', () => {
      if (finalizeStarted) return;
      void finalizeIdempotency(
        req,
        requestHash,
        key,
        resolved.operation,
        res.statusCode,
      );
    });

    next();
  } catch (error) {
    next(error instanceof Error ? error : new ApiError(500, 'Idempotency failed'));
  }
}

async function finalizeIdempotency(
  req: Request,
  requestHash: string,
  key: string,
  operation: string,
  statusCode: number,
): Promise<void> {
  const ctx = req.observability;
  if (!ctx || ctx.skipIdempotencyFinalize || ctx.idempotencyReplay) return;

  const runtime = getOperationsRuntime();
  const logger = getStructuredLogger();
  const body = ctx.capturedResponseBody;
  const decision = runtime.idempotency.shouldPersistResponse(statusCode);
  const resourceId =
    extractResourceIdFromBody(operation, body, {}) ?? ctx.resourceId;
  const errorCode = bodyErrorCode(body);

  try {
    if (decision === 'complete') {
      await runtime.idempotency.complete({
        operation,
        key,
        requestHash,
        responseStatus: statusCode,
        responseBody: body,
        responseHeaders: {},
        resourceId,
        errorCode,
      });
    } else if (decision === 'fail') {
      await runtime.idempotency.markFailed({
        operation,
        key,
        requestHash,
        errorCode: errorCode ?? `HTTP_${statusCode}`,
        responseStatus: statusCode,
        responseBody: body,
      });
      logger.warn({
        event: 'idempotency.record.failed',
        correlationId: ctx.correlationId,
        requestId: ctx.requestId,
        operation,
        idempotencyKeyHash: ctx.idempotencyKeyHash,
        errorCode: errorCode ?? `HTTP_${statusCode}`,
        statusCode,
      });
    }
  } catch (error) {
    logger.error({
      event: 'idempotency.record.failed',
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      operation,
      idempotencyKeyHash: ctx.idempotencyKeyHash,
      errorCode: 'IDEMPOTENCY_REPLAY_FAILED',
      message: error instanceof Error ? error.message : 'finalize failed',
    });
  }
}

function extractActor(body: unknown): unknown {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  return (
    obj.actor ??
    obj.surveyor ??
    obj.reviewer ??
    obj.approvedBy ??
    obj.rejectedBy ??
    obj.publishedBy ??
    null
  );
}
