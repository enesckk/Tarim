import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.1B — Crop Phenology Engine stage codes.
 * No climate / water / GDD / fertilizer thresholds in this phase.
 */
export type GrowthStageCode =
  | 'SEED'
  | 'GERMINATION'
  | 'EMERGENCE'
  | 'VEGETATIVE'
  | 'BRANCHING'
  | 'FLOWERING'
  | 'POLLINATION'
  | 'FRUIT_SET'
  | 'FRUIT_DEVELOPMENT'
  | 'MATURITY'
  | 'HARVEST'
  | 'POST_HARVEST'
  | 'RESIDUE';

export const GROWTH_STAGE_CODES: readonly GrowthStageCode[] = [
  'SEED',
  'GERMINATION',
  'EMERGENCE',
  'VEGETATIVE',
  'BRANCHING',
  'FLOWERING',
  'POLLINATION',
  'FRUIT_SET',
  'FRUIT_DEVELOPMENT',
  'MATURITY',
  'HARVEST',
  'POST_HARVEST',
  'RESIDUE',
] as const;

export const POST_HARVEST_STAGE_CODES: ReadonlySet<GrowthStageCode> = new Set([
  'POST_HARVEST',
  'RESIDUE',
]);

export type GrowthStageCatalogEntry = {
  stageCode: GrowthStageCode;
  stageName: string;
  stageOrder: number;
  description: string;
  scientificDescription: string;
  isCriticalStage: boolean;
  canOverlapPreviousStage: boolean;
  requiresValidation: boolean;
};

/** Canonical ordered catalog used for pilot seed + transition defaults. */
export const GROWTH_STAGE_CATALOG: readonly GrowthStageCatalogEntry[] = [
  {
    stageCode: 'SEED',
    stageName: 'Seed',
    stageOrder: 1,
    description: 'Seed or planting-material stage.',
    scientificDescription: 'Initial propagule / seed stage prior to germination.',
    isCriticalStage: false,
    canOverlapPreviousStage: false,
    requiresValidation: true,
  },
  {
    stageCode: 'GERMINATION',
    stageName: 'Germination',
    stageOrder: 2,
    description: 'Germination stage.',
    scientificDescription: 'Imbibition and radicle emergence.',
    isCriticalStage: true,
    canOverlapPreviousStage: false,
    requiresValidation: true,
  },
  {
    stageCode: 'EMERGENCE',
    stageName: 'Emergence',
    stageOrder: 3,
    description: 'Seedling emergence stage.',
    scientificDescription: 'Shoot emergence above soil surface.',
    isCriticalStage: true,
    canOverlapPreviousStage: false,
    requiresValidation: true,
  },
  {
    stageCode: 'VEGETATIVE',
    stageName: 'Vegetative',
    stageOrder: 4,
    description: 'Vegetative growth stage.',
    scientificDescription: 'Leaf and canopy expansion prior to reproductive transition.',
    isCriticalStage: false,
    canOverlapPreviousStage: false,
    requiresValidation: false,
  },
  {
    stageCode: 'BRANCHING',
    stageName: 'Branching',
    stageOrder: 5,
    description: 'Branching / tillering stage.',
    scientificDescription: 'Lateral branch or tiller formation where applicable.',
    isCriticalStage: false,
    canOverlapPreviousStage: true,
    requiresValidation: false,
  },
  {
    stageCode: 'FLOWERING',
    stageName: 'Flowering',
    stageOrder: 6,
    description: 'Flowering stage.',
    scientificDescription: 'Anthesis / floral opening.',
    isCriticalStage: true,
    canOverlapPreviousStage: false,
    requiresValidation: true,
  },
  {
    stageCode: 'POLLINATION',
    stageName: 'Pollination',
    stageOrder: 7,
    description: 'Pollination stage.',
    scientificDescription: 'Pollen transfer and fertilization window.',
    isCriticalStage: true,
    canOverlapPreviousStage: true,
    requiresValidation: true,
  },
  {
    stageCode: 'FRUIT_SET',
    stageName: 'Fruit Set',
    stageOrder: 8,
    description: 'Fruit / grain set stage.',
    scientificDescription: 'Initial fruit or grain set after fertilization.',
    isCriticalStage: true,
    canOverlapPreviousStage: false,
    requiresValidation: true,
  },
  {
    stageCode: 'FRUIT_DEVELOPMENT',
    stageName: 'Fruit Development',
    stageOrder: 9,
    description: 'Fruit / grain development stage.',
    scientificDescription: 'Fruit enlargement or grain filling.',
    isCriticalStage: false,
    canOverlapPreviousStage: false,
    requiresValidation: false,
  },
  {
    stageCode: 'MATURITY',
    stageName: 'Maturity',
    stageOrder: 10,
    description: 'Maturity / ripening stage.',
    scientificDescription: 'Physiological maturity prior to harvest.',
    isCriticalStage: true,
    canOverlapPreviousStage: false,
    requiresValidation: true,
  },
  {
    stageCode: 'HARVEST',
    stageName: 'Harvest',
    stageOrder: 11,
    description: 'Harvest stage.',
    scientificDescription: 'Harvest readiness and harvest operation window.',
    isCriticalStage: true,
    canOverlapPreviousStage: false,
    requiresValidation: true,
  },
  {
    stageCode: 'POST_HARVEST',
    stageName: 'Post Harvest',
    stageOrder: 12,
    description: 'Post-harvest handling stage.',
    scientificDescription: 'Immediate post-harvest handling and field exit.',
    isCriticalStage: false,
    canOverlapPreviousStage: false,
    requiresValidation: false,
  },
  {
    stageCode: 'RESIDUE',
    stageName: 'Residue',
    stageOrder: 13,
    description: 'Residue / stubble stage.',
    scientificDescription: 'Crop residue remaining in field after harvest.',
    isCriticalStage: false,
    canOverlapPreviousStage: false,
    requiresValidation: false,
  },
];

