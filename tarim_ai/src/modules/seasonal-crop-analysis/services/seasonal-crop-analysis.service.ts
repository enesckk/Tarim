import { ApiError } from '../../../utils/api-error.js';
import type { ParcelQuery } from '../../parcel/types/parcel.types.js';
import { buildParcelCacheKey } from '../../parcel/services/parcel-normalization.service.js';
import type { SeasonalAnalysisOrchestratorService } from './seasonal-analysis-orchestrator.service.js';
import type {
  SeasonalCropAnalysisCreatedResponse,
  SeasonalCropAnalysisRequest,
  SeasonalCropAnalysisResultData,
  SeasonalCropAnalysisStatusResponse,
  SeasonalDemoRequest,
} from '../types/seasonal-crop-analysis.types.js';
import type { SeasonalAnalysisRecord } from '../repositories/seasonal-analysis.repository.js';

/**
 * Fixed demo parcel mapping. Never invented — pulled from the same verified
 * cadastral fixtures used across the codebase. Both historical slug orderings
 * for the Sinan parcel resolve to the same real cadastral identity
 * (block 0 / parcel 1513) so the fixture identity is never accidentally
 * swapped.
 */
const DEMO_PARCELS: Record<string, ParcelQuery> = {
  'gungurge-108-7': {
    province: 'Gaziantep',
    district: 'Şehitkamil',
    neighborhood: 'Güngürge',
    block: '108',
    parcel: '7',
  },
  'sinan-1513-0': {
    province: 'Gaziantep',
    district: 'Şehitkamil',
    neighborhood: 'Sinan',
    block: '0',
    parcel: '1513',
  },
  'sinan-0-1513': {
    province: 'Gaziantep',
    district: 'Şehitkamil',
    neighborhood: 'Sinan',
    block: '0',
    parcel: '1513',
  },
};

function toCreatedResponse(record: SeasonalAnalysisRecord): SeasonalCropAnalysisCreatedResponse {
  return {
    analysisId: record.id,
    parcelId: record.parcelId,
    status: record.status,
    createdAt: record.createdAt,
  };
}

function toStatusResponse(record: SeasonalAnalysisRecord): SeasonalCropAnalysisStatusResponse {
  return {
    analysisId: record.id,
    status: record.status,
    progress: record.progress,
    steps: record.steps,
  };
}

export class SeasonalCropAnalysisService {
  constructor(private readonly orchestrator: SeasonalAnalysisOrchestratorService) {}

  async create(
    request: SeasonalCropAnalysisRequest,
    correlationId: string | null,
  ): Promise<SeasonalCropAnalysisCreatedResponse> {
    const record = await this.orchestrator.createAnalysis(request, correlationId);
    return toCreatedResponse(record);
  }

  async demo(
    request: SeasonalDemoRequest,
    correlationId: string | null,
  ): Promise<SeasonalCropAnalysisCreatedResponse> {
    const parcelQuery = DEMO_PARCELS[request.parcelSlug];
    if (!parcelQuery) {
      throw new ApiError(404, `Unknown demo parcel slug: ${request.parcelSlug}`, {
        code: 'DEMO_PARCEL_NOT_FOUND',
      });
    }
    return this.create(
      {
        parcelQuery,
        seasonYear: request.seasonYear,
        productionMode: request.productionMode,
        irrigationAvailability: request.irrigationAvailability,
      },
      correlationId,
    );
  }

  async getResult(id: string): Promise<SeasonalCropAnalysisResultData | null> {
    const record = await this.orchestrator.getRecord(id);
    return record?.result ?? null;
  }

  async getRecord(id: string): Promise<SeasonalAnalysisRecord | null> {
    return this.orchestrator.getRecord(id);
  }

  async getStatus(id: string): Promise<SeasonalCropAnalysisStatusResponse | null> {
    const record = await this.orchestrator.getRecord(id);
    if (!record) return null;
    return toStatusResponse(record);
  }

  async listByParcel(parcelQuery: ParcelQuery): Promise<SeasonalCropAnalysisResultData[]> {
    const parcelKey = buildParcelCacheKey(parcelQuery);
    const records = await this.orchestrator.listByParcelKey(parcelKey);
    return records.map((r) => r.result).filter((r): r is SeasonalCropAnalysisResultData => r != null);
  }

  async listByParcelKey(parcelKey: string): Promise<SeasonalCropAnalysisResultData[]> {
    const records = await this.orchestrator.listByParcelKey(parcelKey);
    return records.map((r) => r.result).filter((r): r is SeasonalCropAnalysisResultData => r != null);
  }
}
