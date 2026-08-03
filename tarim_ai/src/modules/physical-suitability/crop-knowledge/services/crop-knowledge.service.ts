import { randomUUID } from 'node:crypto';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import type {
  CropGeneralInformation,
  CropGeneralInformationDto,
  CropKnowledge,
  CropKnowledgeBundle,
  CropKnowledgeSummaryDto,
  CropPhenologyDto,
  GrowthStageCode,
} from '../types/crop-knowledge.types.js';
import {
  CropGeneralInformationValidationService,
  type UpsertGeneralInformationInput,
} from './general-information-validation.service.js';
import { CropPhenologyEngineService } from '../phenology/crop-phenology-engine.service.js';
import { CropClimateRequirementsService } from '../climate/crop-climate-requirements.service.js';
import { CropSoilRequirementsService } from '../soil/crop-soil-requirements.service.js';
import { CropWaterRequirementsService } from '../water/crop-water-requirements.service.js';
import { CropTerrainRequirementsService } from '../terrain/crop-terrain-requirements.service.js';
import { CropRiskProfileService } from '../risk/crop-risk-profile.service.js';
import { CropProductionCalendarService } from '../calendar/crop-production-calendar.service.js';
import { ScientificReferenceLibraryService } from '../references/scientific-reference-library.service.js';
import type {
  CreateGrowthStageInput,
  UpdateGrowthStageInput,
} from './phenology-validation.service.js';
import type {
  CreateClimateRequirementInput,
  UpdateClimateRequirementInput,
} from './climate-requirements-validation.service.js';
import type {
  CreateSoilRequirementInput,
  UpdateSoilRequirementInput,
} from './soil-requirements-validation.service.js';
import type {
  CreateWaterRequirementInput,
  UpdateWaterRequirementInput,
} from './water-requirements-validation.service.js';
import type {
  CreateTerrainRequirementInput,
  UpdateTerrainRequirementInput,
} from './terrain-requirements-validation.service.js';
import type {
  CreateCropRiskInput,
  UpdateCropRiskInput,
} from './crop-risk-validation.service.js';
import type {
  CreateProductionCalendarInput,
  UpdateProductionCalendarInput,
} from './production-calendar-validation.service.js';
import type {
  CreateScientificReferenceInput,
  UpdateScientificReferenceInput,
} from './scientific-reference-validation.service.js';
import type { ClimateFactor } from '../climate/climate-requirement.types.js';
import type { SoilFactor } from '../soil/soil-requirement.types.js';
import type { WaterFactor } from '../water/water-requirement.types.js';
import type { TerrainFactor } from '../terrain/terrain-requirement.types.js';
import type { RiskType } from '../risk/crop-risk.types.js';

function newId() {
  return randomUUID();
}

export class CropKnowledgeService {
  readonly validation: CropGeneralInformationValidationService;
  readonly phenologyEngine: CropPhenologyEngineService;
  readonly climateRequirements: CropClimateRequirementsService;
  readonly soilRequirements: CropSoilRequirementsService;
  readonly waterRequirements: CropWaterRequirementsService;
  readonly terrainRequirements: CropTerrainRequirementsService;
  readonly riskProfile: CropRiskProfileService;
  readonly productionCalendar: CropProductionCalendarService;
  readonly scientificReferences: ScientificReferenceLibraryService;

  constructor(private readonly repo: CropKnowledgeRepository) {
    this.validation = new CropGeneralInformationValidationService(repo);
    this.phenologyEngine = new CropPhenologyEngineService(repo);
    this.climateRequirements = new CropClimateRequirementsService(repo);
    this.soilRequirements = new CropSoilRequirementsService(repo);
    this.waterRequirements = new CropWaterRequirementsService(repo);
    this.terrainRequirements = new CropTerrainRequirementsService(repo);
    this.riskProfile = new CropRiskProfileService(repo);
    this.productionCalendar = new CropProductionCalendarService(repo);
    this.scientificReferences = new ScientificReferenceLibraryService(repo);
  }

  get phenologyValidation() {
    return this.phenologyEngine.validation;
  }

