export type SurveyStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'archived';

export type SurfaceStoninessClass =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high'
  | 'unknown';

export type BedrockOutcropClass =
  | 'not_observed'
  | 'isolated'
  | 'scattered'
  | 'frequent'
  | 'extensive'
  | 'unknown';

export type MachineAccessClass =
  | 'verified_accessible'
  | 'accessible_with_limitations'
  | 'seasonally_accessible'
  | 'difficult'
  | 'impossible'
  | 'unknown';

export type DrainageObservationClass =
  | 'adequate'
  | 'moderately_limited'
  | 'poor'
  | 'waterlogging_observed'
  | 'unknown';

export type SamplingMethod =
  | 'soil_auger'
  | 'profile_pit'
  | 'manual_probe'
  | 'existing_excavation'
  | 'other';

export type PhotoCategory =
  | 'parcel_overview'
  | 'soil_profile'
  | 'surface_stoniness'
  | 'bedrock_outcrop'
  | 'access_route'
  | 'drainage'
  | 'other';

export type ReviewerRole =
  | 'agricultural_engineer'
  | 'soil_scientist'
  | 'authorized_expert'
  | 'administrator';

export type SampleAcceptance =
  | 'accepted'
  | 'accepted_with_warning'
  | 'invalid';

export type LocationConfidence = 'high' | 'medium' | 'low' | 'insufficient';

export interface ParcelReference {
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
}

export interface SurveyorInfo {
  id: string;
  name: string;
  organization?: string;
}

export interface SampleLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
}

export interface SurveySample {
  id: string;
  sequence: number;
  location: SampleLocation;
  insideParcel: boolean;
  distanceToParcelMeters: number;
  locationConfidence: LocationConfidence;
  acceptance: SampleAcceptance;
  acceptanceWarnings: string[];
  rootableSoilDepthCm?: number | null;
  surfaceStoniness?: SurfaceStoninessClass;
  estimatedSurfaceStonePercent?: number | null;
  bedrockObserved?: boolean;
  bedrockOutcrop?: BedrockOutcropClass;
  estimatedOutcropPercent?: number | null;
  drainageObservation?: DrainageObservationClass;
  soilMoistureCondition?: 'dry' | 'moist' | 'wet' | 'unknown';
  samplingMethod?: SamplingMethod;
  depthMeasurementMethod?: SamplingMethod;
  notes?: string;
}

export interface ParcelObservations {
  machineAccess?: MachineAccessClass;
  vehicleType?: string;
  accessRoadType?: string;
  turningAreaAvailable?: boolean;
  drainageObservation?: DrainageObservationClass;
  bedrockOutcrop?: BedrockOutcropClass;
  surfaceStoniness?: SurfaceStoninessClass;
  notes?: string;
}

export interface SurveyPhotoMeta {
  id: string;
  sampleId?: string | null;
  fileReference: string;
  caption?: string;
  takenAt?: string;
  location?: SampleLocation;
  category: PhotoCategory;
}

export interface SurveyReview {
  reviewer: {
    id: string;
    name: string;
    role: ReviewerRole;
  };
  decision: 'approved' | 'rejected';
  reviewedAt: string;
  comments?: string;
  qualityChecks: Array<{ code: string; status: string; message: string }>;
}

export interface AuditEvent {
  type: string;
  timestamp: string;
  actorId?: string;
  sampleId?: string;
  reviewerId?: string;
  details?: Record<string, unknown>;
}

export interface FieldSurvey {
  id: string;
  parcelId: string;
  parcelReference: ParcelReference;
  status: SurveyStatus;
  surveyDate: string;
  surveyor: SurveyorInfo;
  weatherConditions?: {
    recentRainfall?: 'none' | 'light' | 'moderate' | 'heavy' | 'unknown';
    soilSurfaceCondition?: 'dry' | 'moist' | 'wet' | 'unknown';
  };
  samples: SurveySample[];
  parcelObservations: ParcelObservations;
  photos: SurveyPhotoMeta[];
  notes: string[];
  review: SurveyReview | null;
  revisionNumber: number;
  previousSurveyId?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  audit: { events: AuditEvent[] };
  /** Optimistic concurrency token (persistence layer). */
  rowVersion?: number;
}

export interface AggregatedRootableDepth {
  status: 'unknown' | 'verified';
  minimumCm: number | null;
  maximumCm: number | null;
  meanCm: number | null;
  medianCm: number | null;
  standardDeviationCm: number | null;
  measurementCount: number;
  invalidMeasurementCount: number;
  confidence: string;
  source: string;
}

export interface SurveyAggregation {
  rootableSoilDepth: AggregatedRootableDepth;
  surfaceStoniness: {
    dominant: SurfaceStoninessClass | 'unknown';
    worst: SurfaceStoninessClass | 'unknown';
    distribution: Record<string, number>;
    confidence: string;
  };
  bedrockOutcrop: {
    worst: BedrockOutcropClass | 'unknown';
    distribution: Record<string, number>;
    confidence: string;
  };
  drainage: {
    dominant: DrainageObservationClass | 'unknown';
    worst: DrainageObservationClass | 'unknown';
  };
  machineAccess: {
    classification: MachineAccessClass | 'unknown';
    confidence: string;
  };
  spatialCoverage: {
    recommendedSampleCount: number;
    validSampleCount: number;
    insideParcelCount: number;
    separationWarnings: number;
    adequate: boolean;
    confidence: string;
  };
}

export interface SurveyCheckResult {
  code: string;
  status: 'passed' | 'warning' | 'failed' | 'informational';
  observedValue?: string | number | boolean | null;
  threshold?: string | number | null;
  source?: string;
  message: string;
}

export interface NormalizedFieldEvidence {
  surveyId: string;
  approved: true;
  surveyDate: string;
  approvedAt: string;
  rootableSoilDepth: {
    verified: boolean;
    minimumCm: number | null;
    maximumCm: number | null;
    meanCm: number | null;
    medianCm: number | null;
    measurementCount: number;
    confidence: string;
    measurementsCm: number[];
  };
  surfaceStoniness: {
    classification: SurfaceStoninessClass;
    confidence: string;
  };
  bedrockOutcrop: {
    classification: BedrockOutcropClass;
    confidence: string;
  };
  machineAccess: {
    classification: MachineAccessClass;
    confidence: string;
  };
  drainage: {
    classification: DrainageObservationClass;
    confidence: string;
  };
}

export const SURVEY_TRANSITIONS: Record<SurveyStatus, SurveyStatus[]> = {
  draft: ['submitted'],
  submitted: ['under_review'],
  under_review: ['approved', 'rejected'],
  rejected: ['draft'],
  approved: ['archived'],
  archived: [],
};
