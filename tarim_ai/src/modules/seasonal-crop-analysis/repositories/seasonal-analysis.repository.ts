import type {
  SeasonalAnalysisStatus,
  SeasonalCropAnalysisRequest,
  SeasonalCropAnalysisResultData,
  SeasonalStep,
} from '../types/seasonal-crop-analysis.types.js';

export interface SeasonalAnalysisRecord {
  id: string;
  parcelKey: string | null;
  parcelId: string | null;
  request: SeasonalCropAnalysisRequest;
  result: SeasonalCropAnalysisResultData | null;
  status: SeasonalAnalysisStatus;
  progress: number;
  steps: SeasonalStep[];
  engineVersion: string;
  calibrationVersion: string;
  correlationId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  version: number;
}

export interface SeasonalAnalysisPatch {
  parcelKey?: string | null;
  parcelId?: string | null;
  result?: SeasonalCropAnalysisResultData | null;
  status?: SeasonalAnalysisStatus;
  progress?: number;
  steps?: SeasonalStep[];
  completedAt?: string | null;
}

export interface SeasonalAnalysisRepository {
  create(record: SeasonalAnalysisRecord): Promise<SeasonalAnalysisRecord>;
  findById(id: string): Promise<SeasonalAnalysisRecord | null>;
  update(
    id: string,
    patch: SeasonalAnalysisPatch,
    options?: { expectedVersion?: number },
  ): Promise<SeasonalAnalysisRecord>;
  listByParcelKey(parcelKey: string): Promise<SeasonalAnalysisRecord[]>;
  clear?(): void;
}

export function cloneSeasonalRecord(record: SeasonalAnalysisRecord): SeasonalAnalysisRecord {
  return structuredClone(record);
}

export function buildInitialSeasonalRecord(
  id: string,
  request: SeasonalCropAnalysisRequest,
  steps: SeasonalStep[],
  engineVersion: string,
  calibrationVersion: string,
  correlationId: string | null,
): SeasonalAnalysisRecord {
  const now = new Date().toISOString();
  return {
    id,
    parcelKey: null,
    parcelId: null,
    request,
    result: null,
    status: 'processing',
    progress: 0,
    steps,
    engineVersion,
    calibrationVersion,
    correlationId,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    version: 1,
  };
}
