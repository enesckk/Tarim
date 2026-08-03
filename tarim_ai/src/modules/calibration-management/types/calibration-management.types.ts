export type ProfileStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'superseded'
  | 'archived'
  | 'rejected';

export type FieldValidationStatus =
  | 'unvalidated'
  | 'literature_supported'
  | 'expert_reviewed'
  | 'field_observed'
  | 'field_validated'
  | 'disputed'
  | 'rejected';

export type OverallProfileValidationStatus =
  | 'unvalidated'
  | 'partially_validated'
  | 'expert_reviewed'
  | 'field_supported'
  | 'field_validated'
  | 'disputed';

export type ExpertRole =
  | 'agricultural_engineer'
  | 'soil_scientist'
  | 'agronomist'
  | 'irrigation_specialist'
  | 'agricultural_mechanization_expert'
  | 'authorized_reviewer'
  | 'administrator';

export type SourceType =
  | 'expert_opinion'
  | 'academic_publication'
  | 'official_guideline'
  | 'extension_service'
  | 'field_trial'
  | 'field_observation'
  | 'laboratory_result'
  | 'internal_initial_assumption'
  | 'other';

export type SourceVerificationStatus =
  | 'unverified'
  | 'metadata_verified'
  | 'content_reviewed'
  | 'accepted'
  | 'rejected';

export type ReviewDecision =
  | 'approved'
  | 'approved_with_comments'
  | 'changes_requested'
  | 'rejected';

export type RequirementFieldKey =
  | 'rootableSoilDepth'
  | 'slope'
  | 'ruggedness'
  | 'surfaceStoniness'
  | 'bedrockOutcrop'
  | 'machineAccess'
  | 'drainage';

export const REQUIREMENT_FIELD_KEYS: RequirementFieldKey[] = [
  'rootableSoilDepth',
  'slope',
  'ruggedness',
  'surfaceStoniness',
  'bedrockOutcrop',
  'machineAccess',
  'drainage',
];

/** Maps requirement object keys to fieldValidationStatus keys. */
export const REQUIREMENT_TO_FIELD_STATUS: Record<string, RequirementFieldKey> = {
  rootableSoilDepth: 'rootableSoilDepth',
  slope: 'slope',
  ruggedness: 'ruggedness',
  surfaceStoninessTolerance: 'surfaceStoniness',
  bedrockOutcropTolerance: 'bedrockOutcrop',
  machineAccessRequirement: 'machineAccess',
  drainageRequirement: 'drainage',
};

export const PROFILE_TRANSITIONS: Record<ProfileStatus, ProfileStatus[]> = {
  draft: ['submitted'],
  submitted: ['under_review'],
  under_review: ['approved', 'changes_requested', 'rejected'],
  changes_requested: ['draft'],
  approved: ['published'],
  published: ['superseded', 'archived'],
  superseded: ['archived'],
  archived: [],
  rejected: [],
};

export const FIELD_ROLE_AUTHORIZATION: Record<RequirementFieldKey, ExpertRole[]> = {
  rootableSoilDepth: ['agricultural_engineer', 'soil_scientist', 'agronomist'],
  slope: ['agricultural_engineer', 'agronomist', 'authorized_reviewer'],
  ruggedness: ['agricultural_engineer', 'agronomist', 'authorized_reviewer'],
  surfaceStoniness: ['agricultural_engineer', 'soil_scientist', 'agronomist'],
  bedrockOutcrop: ['soil_scientist', 'agricultural_engineer', 'agronomist'],
  machineAccess: [
    'agricultural_mechanization_expert',
    'agricultural_engineer',
  ],
  drainage: ['soil_scientist', 'irrigation_specialist', 'agronomist'],
};

export const PUBLICATION_ROLES: ExpertRole[] = [
  'authorized_reviewer',
  'administrator',
];

export interface ExpertActor {
  id: string;
  name: string;
  role: ExpertRole;
  organization?: string;
  licenseOrRegistration?: string | null;
}

export interface RequirementSource {
  id: string;
  type: SourceType;
  title: string;
  organization?: string;
  authors?: string[];
  publicationYear?: number | null;
  reference?: string;
  url?: string | null;
  notes?: string;
  supports: string[];
  verificationStatus: SourceVerificationStatus;
}

export interface RequirementChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  sourceIds: string[];
  changedBy: ExpertActor;
  changedAt: string;
}

export interface ProfileReview {
  id: string;
  profileId: string;
  reviewer: ExpertActor;
  decision: ReviewDecision;
  reviewedFields: RequirementFieldKey[];
  comments: string;
  suggestedChanges: Array<{ path: string; suggestion: string }>;
  qualityChecks: string[];
  createdAt: string;
}

