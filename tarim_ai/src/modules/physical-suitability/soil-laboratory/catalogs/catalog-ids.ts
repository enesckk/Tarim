import { createHash } from 'node:crypto';

/** Deterministic UUID v4-shaped id from a catalog key (stable across restarts). */
export function catalogUuid(namespace: string, code: string): string {
  const digest = createHash('sha256').update(`${namespace}:${code}`).digest('hex');
  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `8${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join('-');
}

export function normalizeAliasText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
