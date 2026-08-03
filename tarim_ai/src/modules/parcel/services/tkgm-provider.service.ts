import axios, { type AxiosInstance } from 'axios';
import { getEnv } from '../../../config/env.js';
import { ApiError } from '../../../utils/api-error.js';
import type {
  TkgmAdministrativeItem,
  TkgmParcelFeature,
} from '../types/tkgm.types.js';
import { mapParcelProviderError } from '../utils/parcel-error.mapper.js';
import {
  normalizeLookupKey,
  ParcelNormalizationService,
} from '../services/parcel-normalization.service.js';

/**
 * Low-level TKGM CBS HTTP client.
 *
 * Uses the same public MegsisWebApi surface as scripts/tkgm_geojson_ekle.py:
 * - Provinces: parselsorgu ilListe.json (FeatureCollection)
 * - Districts / neighborhoods: /idariYapi/* (FeatureCollection)
 * - Parcel: /parsel/{mahalleId}/{ada}/{parsel} (Feature)
 */
export class TkgmProviderService {
  private readonly http: AxiosInstance;
  private readonly normalization = new ParcelNormalizationService();

  constructor() {
    const env = getEnv();
    this.http = axios.create({
      baseURL: env.TKGM_BASE_URL.replace(/\/$/, ''),
      timeout: env.TKGM_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 TarimAI/1.0',
      },
    });
  }

  async findProvinceId(provinceName: string): Promise<string> {
    const env = getEnv();
    const payload = await this.getJson<unknown>(env.TKGM_PROVINCES_PATH, {
      absolute: env.TKGM_PROVINCES_PATH.startsWith('http'),
    });
    const match = this.findAdminMatch(payload, provinceName, {
      idKeys: ['id'],
      nameKeys: ['text', 'ad', 'name'],
    });
    if (!match) {
      throw new ApiError(404, 'Parsel bulunamadı.');
    }
    return String(match);
  }

  async findDistrictId(provinceId: string, districtName: string): Promise<string> {
    const env = getEnv();
    const path = env.TKGM_DISTRICTS_PATH.replace('{provinceId}', encodeURIComponent(provinceId));
    const payload = await this.getJson<unknown>(path);
    const match = this.findAdminMatch(payload, districtName, {
      idKeys: ['id', 'ilceKodu'],
      nameKeys: ['text', 'ilceAdi', 'ad', 'name'],
    });
    if (!match) {
      throw new ApiError(404, 'Parsel bulunamadı.');
    }
    return String(match);
  }

  async findNeighborhoodId(districtId: string, neighborhoodName: string): Promise<string> {
    const env = getEnv();
    const path = env.TKGM_NEIGHBORHOODS_PATH.replace(
      '{districtId}',
      encodeURIComponent(districtId),
    );
    const payload = await this.getJson<unknown>(path);
    const match = this.findAdminMatch(payload, neighborhoodName, {
      idKeys: ['id', 'mahalleKodu'],
      nameKeys: ['text', 'mahalleAdi', 'ad', 'name'],
    });
    if (!match) {
      throw new ApiError(404, 'Parsel bulunamadı.');
    }
    return String(match);
  }

  async fetchParcelFeature(
    neighborhoodId: string,
    block: string,
    parcel: string,
  ): Promise<TkgmParcelFeature> {
    const env = getEnv();
    const apiBlock = block.trim() || '0';
    const path = env.TKGM_PARCEL_PATH.replace(
      '{neighborhoodId}',
      encodeURIComponent(neighborhoodId),
    )
      .replace('{block}', encodeURIComponent(apiBlock))
      .replace('{parcel}', encodeURIComponent(parcel.trim()));

    const payload = await this.getJson<TkgmParcelFeature | TkgmParcelFeature[]>(path);
    const feature = Array.isArray(payload) ? payload[0] : payload;

    if (!feature || feature.type !== 'Feature' || !feature.geometry) {
      throw new ApiError(404, 'Parsel bulunamadı.');
    }

    return feature;
  }

  parseArea(value: unknown): number | null {
    return this.normalization.parseArea(value);
  }

  /** Normalize TKGM admin list (array or FeatureCollection) into flat items. */
  unwrapAdminList(payload: unknown): TkgmAdministrativeItem[] {
    if (Array.isArray(payload)) {
      return payload as TkgmAdministrativeItem[];
    }
    if (
      payload &&
      typeof payload === 'object' &&
      (payload as { type?: string }).type === 'FeatureCollection'
    ) {
      const features = (payload as { features?: Array<Record<string, unknown>> }).features ?? [];
      return features.map((feature) => {
        const props = (feature.properties ?? {}) as Record<string, unknown>;
        return {
          ...props,
          id: props.id ?? props.ilceKodu ?? props.mahalleKodu,
          text: props.text ?? props.ilceAdi ?? props.mahalleAdi ?? props.ad ?? props.name,
        } as TkgmAdministrativeItem;
      });
    }
    return [];
  }

  private findAdminMatch(
    payload: unknown,
    expectedName: string,
    keys: { idKeys: string[]; nameKeys: string[] },
  ): string | number | null {
    const list = this.unwrapAdminList(payload);
    const exact: Array<string | number> = [];
    const partial: Array<string | number> = [];

    for (const item of list) {
      let name = '';
      for (const key of keys.nameKeys) {
        const value = item[key];
        if (value != null && String(value).trim()) {
          name = String(value).trim();
          break;
        }
      }
      let id: string | number | null = null;
      for (const key of keys.idKeys) {
        if (item[key] != null) {
          id = item[key] as string | number;
          break;
        }
      }
      if (id == null || !name) continue;

      if (this.normalization.matchesName(name, expectedName)) {
        exact.push(id);
      } else {
        const left = normalizeLookupKey(name);
        const right = normalizeLookupKey(expectedName);
        if (left.includes(right) || right.includes(left)) {
          partial.push(id);
        }
      }
    }

    if (exact.length === 1) return exact[0]!;
    if (exact.length === 0 && partial.length === 1) return partial[0]!;
    return null;
  }

  private async getJson<T>(
    pathOrUrl: string,
    options?: { absolute?: boolean },
  ): Promise<T> {
    const env = getEnv();
    const maxAttempts = env.TKGM_MAX_RETRIES + 1;
    let lastError: unknown;
    const absolute = options?.absolute ?? pathOrUrl.startsWith('http');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = absolute
          ? await axios.get<T>(pathOrUrl, {
              timeout: env.TKGM_TIMEOUT_MS,
              headers: {
                Accept: 'application/json',
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 TarimAI/1.0',
              },
            })
          : await this.http.get<T>(pathOrUrl);
        const data = response.data as T & { Message?: string; message?: string };
        if (data && typeof data === 'object' && (data.Message || data.message)) {
          throw new ApiError(502, String(data.Message || data.message), {
            code: 'PARCEL_PROVIDER_UNAVAILABLE',
            provider: 'tkgm',
          });
        }
        return response.data;
      } catch (error) {
        lastError = error;
        if (error instanceof ApiError) throw error;
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;

        if (status === 404) {
          throw new ApiError(404, 'Parsel bulunamadı.');
        }
        if (status === 403) {
          throw new ApiError(502, 'Resmi parsel servisine erişim şu anda engelleniyor.', {
            code: 'PARCEL_PROVIDER_FORBIDDEN',
            provider: 'tkgm',
          });
        }
        if (status != null && status >= 400 && status < 500) {
          throw mapParcelProviderError(error, `TKGM client error status=${status}`);
        }

        if (attempt >= maxAttempts) {
          break;
        }
      }
    }

    throw mapParcelProviderError(lastError, `TKGM request failed after ${maxAttempts} attempts`);
  }
}