  async listSummaries(activeOnly = true): Promise<CropKnowledgeSummaryDto[]> {
    const roots = await this.repo.listKnowledge(activeOnly);
    const out: CropKnowledgeSummaryDto[] = [];
    for (const knowledge of roots) {
      const gi = await this.repo.getGeneralInformation(knowledge.id);
      out.push({
        id: knowledge.id,
        cropCode: knowledge.cropCode,
        cropProfileId: knowledge.cropProfileId,
        version: knowledge.version,
        verificationStatus: knowledge.verificationStatus,
        isActive: knowledge.isActive,
        nameTr: gi?.nameTr ?? null,
        nameEn: gi?.nameEn ?? null,
        scientificName: gi?.scientificName ?? null,
        cropGroup: gi?.cropGroup ?? null,
      });
    }
    return out;
  }

  getBundle(cropKnowledgeId: string): Promise<CropKnowledgeBundle | null> {
    return this.repo.getBundle(cropKnowledgeId);
  }

  async getByCropCode(cropCode: string): Promise<CropKnowledgeBundle | null> {
    const knowledge = await this.repo.getKnowledgeByCropCode(cropCode);
    if (!knowledge) return null;
    return this.repo.getBundle(knowledge.id);
  }

  async getGeneralInformation(
    cropKnowledgeId: string,
  ): Promise<CropGeneralInformationDto | null> {
    return this.repo.getGeneralInformation(cropKnowledgeId);
  }

  async getGeneralInformationByCropCode(
    cropCode: string,
  ): Promise<CropGeneralInformationDto | null> {
    const knowledge = await this.repo.getKnowledgeByCropCode(cropCode);
    if (!knowledge) return null;
    return this.repo.getGeneralInformation(knowledge.id);
  }

  listGeneralInformation(activeOnly = true) {
    return this.repo.listGeneralInformation(activeOnly);
  }

