/**
 * Builds a narrow Process API timeRange that pins a single Sentinel-2 acquisition.
 *
 * Uses the Catalog `datetime` as the anchor. Product-id sensing timestamps
 * (…_YYYYMMDDTHHMMSS_…) can differ from Sentinel Hub Process indexing and
 * may yield empty/transparent imagery if used alone.
 *
 * Window is ±60s around the catalog datetime (< 50 minutes) so a different
 * orbit cannot overlap.
 */
export function buildProcessTimeRange(
  datetime: string,
  _productId?: string | null,
): { from: string; to: string } {
  const center = parseIso(datetime);
  const from = new Date(center.getTime() - 60_000);
  const to = new Date(center.getTime() + 60_000);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

/**
 * @deprecated Prefer buildProcessTimeRange for Process API requests.
 */
export function buildProcessDatetime(datetime: string, productId?: string | null): string {
  const range = buildProcessTimeRange(datetime, productId);
  return `${range.from}/${range.to}`;
}

/**
 * Parses sensing time encoded in a Sentinel-2 product id, if present.
 * Kept for metadata / debugging; not used as the Process API time anchor.
 */
export function parseSensingTimeFromProductId(productId?: string | null): Date | null {
  if (!productId) {
    return null;
  }

  const match = productId.match(/_(\d{8}T\d{6})_/);
  if (!match) {
    return null;
  }

  const raw = match[1];
  const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}.000Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseIso(datetime: string): Date {
  const date = new Date(datetime);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid datetime: ${datetime}`);
  }
  return date;
}

/**
 * Returns an ISO 8601 datetime range string for STAC catalog queries.
 * Example: 2024-01-01T00:00:00.000Z/2024-01-31T23:59:59.999Z
 */
export function buildDatetimeRange(days: number, now: Date = new Date()): string {
  if (days <= 0) {
    throw new Error('days must be a positive number');
  }

  const end = new Date(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);

  return `${start.toISOString()}/${end.toISOString()}`;
}

/**
 * Builds a Catalog datetime range covering the last N calendar months.
 */
export function buildDatetimeRangeMonths(months: number, now: Date = new Date()): {
  start: string;
  end: string;
  datetime: string;
} {
  if (months <= 0) {
    throw new Error('months must be a positive number');
  }

  const end = new Date(now);
  const start = new Date(now);
  start.setUTCMonth(start.getUTCMonth() - months);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    datetime: `${start.toISOString()}/${end.toISOString()}`,
  };
}

/**
 * Converts an ISO datetime to a filesystem-safe filename stem.
 * 2024-06-15T10:30:45.000Z -> 2024-06-15T10-30-45
 */
export function formatFilenameTimestamp(datetime: string): string {
  const date = parseIso(datetime);
  const pad = (n: number) => String(n).padStart(2, '0');

  return [
    date.getUTCFullYear(),
    '-',
    pad(date.getUTCMonth() + 1),
    '-',
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    '-',
    pad(date.getUTCMinutes()),
    '-',
    pad(date.getUTCSeconds()),
  ].join('');
}