export interface ImpactAnalysisSummary {
  totalComparisons: number;
  classificationChangedCount: number;
  confidenceChangedCount: number;
  scoreChangedCount: number;
  rankChangedCount: number;
  completedAt: string;
  fixtureCount: number;
}

export interface CropRequirementProfile {
  id: string;
  cropId: string;
  version: number;
  status: ProfileStatus;
  baseProfileId: string | null;
  requirements: unknown;
  fieldValidationStatus: Record<RequirementFieldKey, FieldValidationStatus>;
  overallValidationStatus: OverallProfileValidationStatus;
  sources: RequirementSource[];
  notes: string[];
  changes: RequirementChange[];
  reviews: ProfileReview[];
  createdBy: ExpertActor;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  impactAnalysis?: ImpactAnalysisSummary | null;
  bootstrapKey?: string | null;
  /** Optimistic concurrency token (persistence layer). */
  rowVersion?: number;
}

export type AuditEventType =
  | 'PROFILE_CREATED'
  | 'PROFILE_UPDATED'
  | 'SOURCE_ADDED'
  | 'PROFILE_SUBMITTED'
  | 'REVIEW_STARTED'
  | 'REVIEW_ADDED'
  | 'CHANGES_REQUESTED'
  | 'PROFILE_APPROVED'
  | 'IMPACT_ANALYSIS_STARTED'
  | 'IMPACT_ANALYSIS_COMPLETED'
  | 'PROFILE_PUBLISHED'
  | 'PREVIOUS_PROFILE_SUPERSEDED'
  | 'REVISION_CREATED'
  | 'ROLLBACK_REQUESTED'
  | 'PROFILE_ARCHIVED'
  | 'PROFILE_REJECTED';

export interface CalibrationAuditEvent {
  id: string;
  type: AuditEventType;
  timestamp: string;
  actor: ExpertActor;
  profileId: string;
  cropId: string;
  previousStatus?: ProfileStatus | null;
  newStatus?: ProfileStatus | null;
  changedPaths?: string[];
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface CalibrationManagementCalibration {
  publication: {
    minimumReviewCount: number;
    requireAuthorizedReviewer: boolean;
    requireImpactAnalysis: boolean;
    requireValidSchema: boolean;
    allowDisputedCriticalFields: boolean;
  };
  impactAnalysis: {
    requireScoreInvariant: boolean;
    requireRankInvariant: boolean;
    maximumFixtureCount: number;
  };
  validationResolution: {
    fieldValidatedMinimumFieldCount: number;
    expertReviewedMinimumFieldCount: number;
    partiallyValidatedMinimumFieldCount: number;
  };
  cache: {
    activeProfileTtlSeconds: number;
  };
  validationStatus: string;
  source: string;
}

export const DEFAULT_CALIBRATION_MANAGEMENT: CalibrationManagementCalibration = {
  publication: {
    minimumReviewCount: 1,
    requireAuthorizedReviewer: true,
    requireImpactAnalysis: true,
    requireValidSchema: true,
    allowDisputedCriticalFields: false,
  },
  impactAnalysis: {
    requireScoreInvariant: true,
    requireRankInvariant: true,
    maximumFixtureCount: 100,
  },
  validationResolution: {
    fieldValidatedMinimumFieldCount: 5,
    expertReviewedMinimumFieldCount: 5,
    partiallyValidatedMinimumFieldCount: 1,
  },
  cache: {
    activeProfileTtlSeconds: 3600,
  },
  validationStatus: 'unvalidated',
  source: 'initial-system-calibration',
};

export function resolveCalibrationManagementCalibration(
  block?: Partial<CalibrationManagementCalibration> | null,
): CalibrationManagementCalibration {
  if (!block) return structuredClone(DEFAULT_CALIBRATION_MANAGEMENT);
  return {
    publication: {
      ...DEFAULT_CALIBRATION_MANAGEMENT.publication,
      ...block.publication,
    },
    impactAnalysis: {
      ...DEFAULT_CALIBRATION_MANAGEMENT.impactAnalysis,
      ...block.impactAnalysis,
    },
    validationResolution: {
      ...DEFAULT_CALIBRATION_MANAGEMENT.validationResolution,
      ...block.validationResolution,
    },
    cache: {
      ...DEFAULT_CALIBRATION_MANAGEMENT.cache,
      ...block.cache,
    },
    validationStatus:
      block.validationStatus ?? DEFAULT_CALIBRATION_MANAGEMENT.validationStatus,
    source: block.source ?? DEFAULT_CALIBRATION_MANAGEMENT.source,
  };
}
