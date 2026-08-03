import type { VerificationStatus } from '../../types/physical-suitability.types.js';
import type {
  CropGrowthStage,
  StageTransition,
} from '../phenology/growth-stage.types.js';
import type { ClimateRequirement } from '../climate/climate-requirement.types.js';
import type { SoilRequirement } from '../soil/soil-requirement.types.js';
import type { WaterRequirement } from '../water/water-requirement.types.js';
import type { TerrainRequirement } from '../terrain/terrain-requirement.types.js';
import type { CropRisk } from '../risk/crop-risk.types.js';
import type { ProductionCalendar } from '../calendar/production-calendar.types.js';
import type { ScientificReference } from '../references/scientific-reference.types.js';

export type {
  GrowthStageCode,
  CropGrowthStage,
  StageTransition,
  StageReference,
  CropGrowthStageDto,
  CropPhenologyEngineDto,
  PhenologyEngineValidationIssue,
  PhenologyEngineValidationResult,
  PhenologyStageCode,
  CropPhenologyStage,
  GrowthStageCatalogEntry,
} from '../phenology/growth-stage.types.js';

export {
  GROWTH_STAGE_CODES,
  GROWTH_STAGE_CATALOG,
  POST_HARVEST_STAGE_CODES,
  GROWTH_STAGE_CATALOG as PHENOLOGY_STAGE_CATALOG,
} from '../phenology/growth-stage.types.js';

export type {
  ClimateFactor,
  ClimateRequirement,
  ClimateToleranceLevel,
  ClimateImportanceLevel,
  CropClimateRequirementsDto,
  ClimateRequirementsValidationIssue,
  ClimateRequirementsValidationResult,
  ClimateFactorCatalogEntry,
} from '../climate/climate-requirement.types.js';

export {
  CLIMATE_FACTORS,
  CLIMATE_FACTOR_CATALOG,
} from '../climate/climate-requirement.types.js';

export type {
  SoilFactor,
  SoilRequirement,
  SoilToleranceLevel,
  SoilImportanceLevel,
  CropSoilRequirementsDto,
  SoilRequirementsValidationIssue,
  SoilRequirementsValidationResult,
  SoilFactorCatalogEntry,
} from '../soil/soil-requirement.types.js';

export {
  SOIL_FACTORS,
  SOIL_FACTOR_CATALOG,
} from '../soil/soil-requirement.types.js';

export type {
  WaterFactor,
  WaterRequirement,
  WaterToleranceLevel,
  WaterImportanceLevel,
  CropWaterRequirementsDto,
  WaterRequirementsValidationIssue,
  WaterRequirementsValidationResult,
  WaterFactorCatalogEntry,
} from '../water/water-requirement.types.js';

export {
  WATER_FACTORS,
  WATER_FACTOR_CATALOG,
} from '../water/water-requirement.types.js';

export type {
  TerrainFactor,
  TerrainRequirement,
  CropTerrainRequirementsDto,
  TerrainRequirementsValidationIssue,
  TerrainRequirementsValidationResult,
  TerrainFactorCatalogEntry,
} from '../terrain/terrain-requirement.types.js';

export {
  TERRAIN_FACTORS,
  TERRAIN_FACTOR_CATALOG,
} from '../terrain/terrain-requirement.types.js';

export type {
  RiskType,
  RiskLevel,
  RiskSensitivity,
  CropRisk,
  CropRiskProfileDto,
  CropRiskValidationIssue,
  CropRiskValidationResult,
  RiskTypeCatalogEntry,
} from '../risk/crop-risk.types.js';

export {
  RISK_TYPES,
  RISK_LEVELS,
  RISK_SENSITIVITIES,
  RISK_TYPE_CATALOG,
} from '../risk/crop-risk.types.js';

export type {
  CalendarRegionScope,
  ProductionCalendar,
  CropProductionCalendarDto,
  ProductionCalendarValidationIssue,
  ProductionCalendarValidationResult,
} from '../calendar/production-calendar.types.js';

export { CALENDAR_REGION_SCOPES } from '../calendar/production-calendar.types.js';

export type {
  ReferenceType,
  ScientificReference,
  CropScientificReferenceLink,
  CropReferencesDto,
  ScientificReferenceValidationIssue,
  ScientificReferenceValidationResult,
} from '../references/scientific-reference.types.js';

export { REFERENCE_TYPES } from '../references/scientific-reference.types.js';

