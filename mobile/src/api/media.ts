import { API_BASE_URL } from './config';

/**
 * Build an authenticated media URL for local upload keys.
 * Query token lets RN `<Image source={{ uri }}>` load without headers.
 */
export function mediaUrl(storageKey: string, token?: string | null): string {
  const raw = storageKey?.trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (u.pathname.startsWith('/uploads/')) {
        return mediaUrl(u.pathname, token);
      }
    } catch {
      // fall through
    }
    return raw;
  }

  let key = raw.replace(/^\/+/, '');
  if (key.startsWith('api/files/')) key = key.slice('api/files/'.length);

  const path = `/api/files/${key}`;
  const base = `${API_BASE_URL}${path}`;
  if (token) return `${base}?access_token=${encodeURIComponent(token)}`;
  return base;
}
