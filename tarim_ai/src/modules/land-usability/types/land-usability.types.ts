import type { ConfidenceLevel } from '../../../utils/trend.utils.js';

export type LandUsabilityStatus =
  | 'suitable_for_preliminary_recommendation'
  | 'recommendation_with_caution'
  | 'field_verification_required'
  | 'strong_physical_constraints'
  | 'insufficient_data';

export type PhysicalSuitabilityClassification =
  | 'favorable'
  | 'generally_favorable'
  | 'uncertain'
  | 'limited'
  | 'strongly_limited'
  | 'insufficient_data';

export type LandUsabilityConfidence =
  | 'high'
  | 'medium'
  | 'low'
  | 'insufficient';

export type SourceType =
  | 'field_measurement'
  | 'laboratory_analysis'
  | 'official_local_dataset'
  | 'real_satellite'
  | 'real_dem'
  | 'real_satellite_or_dem'
  | 'global_modeled'
  | 'global_modeled_provider'
  | 'mock'
  | 'unknown';

export type EvidenceSeverity = 'supporting' | 'important' | 'high' | 'critical';

export interface FieldEvidenceInput {
  rootableSoilDepthMeasurementsCm?: number[];
  surfaceStoniness?: 'none' | 'low' | 'medium' | 'high' | 'unknown';
  bedrockOutcrop?: 'not_observed' | 'sparse' | 'extensive' | 'unknown';
  machineAccess?: 'verified' | 'limited' | 'impossible' | 'unknown';
  drainageObservation?:
    | 'adequate'
    | 'moderately_limited'
    | 'poor'
    | 'waterlogging_observed'
    | 'unknown';
  sourceDate?: string;
  surveyId?: string;
}

export interface EvidenceItem {
  code: string;
  severity?: EvidenceSeverity;
  source?: string;
  confidence?: string;
  observedValue?: string | number | boolean | null;
  reason?: string;
  requiresFieldVerification?: boolean;
  message?: string;
}

export interface SourceComponentResolution {
  source: string;
  sourceType: SourceType;
  confidence: string;
}

export interface NormalizedSurfaceEvidence {
  providerReal: boolean;
  usableObservationCount: number;
  seasonsRepresented: number;
  dataConfidence: ConfidenceLevel | 'insufficient' | 'unknown';
  /** Canonical field; null when surface-analysis response does not provide it. */
  persistentOpenSurfaceRatio: number | null;
  lowNdviShare: number | null;
  highBsiShare: number | null;
  vegetatedShare: number | null;
  seasonalAmplitude: number | null;
  agriculturalCycleClassification: string | null;
  agriculturalCycleDetected: boolean;
  probableRockScore: number | null;
  probableRockClassification: string | null;
  availableSignals: string[];
  missingCanonicalFields: string[];
}

export interface RootableSoilDepthResult {
  status: 'unknown' | 'field_measured';
  minimumCm: number | null;
  maximumCm: number | null;
  meanCm: number | null;
  medianCm: number | null;
  standardDeviationCm?: number | null;
  measurementCount: number;
  source: string;
  confidence: string;
  requiresFieldVerification: boolean;
}

export interface ModeledSoilDepthResult {
  valueCm: number | null;
  source: string;
  confidence: string;
  usableAsVerifiedRootableDepth: false;
}

export interface FieldCheckRequirement {
  code: string;
  priority: 'high' | 'medium' | 'routine';
  required: boolean;
  suggestedSampleCount?: number;
  reason: string;
  relatedEvidenceCodes: string[];
}

export interface PhysicalSuitabilityResult {
  classification: PhysicalSuitabilityClassification;
  confidence: LandUsabilityConfidence;
  basis: string[];
  unknowns: string[];
}

export interface LandUsabilityDecision {
  status: LandUsabilityStatus;
  physicalSuitability: PhysicalSuitabilityResult;
  confidence: LandUsabilityConfidence;
  recommendationsArePreliminary: true;
}

export interface LandUsabilityAudit {
  decisionRulesEvaluated: string[];
  matchedRules: Array<{
    code: string;
    inputs: Record<string, unknown>;
    result: string;
  }>;
  rejectedRules: string[];
  evidenceUsed: string[];
  evidenceIgnored: string[];
  unknowns: string[];
  calibrationVersion: string;
  fieldSurvey?: {
    used: boolean;
    surveyId?: string | null;
    status?: string | null;
    evidenceUsed?: boolean;
    evidenceIgnored?: boolean;
    approvalDate?: string | null;
    measurementCount?: number | null;
    disposition?: string;
  };
}

export interface LandUsabilityCheckResult {
  code: string;
  status: 'passed' | 'warning' | 'failed' | 'informational';
  observedValue?: string | number | boolean | null;
  threshold?: string | number | null;
  expectedValue?: string | number | null;
  source?: string;
  message: string;
}

export interface LandUsabilityAnalyzeResponse {
  parcel: {
    title: string | null;
    areaSquareMeters: number | null;
    landType: string | null;
    geometryType: string;
  };
  landUsability: {
    status: LandUsabilityStatus;
    physicalSuitability: PhysicalSuitabilityClassification;
    confidence: LandUsabilityConfidence;
    recommendationsArePreliminary: true;
  };
  components: {
    surfaceActivity: Record<string, unknown>;
    probableRockSignal: Record<string, unknown>;
    terrain: Record<string, unknown>;
    soil: Record<string, unknown>;
    rootableSoilDepth: RootableSoilDepthResult;
    modeledSoilDepth?: ModeledSoilDepthResult | null;
  };
  supportingEvidence: EvidenceItem[];
  limitingFactors: EvidenceItem[];
  unknownFactors: EvidenceItem[];
  ignoredEvidence: EvidenceItem[];
  requiredFieldChecks: FieldCheckRequirement[];
  sourceResolution: Record<string, SourceComponentResolution>;
  audit: LandUsabilityAudit;
  validation: { checks: LandUsabilityCheckResult[] };
  limitations: string[];
}

/** Compact additive block for crop evaluate / compare-scenarios. */
export interface LandUsabilityAdditiveSummary {
  status: LandUsabilityStatus;
  physicalSuitability: PhysicalSuitabilityClassification;
  confidence: LandUsabilityConfidence;
  recommendationsArePreliminary: true;
}
