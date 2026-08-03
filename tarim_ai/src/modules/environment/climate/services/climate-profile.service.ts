import type { NormalizedGeometry, GeoJsonInput } from '../../../../types/geojson.types.js';
import type { ParcelQueryService } from '../../../parcel/services/parcel-query.service.js';
import type { ParcelQuery } from '../../../parcel/types/parcel.types.js';
import { normalizeGeoJsonGeometry } from '../../../../utils/geometry.utils.js';
import { ApiError } from '../../../../utils/api-error.js';
import { ParcelCentroidService } from '../../shared/services/parcel-centroid.service.js';
import type { ClimateProvider } from '../providers/climate-provider.interface.js';
import type { ClimateProfile } from '../types/climate.types.js';
import { ClimateNormalizationService } from './climate-normalization.service.js';
import { NASA_POWER_REQUEST_PARAMETERS } from '../config/season.config.js';
import {
  clampHistoryYears,
  resolveCompletedClimatologyPeriod,
  toIsoDate,
} from '../utils/climate-date.utils.js';

const MOCK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NASA_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  value: ClimateProfile;
  expiresAt: number;
}

export interface ClimateProfileRequest {
  geometry?: GeoJsonInput;
  parcelQuery?: ParcelQuery;
  years: number;
  resolved?: {
    geometry: NormalizedGeometry;
    parcel?: ParcelQuery;
  };
}

export class ClimateProfileService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly provider: ClimateProvider,
    private readonly parcelQueryService: ParcelQueryService,
    private readonly centroidService = new ParcelCentroidService(),
    private readonly normalization = new ClimateNormalizationService(),
  ) {}

  async getProfile(request: ClimateProfileRequest): Promise<ClimateProfile> {
    const { geometry, parcel } = await this.resolveGeometryAndParcel(request);
    const centroid = this.centroidService.fromGeometry(geometry);
    const years = clampHistoryYears(request.years);
    const period = resolveCompletedClimatologyPeriod(years);
    const cacheKey = [
      this.provider.name,
      centroid.longitude.toFixed(4),
      centroid.latitude.toFixed(4),
      toIsoDate(period.startDate),
      toIsoDate(period.endDate),
      NASA_POWER_REQUEST_PARAMETERS.join(','),
    ].join('|');

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.info('[ClimateCache] hit', { cacheKey, provider: this.provider.name });
      return cached.value;
    }

    console.info('[ClimateCache] miss', { cacheKey, provider: this.provider.name });

    const raw = await this.provider.getProfile({
      geometry,
      centroid,
      parcel,
      years,
    });

    const profile = this.normalization.normalize(raw);
    const ttl = this.resolveTtlMs(profile);
    this.cache.set(cacheKey, { value: profile, expiresAt: Date.now() + ttl });
    return profile;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private resolveTtlMs(profile: ClimateProfile): number {
    if (profile.metadata.isMock || this.provider.name === 'mock') {
      return MOCK_CACHE_TTL_MS;
    }
    if (this.provider.name === 'nasa-power' || profile.provider === 'nasa-power') {
      return NASA_CACHE_TTL_MS;
    }
    return MOCK_CACHE_TTL_MS;
  }

  private async resolveGeometryAndParcel(request: ClimateProfileRequest): Promise<{
    geometry: NormalizedGeometry;
    parcel?: ParcelQuery;
  }> {
    if (request.resolved) {
      return request.resolved;
    }

    if (request.geometry && request.parcelQuery) {
      throw new ApiError(400, 'Provide either geometry or parcelQuery, not both');
    }

    if (request.parcelQuery) {
      const resolved = await this.parcelQueryService.resolve(request.parcelQuery);
      return {
        geometry: resolved.parcel.geometry,
        parcel: {
          province: resolved.parcel.province,
          district: resolved.parcel.district,
          neighborhood: resolved.parcel.neighborhood,
          block: resolved.parcel.block,
          parcel: resolved.parcel.parcel,
        },
      };
    }

    if (!request.geometry) {
      throw new ApiError(400, 'Either geometry or parcelQuery is required');
    }

    try {
      return { geometry: normalizeGeoJsonGeometry(request.geometry) };
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 400) {
        throw new ApiError(422, 'Parsel geometrisi geçersiz.', error.details);
      }
      throw error;
    }
  }
}
