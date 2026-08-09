export type AnalysisStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'partial_completed'
  | 'failed';

export type AnalysisStepKey =
  | 'parcel'
  | 'satellite_catalog'
  | 'satellite_imagery'
  | 'satellite_statistics'
  | 'satellite_time_series'
  | 'terrain'
  | 'climate'
  | 'soil'
  | 'field_survey'
  | 'land_usability'
  | 'crop_compatibility'
  | 'recommendations'
  | 'report_ready';

export type AnalysisStepStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'missing'
  | 'failed'
  | 'skipped';

export interface AnalysisStep {
  key: AnalysisStepKey;
  label: string;
  status: AnalysisStepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string | null;
  durationMs?: number;
}

/** Optional applicant-provided soil lab-style values or PDF report. */
export interface ManualSoilInput {
  /** enter = numeric values; pdf = lab PDF upload; skip = SoilGrids only. */
  mode: 'enter' | 'pdf' | 'skip';
  ph?: number | null;
  ecDsM?: number | null;
  organicMatterPercent?: number | null;
  clayPercent?: number | null;
  sandPercent?: number | null;
  siltPercent?: number | null;
  /** Base64 PDF payload (stripped after persist; not stored in DB). */
  attachment?: {
    fileName: string;
    contentType: string;
    dataBase64: string;
  } | null;
}

/** Optional irrigation declaration, quality values, or PDF report. */
export interface ManualIrrigationInput {
  /** enter = declare (+ optional quality); pdf = water lab PDF; skip = continue without. */
  mode: 'enter' | 'pdf' | 'skip';
  availability?:
    | 'unavailable'
    | 'available_limited'
    | 'available_and_sufficient'
    | 'unknown'
    | null;
  qualityEntered?: boolean;
  ecDsM?: number | null;
  sar?: number | null;
  ph?: number | null;
  attachment?: {
    fileName: string;
    contentType: string;
    dataBase64: string;
  } | null;
}

export interface AnalysisRequestOptions {
  soil?: ManualSoilInput | null;
  irrigation?: ManualIrrigationInput | null;
}

export interface AnalysisAttachmentSummary {
  kind: 'soil' | 'irrigation';
  fileName: string;
  contentType: string;
  byteSize: number;
  uploadedAt: string;
}

export interface AnalysisRequest {
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
  /** AMS land id — caches completed analysis under this land for detail view. */
  landId?: string | null;
  /** Optional manual soil / irrigation inputs from the analysis form. */
  options?: AnalysisRequestOptions | null;
}

export interface ApplicantInputsSummary {
  soilMode: 'enter' | 'pdf' | 'skip';
  irrigationMode: 'enter' | 'pdf' | 'skip';
  irrigationAvailability:
    | 'unavailable'
    | 'available_limited'
    | 'available_and_sufficient'
    | 'unknown'
    | null;
  soilValuesUsed: boolean;
  irrigationQualityUsed: boolean;
  soilAttachment?: AnalysisAttachmentSummary | null;
  irrigationAttachment?: AnalysisAttachmentSummary | null;
  /** Persisted form values for past-test review. */
  soil?: {
    ph?: number | null;
    ecDsM?: number | null;
    organicMatterPercent?: number | null;
    clayPercent?: number | null;
    sandPercent?: number | null;
    siltPercent?: number | null;
  } | null;
  irrigation?: {
    availability?:
      | 'unavailable'
      | 'available_limited'
      | 'available_and_sufficient'
      | 'unknown'
      | null;
    qualityEntered?: boolean;
    ecDsM?: number | null;
    sar?: number | null;
    ph?: number | null;
  } | null;
}

export interface AnalysisCreatedResponse {
  analysisId: string;
  parcelId: string | null;
  status: AnalysisStatus;
  createdAt: string;
}

export interface AnalysisStatusResponse {
  analysisId: string;
  status: AnalysisStatus;
  progress: number;
  currentStep: AnalysisStepKey | null;
  steps: AnalysisStep[];
}

export interface DataSourceInfo {
  key: string;
  label: string;
  status: AnalysisStepStatus;
  dataType: string;
  quality: string;
  isEstimated: boolean;
  isMeasured: boolean;
  isApproved: boolean;
  observationCount: number;
  dateRange: { from: string | null; to: string | null } | null;
  lastUpdatedAt: string | null;
  warning: string | null;
}

export interface ParcelInfo {
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
  areaSquareMeters: number | null;
  geometry: { type: string; coordinates: unknown } | null;
  centroid: { latitude: number; longitude: number } | null;
  provider: string;
  sourceType?: string;
  verified?: boolean;
  fallbackUsed?: boolean;
  fallbackReason?: string | null;
  sourceMetadata?: Record<string, unknown>;
  retrievedAt: string;
}

export interface SatelliteInfo {
  dateRange: { from: string; to: string } | null;
  candidateObservationCount: number;
  usableObservationCount: number;
  rejectedObservationCount: number;
  latestObservationDate: string | null;
  selectedObservation: {
    date: string;
    cloudCoverage: number;
    resolutionMeters: number;
    trueColor: { imageUrl: string; mimeType: string } | null;
    ndvi: {
      imageUrl: string;
      statistics: { min: number; max: number; mean: number; median: number } | null;
    } | null;
    ndmi: {
      imageUrl: string;
      statistics: { min: number; max: number; mean: number; median: number } | null;
    } | null;
    bsi: {
      imageUrl: string;
      statistics: { min: number; max: number; mean: number; median: number } | null;
    } | null;
  } | null;
  timeSeries: {
    ndvi: Array<{ date: string; mean: number }>;
    ndmi: Array<{ date: string; mean: number }>;
    bsi: Array<{ date: string; mean: number }>;
  } | null;
  trend: Record<string, unknown> | null;
  warnings: string[];
}

