/** Domain types for physical-suitability Phase 1 (decision matrix / knowledge base). */

export type VerificationStatus =
  | 'Draft'
  | 'SourceVerified'
  | 'ExpertReviewed'
  | 'Approved'
  | 'Deprecated';

export type CropGroup =
  | 'Cereal'
  | 'Legume'
  | 'IndustrialCrop'
  | 'Vegetable'
  | 'MelonCrop';

export type LifecycleType = 'Seasonal' | 'Perennial';

export type ProductionType = 'Rainfed' | 'Irrigated';

export type CultivationEnvironment = 'OpenField' | 'Greenhouse';

export type CriterionCategory =
  | 'climate'
  | 'soil'
  | 'water'
  | 'terrain'
  | 'season';

export type CriterionDataType =
  | 'Decimal'
  | 'Integer'
  | 'Boolean'
  | 'Enum'
  | 'Date'
  | 'Range'
  | 'Distribution';

export type RequirementLevel = 'Required' | 'Important' | 'Supporting';

export type DecisionRole =
  | 'CriticalBarrier'
  | 'Scoring'
  | 'Supporting'
  | 'Informational';

export type EvaluationType =
  | 'Range'
  | 'Boolean'
  | 'EnumMatch'
  | 'Threshold'
  | 'Distribution'
  | 'DateWindow'
  | 'Duration'
  | 'CustomRule';

export type MissingDataBehavior =
  | 'BlockEvaluation'
  | 'MarkInsufficientData'
  | 'ContinueWithReducedConfidence'
  | 'IgnoreForSuitability'
  | 'WarningOnly';

export type BarrierSeverity = 'Blocking' | 'Severe' | 'Conditional';

export type SourceType =
  | 'Laboratory'
  | 'FieldMeasurement'
  | 'OfficialLocal'
  | 'RemoteSensing'
  | 'GlobalModel'
  | 'UserDeclared';

export type NumericRange = {
  min: number | null;
  max: number | null;
  unit: string;
};

export type SourceReference = {
  id: string;
  title: string;
  organization: string | null;
  author: string | null;
  publicationYear: number | null;
  urlOrIdentifier: string | null;
  region: string | null;
  notes: string | null;
  retrievedAt: string;
  verificationStatus: VerificationStatus;
};

export type AgroClimaticRegion = {
  id: string;
  code: string;
  name: string;
  country: string;
  province: string | null;
  district: string | null;
  climateZone: string | null;
  defaultPlantingWindows: unknown[];
  defaultHarvestWindows: unknown[];
  notes: string | null;
  version: number;
  isActive: boolean;
};

export type CropProfile = {
  id: string;
  code: string;
  name: string;
  scientificName: string | null;
  cropGroup: CropGroup;
  lifecycleType: LifecycleType;
  defaultGrowingPeriodDays: number | null;
  isActive: boolean;
  version: number;
  sourceStatus: VerificationStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
};

export type ProductionScenario = {
  id: string;
  cropId: string;
  code: string;
  name: string;
  productionType: ProductionType;
  irrigationMode: ProductionType;
  cultivationEnvironment: CultivationEnvironment;
  regionCode: string;
  isActive: boolean;
  version: number;
  validFrom: string | null;
  validTo: string | null;
};

export type CriterionDefinition = {
  id: string;
  code: string;
  name: string;
  category: CriterionCategory;
  dataType: CriterionDataType;
  unit: string | null;
  description: string;
  allowedSourceTypes: SourceType[];
  isActive: boolean;
};

export type CropCriterionRule = {
  id: string;
  cropId: string;
  productionScenarioId: string;
  criterionDefinitionId: string;
  criterionCode: string;
  requirementLevel: RequirementLevel;
  decisionRole: DecisionRole;
  evaluationType: EvaluationType;
  /** Null until scientifically verified — do not invent values. */
  optimalRange: NumericRange | null;
  acceptableRange: NumericRange | null;
  criticalMinimum: number | null;
  criticalMaximum: number | null;
  allowedValues: string[] | null;
  disallowedValues: string[] | null;
  weightPlaceholder: number | null;
  missingDataBehavior: MissingDataBehavior;
  conditionExpression: string | null;
  explanationTemplate: string | null;
  version: number;
  sourceReferenceId: string | null;
  isActive: boolean;
  verificationStatus: VerificationStatus;
  notes: string | null;
};

export type CriticalBarrierRule = {
  id: string;
  code: string;
  cropId: string;
  productionScenarioId: string;
  criterionCode: string;
  cropCriterionRuleId: string | null;
  severity: BarrierSeverity;
  evaluationType: EvaluationType;
  criticalMinimum: number | null;
  criticalMaximum: number | null;
  booleanExpected: boolean | null;
  allowedValues: string[] | null;
  disallowedValues: string[] | null;
  explanationTemplate: string;
  sourceReferenceId: string | null;
  isActive: boolean;
  verificationStatus: VerificationStatus;
  version: number;
};

export type DataSourcePriority = {
  id: string;
  criterionCode: string;
  sourceType: SourceType;
  priorityRank: number;
  isActive: boolean;
};

export type DataSourceRecord = {
  sourceType: SourceType;
  provider: string;
  observationDate: string | null;
  retrievedAt: string;
  spatialResolution: string | null;
  temporalResolution: string | null;
  measurementMethod: string | null;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  confidence: 'low' | 'medium' | 'high' | 'unknown';
  originalValue: unknown;
  originalUnit: string | null;
  normalizedValue: unknown;
  unit: string | null;
  metadata: Record<string, unknown>;
};

export type ResolvedCriterionValue = {
  criterionCode: string;
  selected: DataSourceRecord;
  candidates: DataSourceRecord[];
  selectionReason: string;
};

export type MissingDataResult = {
  criterionCode: string;
  requirementLevel: RequirementLevel;
  missingDataBehavior: MissingDataBehavior;
  impact: string;
  message: string;
  requiredAction: string | null;
};

export type CriticalBarrierEvaluationResult = {
  isTriggered: boolean;
  ruleCode: string;
  criterionCode: string;
  observedValue: unknown;
  threshold: unknown;
  severity: BarrierSeverity;
  reason: string;
  source: string | null;
  dataQuality: string;
};

export type AuditEvent = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
  version: number | null;
  createdAt: string;
};

export type ProfileValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type ProfileValidationResult = {
  cropId: string;
  valid: boolean;
  issues: ProfileValidationIssue[];
};
