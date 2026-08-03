import type { ClimateProfile } from '../../environment/climate/types/climate.types.js';
import type { SoilProfile } from '../../environment/soil/types/soil.types.js';
import type { AnalysisSummaryResponse } from '../../../services/agricultural-analysis.service.js';
import type { TimeSeriesResponse } from '../../../services/time-series.service.js';
import type { ResolvedParcel } from '../../parcel/types/parcel.types.js';
import type { SuitabilityScoreResult, EvaluatedConstraint } from './suitability.types.js';
import type { RiskLevel } from '../../environment/shared/types/provider-metadata.types.js';
import type { PhenologyEvaluationResult, PlantingScenarioType } from '../phenology/phenology.types.js';
import type {
  IrrigationScenario,
  ManagementNeed,
  ScenarioBlock,
  SoilManagementOptions,
} from '../scenarios/scenario.types.js';
import type { RecommendationAudit } from '../validation/recommendation-audit.service.js';

export interface RecommendationOptions {
  timeSeriesMonths: number;
  topN: number;
  climateYears: number;
  analysisDays: number;
  maxCloudCoverage: number;
  plantingScenario?: PlantingScenarioType;
  customPlantingDate?: string;
  irrigationScenario?: IrrigationScenario;
  soilManagement?: SoilManagementOptions;
}

export interface RecommendationInputSnapshot {
  parcel: ResolvedParcel | null;
  geometryType: string;
  climate: ClimateProfile;
  soil: SoilProfile;
  analysis: AnalysisSummaryResponse;
  timeSeries: TimeSeriesResponse;
}

export interface RecommendationSignal {
  code: string;
  message: string;
  severity?: 'moderate' | 'major' | 'critical';
}

export interface CropRecommendationItem {
  crop: {
    id: string;
    name: string;
    category: string;
  };
  score: {
    gross: number;
    constraintPenalty: number;
    final: number;
    classification: string;
    label: string;
  };
  breakdown: SuitabilityScoreResult['breakdown'];
  constraints: EvaluatedConstraint[];
  strengths: RecommendationSignal[];
  risks: RecommendationSignal[];
  requiredVerifications: string[];
  explanation: {
    summary: string;
    whyRecommended: string[];
    whyNotHigher: string[];
  };
  scenarios?: ScenarioBlock;
  phenology?: PhenologyEvaluationResult;
  managementNeeds?: ManagementNeed[];
  audit?: RecommendationAudit;
  /** Additive physical compatibility summary; never changes score/rank. */
  physicalCompatibility?: {
    classification: string;
    confidence: string;
    recommendationImpactApplied: false;
    requirementProfileId?: string | null;
    requirementProfileVersion?: number | null;
    requirementValidationStatus?: string;
    requirementFallbackUsed?: boolean;
  };
}

export interface NotRecommendedItem {
  cropId: string;
  name: string;
  score: number;
  primaryConstraints: string[];
}

export interface EvaluationErrorItem {
  cropId: string;
  message: string;
}

export interface DataQualityBlock {
  recommendationConfidence: RiskLevel;
  sentinelConfidence: RiskLevel;
  climateConfidence: RiskLevel;
  soilConfidence: RiskLevel;
  usesMockClimate: boolean;
  usesMockSoil: boolean;
  climateProvider: string;
  soilProvider: string;
  climateIsEstimated: boolean;
  soilIsEstimated: boolean;
  successfulTimeSeriesAcquisitions: number;
  averageValidPixelRatio: number | null;
}

export interface CropRecommendationResponse {
  parcel: {
    title: string | null;
    areaSquareMeters: number | null;
    landType: string | null;
    geometryType: string;
  };
  dataQuality: DataQualityBlock;
  recommendations: CropRecommendationItem[];
  notRecommended: NotRecommendedItem[];
  evaluationErrors?: EvaluationErrorItem[];
  /** Optional additive land usability summary (does not affect scores). */
  landUsability?: {
    status: string;
    physicalSuitability?: string;
    recommendationsArePreliminary: true;
    confidence: string;
  };
  /** Report selection label: true Top-N by rank, or Selected Crops when filtered. */
  cropSelection?: {
    mode: 'top_n' | 'selected_crops';
    label: 'Top-5' | 'Selected Crops';
    cropIds: string[];
    ranks: number[];
  };
  limitations: string[];
  metadata: {
    knowledgeBaseVersion: string;
    scoringModelVersion: string;
    generatedAt: string;
  };
}