export interface TerrainInfo {
  source: string;
  resolutionMeters: number;
  coverage: Record<string, unknown>;
  elevation: { minMeters: number; maxMeters: number; meanMeters: number };
  slope: { meanDegrees: number; maxDegrees: number; class: string };
  aspect: Record<string, unknown>;
  ruggedness: Record<string, unknown>;
  terrainVariability: Record<string, unknown>;
  mechanizationSuitability: Record<string, unknown>;
  warnings: string[];
}

export interface ClimateInfo {
  source: string;
  dataNature: string;
  dateRange: Record<string, unknown>;
  temperature: Record<string, unknown>;
  precipitation: Record<string, unknown>;
  humidity: Record<string, unknown>;
  solarRadiation: Record<string, unknown>;
  wind: Record<string, unknown>;
  warnings: string[];
}

export interface SoilInfo {
  source: string;
  dataNature: string;
  spatialResolutionMeters: number;
  depthLayers: string[];
  ph?: number;
  ecDsM?: number;
  organicMatterPercent?: number;
  clayPercent?: number;
  sandPercent?: number;
  siltPercent?: number;
  properties: {
    ph: Record<string, unknown>;
    clayPercent: Record<string, unknown>;
    sandPercent: Record<string, unknown>;
    siltPercent: Record<string, unknown>;
    organicCarbon: Record<string, unknown>;
    bulkDensity: Record<string, unknown>;
    coarseFragments: Record<string, unknown>;
  };
  uncertainty: Record<string, unknown>;
  warnings: string[];
}

export interface FieldSurveyInfo {
  status: string;
  surveyId: string | null;
  approvedAt: string | null;
  sampleCount: number;
  rootableDepth: { minCm: number; maxCm: number; meanCm: number } | null;
  stoniness: Record<string, unknown> | null;
  rockOutcrop: Record<string, unknown> | null;
  drainage: Record<string, unknown> | null;
  erosion: Record<string, unknown> | null;
  machineryAccess: Record<string, unknown> | null;
  notes: string[];
  isAuthoritativeFor: string[];
}

export interface LandUsabilityInfo {
  classification: string;
  score: number;
  limitingFactors: Array<{ factor: string; severity: string; description: string }>;
  positiveFactors: Array<{ factor: string; description: string }>;
  confidence: Record<string, unknown>;
  explanation: string;
}

export interface CropRecommendationItemDTO {
  cropId: string;
  cropName: string;
  rank: number;
  score: number;
  classification: string;
  isTopFive: boolean;
  positiveFactors: string[];
  limitingFactors: string[];
  criticalFailures: string[];
  missingValidations: string[];
  confidence: Record<string, unknown>;
  requirementsCompared: Array<{
    requirement: string;
    observedValue: number | string | null;
    observedUnit: string;
    requiredMinimum: number | null;
    preferredMinimum: number | null;
    source: string;
    result: string;
    explanation: string;
  }>;
  explanation: string;
}

export interface ConfidenceInfo {
  level: 'low' | 'medium' | 'high';
  availableSources: string[];
  missingSources: string[];
  approvedFieldSurveyAvailable: boolean;
  laboratoryAnalysisAvailable: boolean;
  irrigationWaterAnalysisAvailable: boolean;
  explanation: string;
}

export interface AnalysisResultResponse {
  analysisId: string;
  status: AnalysisStatus;
  parcel: ParcelInfo | null;
  dataSources: DataSourceInfo[];
  satellite: SatelliteInfo | null;
  terrain: TerrainInfo | null;
  climate: ClimateInfo | null;
  soil: SoilInfo | null;
  fieldSurvey: FieldSurveyInfo | null;
  landUsability: LandUsabilityInfo | null;
  cropRecommendations: CropRecommendationItemDTO[];
  confidence: ConfidenceInfo | null;
  limitations: string[];
  recommendedNextActions: string[];
  /** Echo of form choices so UI can show what the applicant entered. */
  applicantInputs?: ApplicantInputsSummary | null;
  recommendationsArePreliminary: true;
  generatedAt: string;
}

export const STEP_LABELS: Record<AnalysisStepKey, string> = {
  parcel: 'Parsel sınırı alınıyor',
  satellite_catalog: 'Uydu kataloğu taranıyor',
  satellite_imagery: 'Uydu görüntüleri alınıyor',
  satellite_statistics: 'Uydu istatistikleri hesaplanıyor',
  satellite_time_series: 'Uydu zaman serisi oluşturuluyor',
  terrain: 'Arazi yapısı hesaplanıyor',
  climate: 'İklim verileri alınıyor',
  soil: 'Toprak verileri alınıyor',
  field_survey: 'Saha ölçümleri kontrol ediliyor',
  land_usability: 'Arazi uygunluğu değerlendiriliyor',
  crop_compatibility: 'Ürün uyumluluğu hesaplanıyor',
  recommendations: 'Ürün tavsiyeleri oluşturuluyor',
  report_ready: 'Rapor hazırlanıyor',
};

export const ALL_STEP_KEYS: AnalysisStepKey[] = [
  'parcel',
  'satellite_catalog',
  'satellite_imagery',
  'satellite_statistics',
  'satellite_time_series',
  'terrain',
  'climate',
  'soil',
  'field_survey',
  'land_usability',
  'crop_compatibility',
  'recommendations',
  'report_ready',
];
