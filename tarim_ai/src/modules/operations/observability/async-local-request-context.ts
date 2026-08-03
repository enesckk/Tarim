import { AsyncLocalStorage } from 'node:async_hooks';
import type { RequestObservabilityContext } from './request-context.js';

const storage = new AsyncLocalStorage<RequestObservabilityContext>();

export function runWithRequestObservabilityContext<T>(
  ctx: RequestObservabilityContext,
  fn: () => T,
): T {
  return storage.run(ctx, fn);
}

export function getRequestObservabilityContext():
  | RequestObservabilityContext
  | undefined {
  return storage.getStore();
}