/**
 * CropGrowthStage — independent phenology stage entity.
 * Duration fields are structural only; null until source-verified.
 * No temperature / rainfall / GDD / fertilizer fields in Phase 2.1B.
 */
export type CropGrowthStage = {
  id: string;
  /** Crop Knowledge root id (aggregate crop identity for CK). */
  cropId: string;
  cropKnowledgeId: string;
  phenologyId: string;
  stageCode: GrowthStageCode;
  stageName: string;
  stageOrder: number;
  description: string | null;
  scientificDescription: string | null;
  typicalDurationDays: number | null;
  minimumDurationDays: number | null;
  maximumDurationDays: number | null;
  canOverlapPreviousStage: boolean;
  isCriticalStage: boolean;
  requiresValidation: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  /** Source (scientific / institutional reference id). */
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  isActive: boolean;
};

export type StageTransition = {
  id: string;
  cropKnowledgeId: string;
  fromStageCode: GrowthStageCode;
  toStageCode: GrowthStageCode;
  order: number;
  canSkip: boolean;
  requiresPreviousCompletion: boolean;
  notes: string | null;
  version: number;
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

export type StageReference = {
  id: string;
  stageId: string;
  scientificSource: string;
  organization: string | null;
  publication: string | null;
  publicationYear: number | null;
  doi: string | null;
  referenceUrl: string | null;
  notes: string | null;
  version: number;
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

export type CropGrowthStageDto = CropGrowthStage & {
  references: StageReference[];
};

export type CropPhenologyEngineDto = {
  cropKnowledgeId: string;
  cropCode: string | null;
  stages: CropGrowthStageDto[];
  transitions: StageTransition[];
};

export type PhenologyEngineValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type PhenologyEngineValidationResult = {
  cropKnowledgeId: string;
  valid: boolean;
  issues: PhenologyEngineValidationIssue[];
};

/** @deprecated Use GrowthStageCode — kept as alias during Phase 2.1B transition. */
export type PhenologyStageCode = GrowthStageCode;
/** @deprecated Use CropGrowthStage. */
export type CropPhenologyStage = CropGrowthStage;
