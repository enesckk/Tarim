import { API_BASE } from './client'

/**
 * Build a same-origin media URL for local upload keys.
 * The API authenticates these requests with a scoped HttpOnly cookie; JWTs never enter URLs.
 * External http(s) URLs (non-/uploads) are returned unchanged.
 */
export function mediaUrl(storageKey: string, _token?: string | null): string {
  const raw = storageKey?.trim()
  if (!raw) return ''

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw)
      if (u.pathname.startsWith('/uploads/')) {
        return mediaUrl(u.pathname)
      }
    } catch {
      // fall through
    }
    return raw
  }

  // Versioned PWA guidance assets are served by Vite/the service worker,
  // not by the authenticated upload endpoint.
  if (raw.startsWith('/guidance/') || raw.startsWith('/chapters/')) return raw

  let key = raw.replace(/^\/+/, '')
  if (key.startsWith('api/files/')) key = key.slice('api/files/'.length)

  const path = `/api/files/${key}`
  return `${API_BASE}${path}`
}