  async upsertGeneralInformation(
    cropKnowledgeId: string,
    input: UpsertGeneralInformationInput,
  ): Promise<CropGeneralInformation> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) {
      throw Object.assign(new Error('Crop knowledge not found'), {
        statusCode: 404,
        code: 'CROP_KNOWLEDGE_NOT_FOUND',
      });
    }

    const existing = await this.repo.getGeneralInformation(cropKnowledgeId);
    const now = new Date().toISOString();

    if (existing) {
      existing.isActive = false;
      existing.updatedAt = now;
      await this.repo.upsertGeneralInformation(existing);
    }

    const next: CropGeneralInformation = {
      id: newId(),
      cropKnowledgeId,
      version: (existing?.version ?? 0) + 1,
      sourceReferenceId: input.sourceReferenceId ?? existing?.sourceReferenceId ?? null,
      verificationStatus: input.verificationStatus ?? 'Draft',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      isActive: input.isActive ?? true,
      identityCode: input.identityCode,
      nameTr: input.nameTr,
      nameEn: input.nameEn,
      scientificName: input.scientificName ?? null,
      faoCode: input.faoCode ?? null,
      eppoCode: input.eppoCode ?? null,
      cropGroup: input.cropGroup,
      family: input.family ?? null,
      lifecycle: input.lifecycle,
      growingType: input.growingType,
      supportsOpenField: input.supportsOpenField,
      supportsGreenhouse: input.supportsGreenhouse,
      supportsRainfed: input.supportsRainfed,
      supportsIrrigated: input.supportsIrrigated,
      supportsFirstCrop: input.supportsFirstCrop,
      supportsSecondCrop: input.supportsSecondCrop,
      seedType: input.seedType ?? null,
      harvestType: input.harvestType ?? null,
      typicalGrowingDurationDays: input.typicalGrowingDurationDays ?? null,
      typicalRootDepthCm: input.typicalRootDepthCm ?? null,
      typicalPlantHeightCm: input.typicalPlantHeightCm ?? null,
      economicPart: input.economicPart ?? null,
      primaryUsage: input.primaryUsage ?? null,
      secondaryUsage: input.secondaryUsage ?? null,
      regionAvailability: input.regionAvailability ?? [],
      description: input.description ?? null,
      photoUrl: input.photoUrl ?? null,
      iconUrl: input.iconUrl ?? null,
      scientificReferenceIds: input.scientificReferenceIds ?? [],
    };

    const issues = this.validation.validateEntity(next);
    const hardErrors = issues.filter((i) => i.severity === 'error');
    if (hardErrors.length > 0) {
      throw Object.assign(new Error('General Information validation failed'), {
        statusCode: 422,
        code: 'GENERAL_INFORMATION_INVALID',
        details: { issues: hardErrors },
      });
    }

    return this.repo.upsertGeneralInformation(next);
  }

  validateGeneralInformation(cropKnowledgeId: string) {
    return this.validation.validate(cropKnowledgeId);
  }

  async getPhenology(cropKnowledgeId: string): Promise<CropPhenologyDto | null> {
    const section = await this.repo.getPhenology(cropKnowledgeId);
    if (!section) return null;
    const stages = await this.repo.listGrowthStages(cropKnowledgeId, true);
    const transitions = await this.repo.listStageTransitions(cropKnowledgeId, true);
    return { section, stages, transitions };
  }

  async getPhenologyByCropCode(cropCode: string): Promise<CropPhenologyDto | null> {
    const knowledge = await this.repo.getKnowledgeByCropCode(cropCode);
    if (!knowledge) return null;
    return this.getPhenology(knowledge.id);
  }

  listPhenologyStages(cropKnowledgeId: string, activeOnly = true) {
    return this.repo.listGrowthStages(cropKnowledgeId, activeOnly);
  }

  listGrowthStages(cropKnowledgeId: string) {
    return this.phenologyEngine.listStages(cropKnowledgeId);
  }

  getGrowthStageDetails(stageId: string) {
    return this.phenologyEngine.getStageDetails(stageId);
  }

  getPhenologyStageByCode(cropKnowledgeId: string, code: GrowthStageCode) {
    return this.phenologyEngine.getStageByCode(cropKnowledgeId, code);
  }

  createGrowthStage(cropKnowledgeId: string, input: CreateGrowthStageInput) {
    return this.phenologyEngine.createStage(cropKnowledgeId, input);
  }

  updateGrowthStage(
    cropKnowledgeId: string,
    stageId: string,
    input: UpdateGrowthStageInput,
  ) {
    return this.phenologyEngine.updateStage(cropKnowledgeId, stageId, input);
  }

  deleteGrowthStage(cropKnowledgeId: string, stageId: string) {
    return this.phenologyEngine.deleteStage(cropKnowledgeId, stageId);
  }

  /** Legacy upsert by stage code — maps to create or update. */
  async upsertPhenologyStage(cropKnowledgeId: string, input: CreateGrowthStageInput) {
    const existing = await this.repo.getGrowthStageByCode(cropKnowledgeId, input.stageCode);
    if (existing) {
      return this.phenologyEngine.updateStage(cropKnowledgeId, existing.id, input);
    }
    return this.phenologyEngine.createStage(cropKnowledgeId, input);
  }

  validatePhenology(cropKnowledgeId: string) {
    return this.phenologyEngine.validate(cropKnowledgeId);
  }

  getClimateRequirementsAggregate(cropKnowledgeId: string) {
    return this.climateRequirements.getAggregate(cropKnowledgeId);
  }

  getClimateRequirementsByCropCode(cropCode: string) {
    return this.climateRequirements.getAggregateByCropCode(cropCode);
  }

  listClimateRequirements(cropKnowledgeId: string) {
    return this.climateRequirements.listRequirements(cropKnowledgeId);
  }

  getClimateRequirementDetails(requirementId: string) {
    return this.climateRequirements.getRequirementById(requirementId);
  }

  getClimateRequirementByFactor(cropKnowledgeId: string, climateFactor: ClimateFactor) {
    return this.climateRequirements.getRequirementByFactor(cropKnowledgeId, climateFactor);
  }

  createClimateRequirement(cropKnowledgeId: string, input: CreateClimateRequirementInput) {
    return this.climateRequirements.createRequirement(cropKnowledgeId, input);
  }

  updateClimateRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateClimateRequirementInput,
  ) {
    return this.climateRequirements.updateRequirement(cropKnowledgeId, requirementId, input);
  }

  deleteClimateRequirement(cropKnowledgeId: string, requirementId: string) {
    return this.climateRequirements.deleteRequirement(cropKnowledgeId, requirementId);
  }

  validateClimateRequirements(cropKnowledgeId: string) {
    return this.climateRequirements.validate(cropKnowledgeId);
  }

  getSoilRequirementsAggregate(cropKnowledgeId: string) {
    return this.soilRequirements.getAggregate(cropKnowledgeId);
  }

  getSoilRequirementsByCropCode(cropCode: string) {
    return this.soilRequirements.getAggregateByCropCode(cropCode);
  }

  listSoilRequirements(cropKnowledgeId: string) {
    return this.soilRequirements.listRequirements(cropKnowledgeId);
  }

  getSoilRequirementDetails(requirementId: string) {
    return this.soilRequirements.getRequirementById(requirementId);
  }

  getSoilRequirementByFactor(cropKnowledgeId: string, soilFactor: SoilFactor) {
    return this.soilRequirements.getRequirementByFactor(cropKnowledgeId, soilFactor);
  }

  createSoilRequirement(cropKnowledgeId: string, input: CreateSoilRequirementInput) {
    return this.soilRequirements.createRequirement(cropKnowledgeId, input);
  }

  updateSoilRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateSoilRequirementInput,
  ) {
    return this.soilRequirements.updateRequirement(cropKnowledgeId, requirementId, input);
  }

  deleteSoilRequirement(cropKnowledgeId: string, requirementId: string) {
    return this.soilRequirements.deleteRequirement(cropKnowledgeId, requirementId);
  }

  validateSoilRequirements(cropKnowledgeId: string) {
    return this.soilRequirements.validate(cropKnowledgeId);
  }

  getWaterRequirementsAggregate(cropKnowledgeId: string) {
    return this.waterRequirements.getAggregate(cropKnowledgeId);
  }

  getWaterRequirementsByCropCode(cropCode: string) {
    return this.waterRequirements.getAggregateByCropCode(cropCode);
  }

  listWaterRequirements(cropKnowledgeId: string) {
    return this.waterRequirements.listRequirements(cropKnowledgeId);
  }

  getWaterRequirementDetails(requirementId: string) {
    return this.waterRequirements.getRequirementById(requirementId);
  }

  getWaterRequirementByFactor(cropKnowledgeId: string, waterFactor: WaterFactor) {
    return this.waterRequirements.getRequirementByFactor(cropKnowledgeId, waterFactor);
  }

  createWaterRequirement(cropKnowledgeId: string, input: CreateWaterRequirementInput) {
    return this.waterRequirements.createRequirement(cropKnowledgeId, input);
  }

  updateWaterRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateWaterRequirementInput,
  ) {
    return this.waterRequirements.updateRequirement(cropKnowledgeId, requirementId, input);
  }

  deleteWaterRequirement(cropKnowledgeId: string, requirementId: string) {
    return this.waterRequirements.deleteRequirement(cropKnowledgeId, requirementId);
  }

  validateWaterRequirements(cropKnowledgeId: string) {
    return this.waterRequirements.validate(cropKnowledgeId);
  }

  getTerrainRequirementsAggregate(cropKnowledgeId: string) {
    return this.terrainRequirements.getAggregate(cropKnowledgeId);
  }

  getTerrainRequirementsByCropCode(cropCode: string) {
    return this.terrainRequirements.getAggregateByCropCode(cropCode);
  }

  listTerrainRequirements(cropKnowledgeId: string) {
    return this.terrainRequirements.listRequirements(cropKnowledgeId);
  }

  getTerrainRequirementDetails(requirementId: string) {
    return this.terrainRequirements.getRequirementById(requirementId);
  }

  getTerrainRequirementByFactor(cropKnowledgeId: string, terrainFactor: TerrainFactor) {
    return this.terrainRequirements.getRequirementByFactor(cropKnowledgeId, terrainFactor);
  }

  createTerrainRequirement(cropKnowledgeId: string, input: CreateTerrainRequirementInput) {
    return this.terrainRequirements.createRequirement(cropKnowledgeId, input);
  }

  updateTerrainRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateTerrainRequirementInput,
  ) {
    return this.terrainRequirements.updateRequirement(cropKnowledgeId, requirementId, input);
  }

  deleteTerrainRequirement(cropKnowledgeId: string, requirementId: string) {
    return this.terrainRequirements.deleteRequirement(cropKnowledgeId, requirementId);
  }

  validateTerrainRequirements(cropKnowledgeId: string) {
    return this.terrainRequirements.validate(cropKnowledgeId);
  }

  getRiskProfileAggregate(cropKnowledgeId: string) {
    return this.riskProfile.getAggregate(cropKnowledgeId);
  }

  getRiskProfileByCropCode(cropCode: string) {
    return this.riskProfile.getAggregateByCropCode(cropCode);
  }

  listCropRisks(cropKnowledgeId: string) {
    return this.riskProfile.listRisks(cropKnowledgeId);
  }

  getCropRiskDetails(riskId: string) {
    return this.riskProfile.getRiskById(riskId);
  }

  getCropRiskByType(cropKnowledgeId: string, riskType: RiskType) {
    return this.riskProfile.getRiskByType(cropKnowledgeId, riskType);
  }

  createCropRisk(cropKnowledgeId: string, input: CreateCropRiskInput) {
    return this.riskProfile.createRisk(cropKnowledgeId, input);
  }

  updateCropRisk(cropKnowledgeId: string, riskId: string, input: UpdateCropRiskInput) {
    return this.riskProfile.updateRisk(cropKnowledgeId, riskId, input);
  }

  deleteCropRisk(cropKnowledgeId: string, riskId: string) {
    return this.riskProfile.deleteRisk(cropKnowledgeId, riskId);
  }

  validateRiskProfile(cropKnowledgeId: string) {
    return this.riskProfile.validate(cropKnowledgeId);
  }

  getProductionCalendarAggregate(cropKnowledgeId: string) {
    return this.productionCalendar.getAggregate(cropKnowledgeId);
  }

  getProductionCalendarByCropCode(cropCode: string) {
    return this.productionCalendar.getAggregateByCropCode(cropCode);
  }

  listProductionCalendars(cropKnowledgeId: string) {
    return this.productionCalendar.listCalendars(cropKnowledgeId);
  }

  getProductionCalendarDetails(calendarId: string) {
    return this.productionCalendar.getCalendarById(calendarId);
  }

  getProductionCalendarByRegionId(cropKnowledgeId: string, regionId: string) {
    return this.productionCalendar.getCalendarByRegionId(cropKnowledgeId, regionId);
  }

  createProductionCalendarItem(cropKnowledgeId: string, input: CreateProductionCalendarInput) {
    return this.productionCalendar.createCalendar(cropKnowledgeId, input);
  }

  updateProductionCalendarItem(
    cropKnowledgeId: string,
    calendarId: string,
    input: UpdateProductionCalendarInput,
  ) {
    return this.productionCalendar.updateCalendar(cropKnowledgeId, calendarId, input);
  }

  deleteProductionCalendarItem(cropKnowledgeId: string, calendarId: string) {
    return this.productionCalendar.deleteCalendar(cropKnowledgeId, calendarId);
  }

  validateProductionCalendar(cropKnowledgeId: string) {
    return this.productionCalendar.validate(cropKnowledgeId);
  }

  listScientificReferences(activeOnly = true) {
    return this.scientificReferences.listReferences(activeOnly);
  }

  getScientificReferenceDetails(referenceId: string) {
    return this.scientificReferences.getReferenceById(referenceId);
  }

  createScientificReference(input: CreateScientificReferenceInput) {
    return this.scientificReferences.createReference(input);
  }

  updateScientificReference(referenceId: string, input: UpdateScientificReferenceInput) {
    return this.scientificReferences.updateReference(referenceId, input);
  }

  deleteScientificReference(referenceId: string) {
    return this.scientificReferences.deleteReference(referenceId);
  }

  validateScientificReference(referenceId: string) {
    return this.scientificReferences.validateReference(referenceId);
  }

  getCropReferencesAggregate(cropKnowledgeId: string) {
    return this.scientificReferences.getCropAggregate(cropKnowledgeId);
  }

  getCropReferencesByCropCode(cropCode: string) {
    return this.scientificReferences.getCropAggregateByCropCode(cropCode);
  }

  listCropScientificReferences(cropKnowledgeId: string) {
    return this.scientificReferences.listCropReferences(cropKnowledgeId);
  }

  linkScientificReference(cropKnowledgeId: string, scientificReferenceId: string) {
    return this.scientificReferences.linkReference(cropKnowledgeId, scientificReferenceId);
  }

  unlinkScientificReference(cropKnowledgeId: string, scientificReferenceId: string) {
    return this.scientificReferences.unlinkReference(cropKnowledgeId, scientificReferenceId);
  }

  validateCropScientificReferences(cropKnowledgeId: string) {
    return this.scientificReferences.validateCropLinks(cropKnowledgeId);
  }

  async ensureRoot(params: {
    cropCode: string;
    cropProfileId?: string | null;
    sourceReferenceId?: string | null;
  }): Promise<CropKnowledge> {
    const existing = await this.repo.getKnowledgeByCropCode(params.cropCode);
    if (existing) return existing;
    const now = new Date().toISOString();
    const row: CropKnowledge = {
      id: newId(),
      cropProfileId: params.cropProfileId ?? null,
      cropCode: params.cropCode,
      version: 1,
      sourceReferenceId: params.sourceReferenceId ?? null,
      verificationStatus: 'Draft',
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    return this.repo.upsertKnowledge(row);
  }
}