/** Shared versioning / provenance fields for every CropKnowledge section entity. */
export type KnowledgeEntityMeta = {
  id: string;
  cropKnowledgeId: string;
  version: number;
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

export type CropLifecycle = 'Seasonal' | 'Perennial' | 'Biennial';

export type GrowingType =
  | 'FieldCrop'
  | 'Vegetable'
  | 'Melon'
  | 'Industrial'
  | 'Other';

export type SeedType =
  | 'Seed'
  | 'Seedling'
  | 'Tuber'
  | 'Cutting'
  | 'Other'
  | null;

export type HarvestType =
  | 'Grain'
  | 'Fruit'
  | 'Leaf'
  | 'Root'
  | 'Fiber'
  | 'Multiple'
  | 'Other'
  | null;

/**
 * Root aggregate for Crop Knowledge Base.
 * Section payloads live in separate normalized entities.
 */
export type CropKnowledge = {
  id: string;
  cropProfileId: string | null;
  cropCode: string;
  version: number;
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

/**
 * General Information — identity & descriptive catalog (no suitability thresholds).
 */
export type CropGeneralInformation = KnowledgeEntityMeta & {
  identityCode: string;
  nameTr: string;
  nameEn: string;
  scientificName: string | null;
  faoCode: string | null;
  eppoCode: string | null;
  cropGroup: string;
  family: string | null;
  lifecycle: CropLifecycle;
  growingType: GrowingType;
  supportsOpenField: boolean;
  supportsGreenhouse: boolean;
  supportsRainfed: boolean;
  supportsIrrigated: boolean;
  supportsFirstCrop: boolean;
  supportsSecondCrop: boolean;
  seedType: SeedType;
  harvestType: HarvestType;
  /** Descriptive catalog only — null until verified; not a suitability threshold. */
  typicalGrowingDurationDays: number | null;
  typicalRootDepthCm: number | null;
  typicalPlantHeightCm: number | null;
  economicPart: string | null;
  primaryUsage: string | null;
  secondaryUsage: string | null;
  regionAvailability: string[];
  description: string | null;
  photoUrl: string | null;
  iconUrl: string | null;
  scientificReferenceIds: string[];
};

/** Placeholder shells for later phases — structure only, no thresholds. */
export type CropScientificIdentity = KnowledgeEntityMeta & {
  scientificName: string | null;
  faoCode: string | null;
  eppoCode: string | null;
  family: string | null;
  genus: string | null;
  notes: string | null;
};

export type CropPhenologyKnowledge = KnowledgeEntityMeta & {
  notes: string | null;
};

export type CropPhenologyDto = {
  section: CropPhenologyKnowledge;
  stages: CropGrowthStage[];
  transitions: StageTransition[];
};

export type CropClimateRequirementsKnowledge = KnowledgeEntityMeta & {
  notes: string | null;
};

export type CropSoilRequirementsKnowledge = KnowledgeEntityMeta & {
  notes: string | null;
};

export type CropWaterRequirementsKnowledge = KnowledgeEntityMeta & {
  notes: string | null;
};

export type CropTerrainRequirementsKnowledge = KnowledgeEntityMeta & {
  notes: string | null;
};

export type CropProductionCalendarKnowledge = KnowledgeEntityMeta & {
  regionCode: string | null;
  notes: string | null;
};

export type CropRiskProfileKnowledge = KnowledgeEntityMeta & {
  notes: string | null;
};

/** References section shell — links to SourceReference ids; no scoring. */
export type CropReferencesKnowledge = KnowledgeEntityMeta & {
  referenceIds: string[];
  notes: string | null;
};

export type CropKnowledgeBundle = {
  knowledge: CropKnowledge;
  generalInformation: CropGeneralInformation | null;
  scientificIdentity: CropScientificIdentity | null;
  phenology: CropPhenologyKnowledge | null;
  growthStages: CropGrowthStage[];
  stageTransitions: StageTransition[];
  /** @deprecated alias of growthStages */
  phenologyStages: CropGrowthStage[];
  climateRequirements: CropClimateRequirementsKnowledge | null;
  climateRequirementItems: ClimateRequirement[];
  soilRequirements: CropSoilRequirementsKnowledge | null;
  soilRequirementItems: SoilRequirement[];
  waterRequirements: CropWaterRequirementsKnowledge | null;
  waterRequirementItems: WaterRequirement[];
  terrainRequirements: CropTerrainRequirementsKnowledge | null;
  terrainRequirementItems: TerrainRequirement[];
  productionCalendar: CropProductionCalendarKnowledge | null;
  productionCalendarItems: ProductionCalendar[];
  riskProfile: CropRiskProfileKnowledge | null;
  cropRiskItems: CropRisk[];
  references: CropReferencesKnowledge | null;
  scientificReferences: ScientificReference[];
};

export type CropGeneralInformationDto = CropGeneralInformation;

export type CropKnowledgeSummaryDto = {
  id: string;
  cropCode: string;
  cropProfileId: string | null;
  version: number;
  verificationStatus: VerificationStatus;
  isActive: boolean;
  nameTr: string | null;
  nameEn: string | null;
  scientificName: string | null;
  cropGroup: string | null;
};

export type CropGeneralInformationValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type CropGeneralInformationValidationResult = {
  cropKnowledgeId: string;
  valid: boolean;
  issues: CropGeneralInformationValidationIssue[];
};

export type CropPhenologyValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type CropPhenologyValidationResult = {
  cropKnowledgeId: string;
  valid: boolean;
  issues: CropPhenologyValidationIssue[];
};
