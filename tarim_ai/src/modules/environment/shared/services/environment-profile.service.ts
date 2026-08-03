import type { ParcelQueryService } from '../../../parcel/services/parcel-query.service.js';
import type { ClimateProfileService } from '../../climate/services/climate-profile.service.js';
import type { SoilProfileService } from '../../soil/services/soil-profile.service.js';
import type { ParcelQuery, ResolvedParcel } from '../../../parcel/types/parcel.types.js';
import type { ClimateProfile } from '../../climate/types/climate.types.js';
import type { SoilProfile } from '../../soil/types/soil.types.js';
import type { GeoJsonInput } from '../../../../types/geojson.types.js';
import { normalizeGeoJsonGeometry } from '../../../../utils/geometry.utils.js';
import { ApiError } from '../../../../utils/api-error.js';

export interface EnvironmentProfileRequest {
  geometry?: GeoJsonInput;
  parcelQuery?: ParcelQuery;
  years: number;
}

export interface EnvironmentDataSources {
  climate: {
    provider: string;
    isMock: boolean;
    isEstimated: boolean;
  };
  soil: {
    provider: string;
    isMock: boolean;
    isEstimated: boolean;
  };
}

export interface EnvironmentProfileResponse {
  parcel: ResolvedParcel | null;
  climate: ClimateProfile;
  soil: SoilProfile;
  dataSources: EnvironmentDataSources;
}

/**
 * Combined environment profile: resolves parcel once, then climate + soil in parallel.
 */
export class EnvironmentProfileService {
  constructor(
    private readonly parcelQueryService: ParcelQueryService,
    private readonly climateProfileService: ClimateProfileService,
    private readonly soilProfileService: SoilProfileService,
  ) {}

  async getProfile(request: EnvironmentProfileRequest): Promise<EnvironmentProfileResponse> {
    if (request.geometry && request.parcelQuery) {
      throw new ApiError(400, 'Provide either geometry or parcelQuery, not both');
    }
    if (!request.geometry && !request.parcelQuery) {
      throw new ApiError(400, 'Either geometry or parcelQuery is required');
    }

    let parcel: ResolvedParcel | null = null;
    let resolvedGeometry;
    let parcelContext: ParcelQuery | undefined;

    if (request.parcelQuery) {
      const resolved = await this.parcelQueryService.resolve(request.parcelQuery);
      parcel = resolved.parcel;
      resolvedGeometry = resolved.parcel.geometry;
      parcelContext = {
        province: resolved.parcel.province,
        district: resolved.parcel.district,
        neighborhood: resolved.parcel.neighborhood,
        block: resolved.parcel.block,
        parcel: resolved.parcel.parcel,
      };
    } else {
      try {
        resolvedGeometry = normalizeGeoJsonGeometry(request.geometry!);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 400) {
          throw new ApiError(422, 'Parsel geometrisi geçersiz.', error.details);
        }
        throw error;
      }
    }

    const resolved = { geometry: resolvedGeometry, parcel: parcelContext };

    const [climate, soil] = await Promise.all([
      this.climateProfileService.getProfile({
        years: request.years,
        resolved,
      }),
      this.soilProfileService.getProfile({
        resolved,
      }),
    ]);

    return {
      parcel,
      climate,
      soil,
      dataSources: {
        climate: {
          provider: String(climate.metadata.provider ?? climate.provider),
          isMock: Boolean(climate.metadata.isMock),
          isEstimated: climate.metadata.isEstimated !== false,
        },
        soil: {
          provider: String(soil.metadata.provider ?? soil.provider),
          isMock: Boolean(soil.metadata.isMock),
          isEstimated: soil.metadata.isEstimated !== false,
        },
      },
    };
  }
}
