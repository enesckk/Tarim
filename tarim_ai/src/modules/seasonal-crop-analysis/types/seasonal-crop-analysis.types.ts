import type { ParcelQuery, ResolvedParcel } from '../../parcel/types/parcel.types.js';
import type {
  BarrierSeverity,
  ProductionType,
  SourceType,
  VerificationStatus,
} from '../../physical-suitability/types/physical-suitability.types.js';

/** Seasonal Crop Analysis V1 engine version — bump on scoring/rule logic changes. */
export const ENGINE_VERSION = 'seasonal-crop-analysis-v1.1.0';

/** Target crop codes for V1 (pilot list requested by product). */
export const TARGET_CROP_CODES = [
  'wheat',
  'barley',
  'chickpea',
  'red_lentil',
  'maize',
  'cotton',
  'sunflower',
  'tomato',
  'pepper',
  'eggplant',
  'cucumber',
  'zucchini',
  'potato',
  'onion',
  'garlic',
  'melon',
  'watermelon',
] as const;

export type TargetCropCode = (typeof TARGET_CROP_CODES)[number];

/**
 * Alias map from the V1 target crop vocabulary to the physical-suitability
 * catalog crop code. Crops that are not present in the physical-suitability
 * catalog after alias resolution are reported as unsupported — never faked.
 */
export const CROP_CATALOG_ALIASES: Partial<Record<TargetCropCode, string>> = {
  maize: 'corn',
};

/** Alias map from the V1 target crop vocabulary to crop-recommendation knowledge-base ids. */
export const CROP_RECOMMENDATION_ALIASES: Partial<Record<TargetCropCode, string>> = {
  maize: 'corn',
  red_lentil: 'lentil',
};

export type SeasonalAnalysisStatus =
  | 'processing'
  | 'completed'
  | 'partial_completed'
  | 'failed';

export type ProductionModeInput = 'auto' | 'rainfed' | 'irrigated';

export type IrrigationAvailabilityInput =
  | 'unavailable'
  | 'available_limited'
  | 'available_and_sufficient';

export interface SeasonalCropAnalysisRequest {
  parcelQuery: ParcelQuery;
  seasonYear: number;
  productionMode: ProductionModeInput;
  irrigationAvailability: IrrigationAvailabilityInput;
  soilLaboratoryReportId?: string | null;
  fieldSurveyId?: string | null;
  irrigationWaterSourceId?: string | null;
  /** Optional subset override of TARGET_CROP_CODES. Defaults to the full V1 list. */
  targetCropCodes?: string[];
}

export interface SeasonalDemoRequest {
  parcelSlug: string;
  seasonYear: number;
  productionMode: ProductionModeInput;
  irrigationAvailability: IrrigationAvailabilityInput;
}

export type SeasonalStepKey =
  | 'parcel'
  | 'climate'
  | 'soil'
  | 'terrain'
  | 'satellite'
  | 'soil_lab_report'
  | 'field_survey'
  | 'irrigation_water'
  | 'crop_evaluation';

export type SeasonalStepStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'missing'
  | 'failed'
  | 'skipped';

export interface SeasonalStep {
  key: SeasonalStepKey;
  label: string;
  status: SeasonalStepStatus;
  errorCode?: string | null;
  startedAt?: string;
  completedAt?: string;
}

export const STEP_LABELS: Record<SeasonalStepKey, string> = {
  parcel: 'Parsel sınırı alınıyor',
  climate: 'İklim profili alınıyor',
  soil: 'Toprak profili alınıyor',
  terrain: 'Arazi yapısı hesaplanıyor',
  satellite: 'Uydu verisi kontrol ediliyor',
  soil_lab_report: 'Toprak laboratuvar raporu doğrulanıyor',
  field_survey: 'Saha ölçümü doğrulanıyor',
  irrigation_water: 'Sulama suyu analizi doğrulanıyor',
  crop_evaluation: 'Ürün uygunluk değerlendirmesi yapılıyor',
};

export const ALL_STEP_KEYS: SeasonalStepKey[] = [
  'parcel',
  'climate',
  'soil',
  'terrain',
  'satellite',
  'soil_lab_report',
  'field_survey',
  'irrigation_water',
  'crop_evaluation',
];

/** A single candidate value considered during data-source resolution. */
export interface ResolvedInputCandidate {
  sourceType: SourceType;
  provider: string;
  value: unknown;
  unit: string | null;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  observationDate: string | null;
}

/** Result of resolving one criterion to a single authoritative value. */
export interface ResolvedInputValue {
  criterionCode: string;
  value: unknown;
  unit: string | null;
  selectedSourceType: SourceType;
  selectionReason: string;
  candidateCount: number;
  candidates: ResolvedInputCandidate[];
}

