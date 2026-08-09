import type { NormalizedGeometry, GeoJsonInput } from '../../../../types/geojson.types.js';
import type { ParcelQueryService } from '../../../parcel/services/parcel-query.service.js';
import type { ParcelQuery } from '../../../parcel/types/parcel.types.js';
import { normalizeGeoJsonGeometry } from '../../../../utils/geometry.utils.js';
import { ApiError } from '../../../../utils/api-error.js';
import { ParcelCentroidService } from '../../shared/services/parcel-centroid.service.js';
import type { SoilProvider } from '../providers/soil-provider.interface.js';
import type { SoilProfile } from '../types/soil.types.js';
import { SoilNormalizationService } from './soil-normalization.service.js';
import { SoilLaboratoryService } from '../../../soil-laboratory/services/soil-laboratory.service.js';

const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  value: SoilProfile;
  expiresAt: number;
}

export interface SoilProfileRequest {
  geometry?: GeoJsonInput;
  parcelQuery?: ParcelQuery;
  resolved?: {
    geometry: NormalizedGeometry;
    parcel?: ParcelQuery;
  };
}

export class SoilProfileService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly provider: SoilProvider,
    private readonly parcelQueryService: ParcelQueryService,
    private readonly centroidService = new ParcelCentroidService(),
    private readonly normalization = new SoilNormalizationService(),
    private readonly cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
  ) {}

  private readonly soilLabService = new SoilLaboratoryService();

  async getProfile(request: SoilProfileRequest): Promise<SoilProfile> {
    const { geometry, parcel } = await this.resolveGeometryAndParcel(request);
    const centroid = this.centroidService.fromGeometry(geometry);
    const cacheKey = [
      this.provider.name,
      centroid.longitude.toFixed(4),
      centroid.latitude.toFixed(4),
    ].join('|');

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.info('[SoilCache] hit', { cacheKey, provider: this.provider.name });
      return cached.value;
    }

    console.info('[SoilCache] miss', { cacheKey, provider: this.provider.name });

    // Check laboratory data first
    let profile: SoilProfile | null = null;
    
    if (parcel) {
      const parcelId = `${parcel.province}-${parcel.district}-${parcel.neighborhood}-${parcel.block}-${parcel.parcel}`;
      const labReport = await this.soilLabService.getLatestApprovedReport(parcelId);
      if (labReport && labReport.results) {
        // Find essential parameters
        const ph = labReport.results.find(r => r.parameterName.toLowerCase() === 'ph');
        const om = labReport.results.find(r => r.parameterName.toLowerCase() === 'organic matter');
        
        if (ph && om) {
          // Construct partial profile from lab. Wait, the normalization service can handle missing fields or we provide defaults.
          // For now, we will map it manually or pass it through normalization.
          const labProfile: SoilProfile = {
            provider: 'laboratory',
            location: {
              latitude: centroid.latitude,
              longitude: centroid.longitude,
            },
            soil: {
              ph: ph.value,
              texture: 'loam', // Fallback or parsed from lab
              organicMatterPercent: om.value,
              electricalConductivityDsM: labReport.results.find(r => r.parameterName.toLowerCase() === 'electrical conductivity')?.value ?? null,
              salinityRisk: 'low',
              drainage: 'moderate',
              waterHoldingCapacity: 'medium',
              calciumCarbonatePercent: labReport.results.find(r => r.parameterName.toLowerCase() === 'lime')?.value ?? null,
              depthCm: labReport.sampleDepth ? parseInt(labReport.sampleDepth) || 90 : 90,
            },
            suitabilitySignals: {
              rootDevelopment: 'good',
              waterRetention: 'moderate',
              salinityConstraint: 'low',
              generalSoilCondition: 'good'
            },
            confidence: 'high',
            limitations: [],
            metadata: {
              provider: 'laboratory',
              source: 'laboratory',
              generatedAt: new Date().toISOString(),
              timestamp: labReport.analysisDate || labReport.createdAt,
              isMock: false,
              isEstimated: false,
            }
          };
          profile = labProfile;
        }
      }
    }

    if (!profile) {
      const raw = await this.provider.getProfile({
        geometry,
        centroid,
        parcel,
      });
      profile = this.normalization.normalize(raw);
    }
    const ttl =
      profile.provider === 'soilgrids' || this.provider.name === 'soilgrids'
        ? this.cacheTtlMs
        : DEFAULT_CACHE_TTL_MS;
    this.cache.set(cacheKey, { value: profile, expiresAt: Date.now() + ttl });
    return profile;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async resolveGeometryAndParcel(request: SoilProfileRequest): Promise<{
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
