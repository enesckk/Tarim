const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|authorization|cookie|databaseurl|clientsecret|apikey|access_token|refresh_token)/i;

export function redactSensitive<T>(value: T, depth = 0): T {
  if (depth > 12) return '[MaxDepth]' as T;
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1)) as T;
  }
  if (typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    out[key] = redactSensitive(nested, depth + 1);
  }
  return out as T;
}

export function maskSecret(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (value.length <= 8) return '****';
  return `${value.slice(0, 2)}…${value.slice(-2)}`;
}
