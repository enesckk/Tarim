/** Optional map coordinates — cadastral (ada/parsel) lands may omit these. */

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180
}

/** Keep only in-range coords; drop corrupt / mis-mapped values (e.g. ada/parsel as lat). */
export function sanitizeCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): { latitude: number | null; longitude: number | null } {
  const lat = latitude != null && isValidLatitude(Number(latitude)) ? Number(latitude) : null
  const lng = longitude != null && isValidLongitude(Number(longitude)) ? Number(longitude) : null
  return { latitude: lat, longitude: lng }
}

export function formatLatitudeInput(value: number | null | undefined): string {
  if (value == null || !isValidLatitude(Number(value))) return ''
  return String(Number(value))
}

export function formatLongitudeInput(value: number | null | undefined): string {
  if (value == null || !isValidLongitude(Number(value))) return ''
  return String(Number(value))
}

/**
 * Parse optional Enlem/Boylam text fields.
 * Empty → null. Invalid → Turkish error (do not confuse with ada/parsel).
 */
export function parseOptionalCoordinates(
  latitudeRaw: string,
  longitudeRaw: string,
): { ok: true; latitude: number | null; longitude: number | null } | { ok: false; message: string } {
  const latTrim = latitudeRaw.trim()
  const lngTrim = longitudeRaw.trim()

  if (!latTrim && !lngTrim) {
    return { ok: true, latitude: null, longitude: null }
  }

  if ((latTrim && !lngTrim) || (!latTrim && lngTrim)) {
    return {
      ok: false,
      message: 'Enlem ve boylam birlikte girilmeli veya ikisi de boş bırakılmalı.',
    }
  }

  const lat = Number(latTrim.replace(',', '.'))
  const lng = Number(lngTrim.replace(',', '.'))

  if (!Number.isFinite(lat) || !isValidLatitude(lat)) {
    return {
      ok: false,
      message: `Enlem -90 ile 90 arasında olmalı (ör. 37.08). Ada/parsel numarasını buraya yazmayın.${latTrim ? ` Girdiğiniz değer: ${latTrim}` : ''}`,
    }
  }

  if (!Number.isFinite(lng) || !isValidLongitude(lng)) {
    return {
      ok: false,
      message: `Boylam -180 ile 180 arasında olmalı (ör. 37.38). Ada/parsel numarasını buraya yazmayın.${lngTrim ? ` Girdiğiniz değer: ${lngTrim}` : ''}`,
    }
  }

  return { ok: true, latitude: lat, longitude: lng }
}
