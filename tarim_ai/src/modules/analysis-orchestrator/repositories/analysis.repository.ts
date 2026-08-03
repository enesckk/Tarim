import type {
  AnalysisRequest,
  AnalysisRequestOptions,
  AnalysisResultResponse,
  AnalysisStatus,
  AnalysisStep,
  AnalysisStepKey,
  AnalysisStepStatus,
} from '../types/analysis.types.js';

export interface AnalysisRecord {
  id: string;
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
  landId: string | null;
  parcelId: string | null;
  status: AnalysisStatus;
  progress: number;
  currentStep: AnalysisStepKey | null;
  result: AnalysisResultResponse | null;
  resultVersion: number;
  correlationId: string | null;
  errorCode: string | null;
  errorSummary: string | null;
  dataMode: 'live' | 'golden';
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  updatedAt: string;
  rowVersion: number;
  steps: AnalysisStep[];
  /** Optional manual soil / irrigation form payload. */
  requestOptions?: AnalysisRequestOptions | null;
}

export interface ProviderSnapshotInput {
  analysisId: string;
  providerName: string;
  stepKey: string;
  requestMetadata?: Record<string, unknown> | null;
  responseHash?: string | null;
  responseSummary?: Record<string, unknown> | null;
  sourceDate?: string | null;
  status: 'completed' | 'failed' | 'partial' | 'cached';
  cacheKey?: string | null;
  durationMs?: number | null;
}

export interface AnalysisStatusPatch {
  status?: AnalysisStatus;
  progress?: number;
  currentStep?: AnalysisStepKey | null;
  parcelId?: string | null;
  errorCode?: string | null;
  errorSummary?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  result?: AnalysisResultResponse | null;
}

export interface AnalysisRepository {
  create(record: AnalysisRecord): Promise<AnalysisRecord>;
  findById(id: string): Promise<AnalysisRecord | null>;
  update(
    id: string,
    patch: AnalysisStatusPatch,
    options?: { expectedVersion?: number },
  ): Promise<AnalysisRecord>;
  upsertStep(analysisId: string, step: AnalysisStep): Promise<AnalysisStep>;
  listSteps(analysisId: string): Promise<AnalysisStep[]>;
  addProviderSnapshot(input: ProviderSnapshotInput): Promise<void>;
  /** Optional: recent analyses for reporting / cache merge. */
  listRecent?(limit?: number): Promise<AnalysisRecord[]>;
  clear?(): void;
}

export function buildInitialRecord(
  id: string,
  request: AnalysisRequest,
  steps: AnalysisStep[],
  correlationId: string | null,
  dataMode: 'live' | 'golden',
): AnalysisRecord {
  const now = new Date().toISOString();
  return {
    id,
    province: request.province,
    district: request.district,
    neighborhood: request.neighborhood,
    block: request.block,
    parcel: request.parcel,
    landId: request.landId?.trim() || null,
    parcelId: null,
    status: 'queued',
    progress: 0,
    currentStep: null,
    result: null,
    resultVersion: 1,
    correlationId,
    errorCode: null,
    errorSummary: null,
    dataMode,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    updatedAt: now,
    rowVersion: 1,
    steps,
    requestOptions: request.options ?? null,
  };
}

export function cloneRecord(record: AnalysisRecord): AnalysisRecord {
  return structuredClone(record);
}

export type { AnalysisStepStatus };
