/**
 * Shared provenance fields required on every ECOCROP / GAEZ result artifact.
 */
export type FaoProvider = 'ecocrop' | 'gaez';
export type GaezVersion = 'v4' | 'v5';

export type ReviewStatus = 'draft' | 'reviewed' | 'approved' | 'rejected';

export type FaoProvenance = {
  provider: FaoProvider;
  version: string;
  datasetId: string | null;
  cropCode: string | null;
  scientificName: string | null;
  waterSupply: string | null;
  inputLevel: string | null;
  climateScenario: string | null;
  resolution: string | null;
  unit: string | null;
  retrievedAt: string;
  sourceUrlOrId: string | null;
  limitations: string[];
};

export type EcocropNumericThreshold = {
  field: string;
  value: number;
  unit: string | null;
  /** ECOCROP source field name — required; no source → value must not be stored */
  sourceField: string;
};

export type EcocropProfileSource = FaoProvenance & {
  provider: 'ecocrop';
  ecocropId: string;
  commonName: string | null;
  scientificName: string;
  snapshotVersion: string;
  status: ReviewStatus;
  thresholds: EcocropNumericThreshold[];
  rawFields: Record<string, unknown>;
  unknownFields: string[];
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type GaezDataset = FaoProvenance & {
  provider: 'gaez';
  version: GaezVersion;
  datasetId: string;
  name: string;
  variable: string | null;
  serviceUrl: string;
  filepath: string | null;
  downloadUrl: string | null;
  active: boolean;
  syncedAt: string;
};

export type GaezLayerDefinition = {
  id: string;
  gaezVersion: GaezVersion;
  datasetId: string;
  layerName: string;
  variable: string | null;
  cropCode: string | null;
  waterSupply: string | null;
  inputLevel: string | null;
  climateScenario: string | null;
  unit: string | null;
  resolution: string;
  serviceUrl: string;
  active: boolean;
  syncedAt: string;
};

export type GaezCropMapping = {
  id: string;
  internalCropCode: string;
  scientificName: string;
  ecocropId: string | null;
  gaezCropCode: string | null;
  gaezVersion: GaezVersion | null;
  productionSystem: string | null;
  confidence: 'low' | 'medium' | 'high' | null;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string[];
};

export type GaezSampleMethod = 'centroid' | 'polygon';

export type GaezRegionalSample = FaoProvenance & {
  provider: 'gaez';
  version: GaezVersion;
  geometryHash: string;
  sampleMethod: GaezSampleMethod;
  suitabilityIndex: number | null;
  suitabilityClass: string | null;
  attainableYield: number | null;
  potentialYield: number | null;
  dominantClass: string | null;
  min: number | null;
  max: number | null;
  mean: number | null;
  rasterResolution: string;
  cacheHit: boolean;
  status: 'ok' | 'unavailable' | 'cached_stale';
};

export type GaezAgreement =
  | 'consistent'
  | 'partially_consistent'
  | 'conflicting'
  | 'unavailable';

export type GaezComparisonResult = FaoProvenance & {
  provider: 'gaez';
  localScore: number | null;
  localClass: string | null;
  gaezSuitability: number | null;
  agreement: GaezAgreement;
  interpretation: string;
  resolutionWarning: boolean;
  sourceVersion: GaezVersion | null;
};

export type GaezCacheKeyParts = {
  gaezVersion: GaezVersion;
  datasetId: string;
  cropCode: string;
  geometryHash: string;
  waterSupply: string;
  inputLevel: string;
  climateScenario: string;
};

export const REGIONAL_RESOLUTION_LIMITATION = 'regional_resolution_not_parcel_scale';

export const PILOT_INTERNAL_CROPS = [
  'wheat',
  'barley',
  'chickpea',
  'red_lentil',
  'maize',
  'cotton',
  'tomato',
  'grape',
  'olive',
  'pistachio',
] as const;

export type PilotInternalCrop = (typeof PILOT_INTERNAL_CROPS)[number];
