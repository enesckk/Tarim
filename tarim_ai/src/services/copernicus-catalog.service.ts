import axios from 'axios';
import { getEnv } from '../config/env.js';
import type { NormalizedGeometry } from '../types/geojson.types.js';
import type {
  CatalogFeature,
  CatalogSearchResponse,
  SatelliteProduct,
} from '../types/satellite.types.js';
import { ApiError } from '../utils/api-error.js';
import { buildDatetimeRange, buildDatetimeRangeMonths } from '../utils/date.utils.js';
import { copernicusAuthService } from './copernicus-auth.service.js';

export interface CatalogSearchParams {
  geometry: NormalizedGeometry;
  days?: number;
  months?: number;
  datetime?: string;
  limit?: number;
}

class CopernicusCatalogService {
  async search(params: CatalogSearchParams): Promise<SatelliteProduct[]> {
    const datetime = resolveDatetime(params);
    const limit = params.limit ?? 100;
    const allFeatures: CatalogFeature[] = [];

    let next: string | number | undefined;
    let page = 0;
    const maxPages = 20;

    try {
      do {
        page += 1;
        const response = await this.searchPage({
          geometry: params.geometry,
          datetime,
          limit,
          next,
        });

        allFeatures.push(...(response.features ?? []));
        next = extractNextToken(response);
      } while (next !== undefined && page < maxPages);

      return allFeatures.map((feature) => this.mapFeature(feature)).filter(isValidProduct);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 502;
        throw new ApiError(
          status >= 400 && status < 600 ? status : 502,
          'Copernicus Catalog search failed',
          {
            status: error.response?.status,
            message:
              typeof error.response?.data === 'object' &&
              error.response?.data !== null &&
              'detail' in error.response.data
                ? String((error.response.data as { detail: unknown }).detail)
                : undefined,
          },
        );
      }

      throw new ApiError(502, 'Copernicus Catalog search failed');
    }
  }

  private async searchPage(input: {
    geometry: NormalizedGeometry;
    datetime: string;
    limit: number;
    next?: string | number;
  }): Promise<CatalogSearchResponse> {
    const env = getEnv();
    const token = await copernicusAuthService.getAccessToken();

    const requestBody: Record<string, unknown> = {
      collections: ['sentinel-2-l2a'],
      intersects: input.geometry,
      datetime: input.datetime,
      limit: input.limit,
    };

    if (input.next !== undefined) {
      requestBody.next = input.next;
    }

    const response = await axios.post<CatalogSearchResponse>(
      `${env.COPERNICUS_BASE_URL}/catalog/v1/search`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/geo+json',
        },
        timeout: 60_000,
      },
    );

    return response.data;
  }

  private mapFeature(feature: CatalogFeature): SatelliteProduct | null {
    const props = feature.properties ?? {};

    const datetime =
      asString(props.datetime) ??
      asString(props.start_datetime) ??
      asString(props.end_datetime);

    if (!datetime || !feature.id) {
      return null;
    }

    const satellite =
      asString(props.platform) ?? asString(props.constellation) ?? 'Sentinel-2';

    const cloudCoverage = asNumber(props['eo:cloud_cover']);
    const tile = asString(props['s2:mgrs_tile']) ?? extractTileFromId(feature.id) ?? null;

    return {
      id: feature.id,
      datetime,
      satellite,
      cloudCoverage,
      tile,
    };
  }
}

function resolveDatetime(params: CatalogSearchParams): string {
  if (params.datetime) {
    return params.datetime;
  }
  if (params.months != null) {
    return buildDatetimeRangeMonths(params.months).datetime;
  }
  if (params.days != null) {
    return buildDatetimeRange(params.days);
  }
  throw new ApiError(400, 'Catalog search requires days, months, or datetime');
}

function extractNextToken(response: CatalogSearchResponse): string | number | undefined {
  if (response.context?.next !== undefined && response.context.next !== null) {
    return response.context.next;
  }

  const nextLink = response.links?.find((link) => link.rel === 'next');
  if (nextLink?.body && typeof nextLink.body === 'object' && nextLink.body !== null) {
    const body = nextLink.body as { next?: string | number };
    if (body.next !== undefined) {
      return body.next;
    }
  }

  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractTileFromId(id: string): string | null {
  const match = id.match(/_T([0-9]{2}[A-Z]{3})_/);
  return match ? `T${match[1]}` : null;
}

function isValidProduct(product: SatelliteProduct | null): product is SatelliteProduct {
  return product !== null;
}

export const copernicusCatalogService = new CopernicusCatalogService();
