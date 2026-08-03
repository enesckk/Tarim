export type ComponentClassification =
  | 'preferred'
  | 'acceptable'
  | 'caution'
  | 'limited'
  | 'strongly_limited'
  | 'unknown';

export type OverallCompatibilityClassification =
  | 'highly_compatible'
  | 'compatible'
  | 'compatible_with_caution'
  | 'physically_limited'
  | 'strongly_limited'
  | 'insufficient_data';

export type CompatibilityConfidence = 'high' | 'medium' | 'low' | 'insufficient';

export type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical';

export interface CompatibilityFactor {
  code: string;
  severity?: 'supporting' | 'important' | 'high' | 'critical';
  component?: string;
  message?: string;
  observedValue?: string | number | boolean | null;
  source?: string;
  reason?: string;
  requiresFieldVerification?: boolean;
}

export interface CompatibilityComponentResult {
  classification: ComponentClassification;
  importance: ImportanceLevel;
  observedValue: Record<string, unknown> | string | number | null;
  requirement: Record<string, unknown> | null;
  source: string;
  sourceType: string;
  confidence: CompatibilityConfidence | 'unusable_for_real_decision' | 'unknown';
  matchedRule: string;
  message: string;
}

export interface MechanizationCompatibilityResult {
  terrain: {
    classification: string | null;
    source: string;
  };
  fieldAccess: {
    classification: string | null;
    source: string;
  };
  combined: ComponentClassification;
  conflict: boolean;
  component: CompatibilityComponentResult;
}

export interface CropPhysicalCompatibilityResult {
  classification: OverallCompatibilityClassification;
  confidence: CompatibilityConfidence;
  recommendationImpactApplied: false;
  components: {
    rootableSoilDepth: CompatibilityComponentResult;
    slope: CompatibilityComponentResult;
    ruggedness: CompatibilityComponentResult;
    mechanization: MechanizationCompatibilityResult;
    surfaceStoniness: CompatibilityComponentResult;
    bedrockOutcrop: CompatibilityComponentResult;
    drainage: CompatibilityComponentResult;
  };
  supportingFactors: CompatibilityFactor[];
  limitingFactors: CompatibilityFactor[];
  unknownFactors: CompatibilityFactor[];
  ignoredEvidence: CompatibilityFactor[];
  requiredFieldChecks: Array<{
    code: string;
    priority: string;
    required: boolean;
    reason: string;
  }>;
  conflicts: CompatibilityFactor[];
  audit: CropPhysicalCompatibilityAudit;
}

export interface CropPhysicalCompatibilityAudit {
  cropId: string;
  requirementsUsed: string[];
  evidenceUsed: string[];
  evidenceIgnored: string[];
  componentRulesEvaluated: string[];
  matchedComponentRules: string[];
  overallRulesEvaluated: string[];
  matchedOverallRule: {
    code: string;
    inputs: Record<string, unknown>;
    result: string;
  };
  existingScore: number | null;
  scoreBefore: number | null;
  scoreAfter: number | null;
  recommendationImpactApplied: false;
  calibrationVersion: string;
}

export interface CropPhysicalCompatibilitySummary {
  classification: OverallCompatibilityClassification;
  confidence: CompatibilityConfidence;
  recommendationImpactApplied: false;
  requirementProfileId?: string | null;
  requirementProfileVersion?: number | null;
  requirementValidationStatus?: string;
  requirementFallbackUsed?: boolean;
}

export interface RequirementResolutionMeta {
  mode: string;
  profileId: string | null;
  profileVersion: number | null;
  profileStatus: string | null;
  validationStatus: string;
  fallbackUsed: boolean;
  source: string;
}

export interface CropPhysicalCompatibilityCheck {
  code: string;
  cropId?: string;
  status: 'passed' | 'warning' | 'failed' | 'informational';
  observedValue?: string | number | boolean | null;
  requirement?: string | number | boolean | null;
  source?: string;
  message: string;
}

export interface ParcelPhysicalEvidence {
  terrainReal: boolean;
  terrainMock: boolean;
  terrain: {
    provider: string;
    dataset?: string | null;
    meanSlopePercent: number | null;
    p90SlopePercent: number | null;
    maximumSlopePercent: number | null;
    ruggednessClass: string | null;
    mechanization: string | null;
    coverageStatus: string | null;
    spatialConfidence: string | null;
  } | null;
  field: {
    surveyId?: string;
    rootableSoilDepth: {
      verified: boolean;
      minimumCm: number | null;
      meanCm: number | null;
      medianCm: number | null;
      maximumCm: number | null;
      measurementCount: number;
      confidence: string;
    } | null;
    surfaceStoniness: string | null;
    bedrockOutcrop: string | null;
    machineAccess: string | null;
    drainage: string | null;
  } | null;
  surface: {
    probableRockClassification: string | null;
    probableRockScore: number | null;
    providerReal: boolean;
  } | null;
  soilMock: boolean;
  soilProvider: string | null;
}