export type BarrierOutcomeSource = 'catalog_rule' | 'operational_rule';

export interface CriticalBarrierOutcome {
  code: string;
  criterionCode: string | null;
  isTriggered: boolean;
  severity: BarrierSeverity;
  reason: string;
  observedValue: unknown;
  source: BarrierOutcomeSource;
  /** The threshold/expected-value actually evaluated against (catalog rules only). */
  threshold?: unknown;
  /** Unit of the criterion, resolved from the criterion catalog (catalog rules only). */
  unit?: string | null;
  /** Title of the scientific source backing this rule (catalog rules only). */
  sourceReference?: string | null;
}

export type ComponentSuitabilityClassification =
  | 'suitable'
  | 'moderately_suitable'
  | 'marginally_suitable'
  | 'unsuitable'
  | 'insufficient_data'
  | 'preliminary';

export interface ComponentSuitabilityResult {
  component: string;
  score: number | null;
  classification: ComponentSuitabilityClassification;
  limitations: string[];
}

export type OverallSuitabilityClassification =
  | 'eligible'
  | 'blocked_by_barrier'
  | 'preliminary_only';

export interface OverallSuitabilityResult {
  eligibleForRanking: boolean;
  score: number | null;
  classification: OverallSuitabilityClassification;
  blockingBarrierCodes: string[];
}

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface ConfidenceResult {
  level: ConfidenceLevel;
  reasons: string[];
}

export interface CropAnalysisResult {
  requestedCropCode: string;
  catalogCropCode: string | null;
  cropName: string | null;
  supported: boolean;
  scenarioCode: string | null;
  productionType: ProductionType | null;
  barriers: CriticalBarrierOutcome[];
  componentSuitability: ComponentSuitabilityResult[];
  overall: OverallSuitabilityResult;
  confidence: ConfidenceResult;
  explanation: string;
  rank: number | null;
}

export interface UnsupportedCropEntry {
  cropCode: string;
  reason: string;
}

/** A crop that received a numeric score and is included in the deterministic ranking. */
export interface RankingEntry {
  cropCode: string;
  rank: number;
  score: number;
  confidence: ConfidenceLevel;
}

/** A crop that was evaluated but has no scoring source yet, so it cannot be ranked. */
export interface PreliminaryCropEntry {
  cropCode: string;
  reason: string;
}

/** A crop that was blocked by one or more critical barriers. */
export interface ExcludedCropEntry {
  cropCode: string;
  reason: string;
  barrierCodes: string[];
}

/**
 * Aggregate readiness summary for the ranking produced by this analysis.
 * Additive — never changes existing `crops`/`unsupportedCrops` semantics.
 */
export interface RankingReadiness {
  rankingReadyCropCount: number;
  preliminaryCropCount: number;
  unsupportedCropCount: number;
  excludedCropCount: number;
  policy: string;
}

/** Minimal, sanitized snapshot of the Sentinel satellite pipeline for this analysis. */
export interface SeasonalSatelliteContext {
  dateRange: { from: string; to: string } | null;
  candidateObservationCount: number;
  usableObservationCount: number;
  selectedObservationDate: string | null;
  ndviMean: number | null;
  warnings: string[];
}

export interface ParcelSummary {
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
  areaSquareMeters: number | null;
  provider?: string;
  verified?: boolean;
}

export interface SeasonalCropAnalysisResultData {
  analysisId: string;
  status: SeasonalAnalysisStatus;
  parcelKey: string | null;
  parcel: ParcelSummary | null;
  request: {
    seasonYear: number;
    productionMode: ProductionModeInput;
    irrigationAvailability: IrrigationAvailabilityInput;
  };
  steps: SeasonalStep[];
  resolvedInputs: ResolvedInputValue[];
  crops: CropAnalysisResult[];
  unsupportedCrops: UnsupportedCropEntry[];
  rankingReadiness: RankingReadiness;
  ranking: RankingEntry[];
  preliminaryCrops: PreliminaryCropEntry[];
  excludedCrops: ExcludedCropEntry[];
  satelliteContext?: SeasonalSatelliteContext | null;
  limitations: string[];
  engineVersion: string;
  calibrationVersion: string;
  generatedAt: string;
}

export interface SeasonalCropAnalysisCreatedResponse {
  analysisId: string;
  parcelId: string | null;
  status: SeasonalAnalysisStatus;
  createdAt: string;
}

export interface SeasonalCropAnalysisStatusResponse {
  analysisId: string;
  status: SeasonalAnalysisStatus;
  progress: number;
  steps: SeasonalStep[];
}

/** Internal representation of the resolved parcel, kept minimal for the pipeline. */
export interface SeasonalResolvedParcel {
  query: ParcelQuery;
  parcel: ResolvedParcel;
}
