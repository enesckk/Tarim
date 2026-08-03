/**
 * Phase 2.2F — Soil Sampling Management.
 * Field sampling lifecycle; independent from laboratory analysis (2.2A).
 * No suitability scoring, AI, OCR, map/QR/barcode generation.
 */

export type SamplingCampaignStatus = 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export const SAMPLING_CAMPAIGN_STATUSES: readonly SamplingCampaignStatus[] = [
  'PLANNED',
  'ONGOING',
  'COMPLETED',
  'CANCELLED',
] as const;

export type SoilSampleType = 'COMPOSITE' | 'SINGLE_POINT' | 'DISTURBED' | 'UNDISTURBED';

export const SOIL_SAMPLE_TYPES: readonly SoilSampleType[] = [
  'COMPOSITE',
  'SINGLE_POINT',
  'DISTURBED',
  'UNDISTURBED',
] as const;

export type SamplingSampleStatus =
  | 'COLLECTED'
  | 'IN_TRANSPORT'
  | 'RECEIVED'
  | 'IN_ANALYSIS'
  | 'ANALYZED'
  | 'ARCHIVED'
  | 'DISCARDED';

export const SAMPLING_SAMPLE_STATUSES: readonly SamplingSampleStatus[] = [
  'COLLECTED',
  'IN_TRANSPORT',
  'RECEIVED',
  'IN_ANALYSIS',
  'ANALYZED',
  'ARCHIVED',
  'DISCARDED',
] as const;

export type SamplingObservationType =
  | 'STONE'
  | 'ROCK'
  | 'EROSION'
  | 'COMPACTION'
  | 'SURFACE_CRUST'
  | 'DRAINAGE'
  | 'ROOTING_DEPTH'
  | 'MOISTURE'
  | 'WATERLOGGING'
  | 'SALINITY';

export const SAMPLING_OBSERVATION_TYPES: readonly SamplingObservationType[] = [
  'STONE',
  'ROCK',
  'EROSION',
  'COMPACTION',
  'SURFACE_CRUST',
  'DRAINAGE',
  'ROOTING_DEPTH',
  'MOISTURE',
  'WATERLOGGING',
  'SALINITY',
] as const;

export type ChainOfCustodyAction =
  | 'COLLECTED'
  | 'PACKAGED'
  | 'TRANSPORTED'
  | 'RECEIVED'
  | 'OPENED'
  | 'ANALYZED'
  | 'ARCHIVED'
  | 'DESTROYED';

export const CHAIN_OF_CUSTODY_ACTIONS: readonly ChainOfCustodyAction[] = [
  'COLLECTED',
  'PACKAGED',
  'TRANSPORTED',
  'RECEIVED',
  'OPENED',
  'ANALYZED',
  'ARCHIVED',
  'DESTROYED',
] as const;

export type SamplingCampaign = {
  id: string;
  campaignCode: string;
  campaignName: string;
  purpose: string | null;
  description: string | null;
  organization: string | null;
  responsiblePerson: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SamplingCampaignStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SamplingPoint = {
  id: string;
  campaignId: string;
  parcelId: string | null;
  pointCode: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  /** GeoJSON / WKT text — stored only; no map rendering in 2.2F. */
  geometry: string | null;
  samplingDepthFrom: number | null;
  samplingDepthTo: number | null;
  samplingArea: number | null;
  samplingMethod: string | null;
  slope: number | null;
  aspect: number | null;
  landUse: string | null;
  cropAtSampling: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

/**
 * Field soil sample (sampling lifecycle).
 * Spec entity name: SoilSample — aliased below.
 * Distinct from laboratory SoilSample (Phase 2.2A under soil-laboratory/).
 */
export type SamplingSoilSample = {
  id: string;
  samplingPointId: string;
  sampleCode: string;
  sampleType: SoilSampleType;
  collectionDate: string | null;
  collectedBy: string | null;
  transportDate: string | null;
  receivedDate: string | null;
  storageCondition: string | null;
  containerType: string | null;
  currentStatus: SamplingSampleStatus;
  /** Stored if provided — generation deferred. */
  barcode: string | null;
  /** Stored if provided — generation deferred. */
  qrCode: string | null;
  sealNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

/** Spec entity name for Phase 2.2F SoilSample (field sampling). */
export type SoilSample = SamplingSoilSample;

export type SamplingObservation = {
  id: string;
  samplingPointId: string;
  observationType: SamplingObservationType;
  observationValue: string | null;
  photoPath: string | null;
  notes: string | null;
  createdAt: string;
};

export type ChainOfCustody = {
  id: string;
  sampleId: string;
  action: ChainOfCustodyAction;
  performedBy: string | null;
  performedDate: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

/** Aggregate root read model. */
export type SoilSampling = {
  campaignId: string;
  campaign: SamplingCampaign;
  points: SamplingPoint[];
  samples: SamplingSoilSample[];
  observations: SamplingObservation[];
  chainOfCustody: ChainOfCustody[];
};

export type SoilSamplingValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type SoilSamplingValidationResult = {
  valid: boolean;
  issues: SoilSamplingValidationIssue[];
};
