import axios from 'axios';
import { getEnv } from '../config/env.js';
import type { ProcessImageOptions } from '../types/satellite.types.js';
import { ApiError } from '../utils/api-error.js';
import { buildProcessTimeRange } from '../utils/date.utils.js';
import { assertValidPngImage } from '../utils/png.utils.js';
import { copernicusAuthService } from './copernicus-auth.service.js';

const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';

class CopernicusProcessService {
  async processImage(options: ProcessImageOptions): Promise<Buffer> {
    const env = getEnv();
    const token = await copernicusAuthService.getAccessToken();
    const timeRange = buildProcessTimeRange(options.datetime, options.productId);
    const outputFormat = options.outputFormat ?? 'image/png';

    const dataFilter: Record<string, unknown> = {
      timeRange: {
        from: timeRange.from,
        to: timeRange.to,
      },
      mosaickingOrder: 'mostRecent',
    };

    // maxCloudCoverage 100 keeps cloudy latest scenes eligible.
    if (options.cloudCoverage != null) {
      dataFilter.maxCloudCoverage = 100;
    }

    const requestBody = {
      input: {
        bounds: {
          geometry: options.geometry,
          properties: {
            crs: CRS84,
          },
        },
        data: [
          {
            type: 'sentinel-2-l2a',
            dataFilter,
          },
        ],
      },
      output: {
        width: options.width,
        height: options.height,
        responses: [
          {
            identifier: 'default',
            format: {
              type: outputFormat,
            },
          },
        ],
      },
      evalscript: options.evalscript,
    };

    try {
      const response = await axios.post(
        `${env.COPERNICUS_BASE_URL}/api/v1/process`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: outputFormat,
          },
          responseType: 'arraybuffer',
          timeout: 120_000,
          validateStatus: () => true,
        },
      );

      if (response.status < 200 || response.status >= 300) {
        throwProcessApiError(response.status, response.headers, response.data);
      }

      const buffer = Buffer.from(response.data);

      if (outputFormat === 'image/png') {
        assertValidPngImage(buffer, 'Process API PNG');
      } else if (buffer.length < 8) {
        throw new ApiError(502, 'Process API TIFF response is empty');
      }

      return buffer;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        throwProcessApiError(
          error.response?.status ?? 502,
          error.response?.headers,
          error.response?.data,
        );
      }

      throw new ApiError(502, 'Copernicus Process API request failed');
    }
  }
}

function throwProcessApiError(
  status: number,
  headers: unknown,
  data: unknown,
): never {
  const safeBody = sanitizeProcessErrorBody(data);
  const safeHeaders = pickSafeHeaders(headers);

  console.error('[Process API error]', {
    status,
    headers: safeHeaders,
    body: safeBody,
  });

  throw new ApiError(
    status >= 400 && status < 600 ? status : 502,
    'Copernicus Process API request failed',
    {
      status,
      message:
        typeof safeBody === 'object' && safeBody !== null && 'message' in safeBody
          ? String((safeBody as { message: unknown }).message)
          : undefined,
    },
  );
}

function sanitizeProcessErrorBody(data: unknown): unknown {
  if (data == null) {
    return undefined;
  }

  let text: string;
  if (Buffer.isBuffer(data)) {
    text = data.toString('utf8');
  } else if (data instanceof ArrayBuffer) {
    text = Buffer.from(data).toString('utf8');
  } else if (typeof data === 'string') {
    text = data;
  } else if (typeof data === 'object') {
    return redactSecrets(data as Record<string, unknown>);
  } else {
    return undefined;
  }

  if (text.startsWith('\u0089PNG') || text.includes('PNG') || text.startsWith('II*') || text.startsWith('MM')) {
    return { note: 'binary image payload omitted' };
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return redactSecrets(parsed);
  } catch {
    return text.slice(0, 500);
  }
}

function redactSecrets(value: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set([
    'access_token',
    'accessToken',
    'client_secret',
    'clientSecret',
    'Authorization',
    'authorization',
    'token',
  ]);

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (blocked.has(key)) {
      result[key] = '[redacted]';
      continue;
    }
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      result[key] = redactSecrets(entry as Record<string, unknown>);
    } else {
      result[key] = entry;
    }
  }
  return result;
}

function pickSafeHeaders(headers: unknown): Record<string, string> {
  if (!headers || typeof headers !== 'object') {
    return {};
  }

  const source = headers as Record<string, unknown>;
  const allow = [
    'content-type',
    'content-length',
    'date',
    'server',
    'x-request-id',
    'x-processingunit-cost',
    'x-ratelimit-remaining',
  ];

  const result: Record<string, string> = {};
  for (const key of allow) {
    const value = source[key];
    if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'number') {
      result[key] = String(value);
    }
  }
  return result;
}

export const copernicusProcessService = new CopernicusProcessService();
