import type { PhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import {
  CropDecisionMatrixService,
  CropProfileService,
  CriterionCatalogService,
  CriticalBarrierEvaluationService,
  DataSourceResolutionService,
  MissingDataEvaluationService,
} from './domain-services.js';
import { CropProfileValidationService } from './crop-profile-validation.service.js';
import type {
  CriticalBarrierRule,
  CropCriterionRule,
  DataSourceRecord,
  SourceReference,
} from '../types/physical-suitability.types.js';
import { newId } from '../repositories/physical-suitability.repository.js';
import type { CropKnowledgeRepository } from '../crop-knowledge/repositories/crop-knowledge.repository.js';
import { CropKnowledgeService } from '../crop-knowledge/services/crop-knowledge.service.js';
import type { UpsertGeneralInformationInput } from '../crop-knowledge/services/general-information-validation.service.js';
import type {
  CreateGrowthStageInput,
  UpdateGrowthStageInput,
  UpsertPhenologyStageInput,
} from '../crop-knowledge/services/phenology-validation.service.js';
import type {
  CreateClimateRequirementInput,
  UpdateClimateRequirementInput,
} from '../crop-knowledge/services/climate-requirements-validation.service.js';
import type {
  CreateSoilRequirementInput,
  UpdateSoilRequirementInput,
} from '../crop-knowledge/services/soil-requirements-validation.service.js';
import type {
  CreateWaterRequirementInput,
  UpdateWaterRequirementInput,
} from '../crop-knowledge/services/water-requirements-validation.service.js';
import type {
  CreateTerrainRequirementInput,
  UpdateTerrainRequirementInput,
} from '../crop-knowledge/services/terrain-requirements-validation.service.js';
import type {
  CreateCropRiskInput,
  UpdateCropRiskInput,
} from '../crop-knowledge/services/crop-risk-validation.service.js';
import type {
  CreateProductionCalendarInput,
  UpdateProductionCalendarInput,
} from '../crop-knowledge/services/production-calendar-validation.service.js';
import type {
  CreateScientificReferenceInput,
  UpdateScientificReferenceInput,
} from '../crop-knowledge/services/scientific-reference-validation.service.js';
import type { SoilLaboratoryRepository } from '../soil-laboratory/repositories/soil-laboratory.repository.js';
import { SoilLaboratoryService } from '../soil-laboratory/services/soil-laboratory.service.js';
import type {
  CreateAnalysisMethodInput,
  CreateLaboratoryInput,
  CreateSoilAnalysisResultInput,
  CreateSoilSampleInput,
  UpdateAnalysisMethodInput,
  UpdateLaboratoryInput,
  UpdateSoilAnalysisResultInput,
  UpdateSoilSampleInput,
} from '../soil-laboratory/services/soil-laboratory-validation.service.js';
import type {
  CreateSoilParameterAliasInput,
  CreateSoilParameterInput,
  NormalizeAnalysisResultInput,
  UnitConvertInput,
  UpdateSoilParameterAliasInput,
  UpdateSoilParameterInput,
  ValidateAnalysisResultInput,
} from '../soil-laboratory/services/soil-parameter-validation.service.js';
import type {
  CreateLaboratoryApprovalInput,
  CreateLaboratoryReportInput,
  UpdateLaboratoryReportInput,
  UploadLaboratoryReportInput,
} from '../soil-laboratory/services/laboratory-report-validation.service.js';
import type {
  CommitImportSessionInput,
  CreateImportMappingInput,
  PreviewImportSessionInput,
  UploadImportSessionInput,
  ValidateImportSessionInput,
} from '../soil-laboratory/services/laboratory-import-validation.service.js';
import type { SoilSamplingRepository } from '../soil-sampling/repositories/soil-sampling.repository.js';
import { SoilSamplingService } from '../soil-sampling/services/soil-sampling.service.js';
import type {
  CreateChainOfCustodyInput,
  CreateSamplingCampaignInput,
  CreateSamplingObservationInput,
  CreateSamplingPointInput,
  CreateSamplingSoilSampleInput,
  UpdateChainOfCustodyInput,
  UpdateSamplingCampaignInput,
  UpdateSamplingObservationInput,
  UpdateSamplingPointInput,
  UpdateSamplingSoilSampleInput,
} from '../soil-sampling/services/soil-sampling-validation.service.js';
import type { IrrigationWaterRepository } from '../irrigation-water-laboratory/repositories/irrigation-water.repository.js';
import { IrrigationWaterService } from '../irrigation-water-laboratory/services/irrigation-water.service.js';
import type {
  CreateWaterAnalysisResultInput,
  CreateWaterCustodyInput,
  CreateWaterParameterInput,
  CreateWaterSampleInput,
  CreateWaterSourceInput,
  NormalizeWaterAnalysisResultInput,
  UpdateWaterAnalysisResultInput,
  UpdateWaterParameterInput,
  UpdateWaterSampleInput,
  UpdateWaterSampleStatusInput,
  UpdateWaterSourceInput,
} from '../irrigation-water-laboratory/services/irrigation-water-validation.service.js';
import type { FieldObservationRepository } from '../field-observation/repositories/field-observation.repository.js';
import { FieldObservationService } from '../field-observation/services/field-observation.service.js';
import type {
  CreateFieldDeviceInput,
  CreateFieldDeviceMeasurementInput,
  CreateFieldObservationPointInput,
  CreateFieldObservationResultInput,
  CreateFieldParameterInput,
  CreateFieldSurveyInput,
  CreateFieldSurveyReviewInput,
  ReviewActionInput,
  UpdateFieldDeviceInput,
  UpdateFieldObservationPointInput,
  UpdateFieldObservationResultInput,
  UpdateFieldParameterInput,
  UpdateFieldSurveyInput,
  UploadFieldEvidenceInput,
} from '../field-observation/services/field-observation-validation.service.js';
import type { AgroClimateRepository } from '../agroclimate/repositories/agroclimate.repository.js';
import { AgroClimateService } from '../agroclimate/services/agroclimate.service.js';
import type {
  CreateAnalysisRunInput,
  CreateCalculationConfigInput,
  CreateClimateDataSourceInput,
  CreateClimateObservationInput,
  CreateSourceComparisonInput,
  UpdateCalculationConfigInput,
} from '../agroclimate/services/agroclimate-validation.service.js';
import type { ParameterCode } from '../agroclimate/types/agroclimate.types.js';
import type {
  ClimateFactor,
  GrowthStageCode,
  RiskType,
  SoilFactor,
  TerrainFactor,
  WaterFactor,
} from '../crop-knowledge/types/crop-knowledge.types.js';

export class PhysicalSuitabilityFacade {
  readonly profiles: CropProfileService;
  readonly criteria: CriterionCatalogService;
  readonly matrix: CropDecisionMatrixService;
  readonly sources: DataSourceResolutionService;
  readonly missingData: MissingDataEvaluationService;
  readonly barriers: CriticalBarrierEvaluationService;
  readonly validation: CropProfileValidationService;
  readonly cropKnowledge: CropKnowledgeService | null;
  readonly soilLaboratory: SoilLaboratoryService | null;
  readonly soilSampling: SoilSamplingService | null;
  readonly irrigationWater: IrrigationWaterService | null;
  readonly fieldObservation: FieldObservationService | null;
  readonly agroClimate: AgroClimateService | null;

  constructor(
    private readonly repo: PhysicalSuitabilityRepository,
    cropKnowledgeRepo?: CropKnowledgeRepository,
    soilLaboratoryRepo?: SoilLaboratoryRepository,
    soilSamplingRepo?: SoilSamplingRepository,
    irrigationWaterRepo?: IrrigationWaterRepository,
    fieldObservationRepo?: FieldObservationRepository,
    agroClimateRepo?: AgroClimateRepository,
  ) {
    this.profiles = new CropProfileService(repo);
    this.criteria = new CriterionCatalogService(repo);
    this.matrix = new CropDecisionMatrixService(repo);
    this.sources = new DataSourceResolutionService(repo);
    this.missingData = new MissingDataEvaluationService();
    this.barriers = new CriticalBarrierEvaluationService();
    this.validation = new CropProfileValidationService(repo, this.matrix);
    this.cropKnowledge = cropKnowledgeRepo
      ? new CropKnowledgeService(cropKnowledgeRepo)
      : null;
    this.soilLaboratory = soilLaboratoryRepo
      ? new SoilLaboratoryService(soilLaboratoryRepo)
      : null;
    this.soilSampling = soilSamplingRepo
      ? new SoilSamplingService(soilSamplingRepo)
      : null;
    this.irrigationWater = irrigationWaterRepo
      ? new IrrigationWaterService(irrigationWaterRepo)
      : null;
    this.fieldObservation = fieldObservationRepo
      ? new FieldObservationService(fieldObservationRepo, {
          onAudit: async (entry) => {
            await this.repo.appendAudit({
              id: newId(),
              entityType: entry.entityType,
              entityId: entry.entityId,
              action: entry.action,
              actor: entry.actor,
              previousValue: entry.previousValue,
              newValue: entry.newValue,
              reason: entry.reason,
              version: null,
              createdAt: new Date().toISOString(),
            });
          },
        })
      : null;
    this.agroClimate = agroClimateRepo ? new AgroClimateService(agroClimateRepo) : null;
  }

  private requireCropKnowledge(): CropKnowledgeService {
    if (!this.cropKnowledge) {
      throw Object.assign(new Error('Crop Knowledge Base is not configured'), {
        statusCode: 503,
        code: 'CROP_KNOWLEDGE_UNAVAILABLE',
      });
    }
    return this.cropKnowledge;
  }

  private requireSoilLaboratory(): SoilLaboratoryService {
    if (!this.soilLaboratory) {
      throw Object.assign(new Error('Soil Laboratory is not configured'), {
        statusCode: 503,
        code: 'SOIL_LABORATORY_UNAVAILABLE',
      });
    }
    return this.soilLaboratory;
  }

  private requireSoilSampling(): SoilSamplingService {
    if (!this.soilSampling) {
      throw Object.assign(new Error('Soil Sampling Management is not configured'), {
        statusCode: 503,
        code: 'SOIL_SAMPLING_UNAVAILABLE',
      });
    }
    return this.soilSampling;
  }

  private requireIrrigationWater(): IrrigationWaterService {
    if (!this.irrigationWater) {
      throw Object.assign(new Error('Irrigation Water Laboratory is not configured'), {
        statusCode: 503,
        code: 'IRRIGATION_WATER_UNAVAILABLE',
      });
    }
    return this.irrigationWater;
  }

  private requireFieldObservation(): FieldObservationService {
    if (!this.fieldObservation) {
      throw Object.assign(new Error('Field Observation is not configured'), {
        statusCode: 503,
        code: 'FIELD_OBSERVATION_UNAVAILABLE',
      });
    }
    return this.fieldObservation;
  }

  private requireAgroClimate(): AgroClimateService {
    if (!this.agroClimate) {
      throw Object.assign(new Error('AgroClimate Indicators Engine is not configured'), {
        statusCode: 503,
        code: 'AGROCLIMATE_UNAVAILABLE',
      });
    }
    return this.agroClimate;
  }

  listCropKnowledgeSummaries() {
    return this.requireCropKnowledge().listSummaries(true);
  }

  getCropKnowledgeBundle(cropKnowledgeId: string) {
    return this.requireCropKnowledge().getBundle(cropKnowledgeId);
  }

  getCropKnowledgeByCode(cropCode: string) {
    return this.requireCropKnowledge().getByCropCode(cropCode);
  }

  listGeneralInformation() {
    return this.requireCropKnowledge().listGeneralInformation(true);
  }

  getGeneralInformation(cropKnowledgeId: string) {
    return this.requireCropKnowledge().getGeneralInformation(cropKnowledgeId);
  }

  getGeneralInformationByCropCode(cropCode: string) {
    return this.requireCropKnowledge().getGeneralInformationByCropCode(cropCode);
  }

  upsertGeneralInformation(cropKnowledgeId: string, input: UpsertGeneralInformationInput) {
    return this.requireCropKnowledge().upsertGeneralInformation(cropKnowledgeId, input);
  }

  validateGeneralInformation(cropKnowledgeId: string) {
    return this.requireCropKnowledge().validateGeneralInformation(cropKnowledgeId);
  }

  getPhenology(cropKnowledgeId: string) {
    return this.requireCropKnowledge().getPhenology(cropKnowledgeId);
  }

  getPhenologyByCropCode(cropCode: string) {
    return this.requireCropKnowledge().getPhenologyByCropCode(cropCode);
  }

  listGrowthStages(cropKnowledgeId: string) {
    return this.requireCropKnowledge().listGrowthStages(cropKnowledgeId);
  }

  getGrowthStageDetails(stageId: string) {
    return this.requireCropKnowledge().getGrowthStageDetails(stageId);
  }

  getPhenologyStageByCode(cropKnowledgeId: string, code: GrowthStageCode) {
    return this.requireCropKnowledge().getPhenologyStageByCode(cropKnowledgeId, code);
  }

  createGrowthStage(cropKnowledgeId: string, input: CreateGrowthStageInput) {
    return this.requireCropKnowledge().createGrowthStage(cropKnowledgeId, input);
  }

  updateGrowthStage(
    cropKnowledgeId: string,
    stageId: string,
    input: UpdateGrowthStageInput,
  ) {
    return this.requireCropKnowledge().updateGrowthStage(cropKnowledgeId, stageId, input);
  }

  deleteGrowthStage(cropKnowledgeId: string, stageId: string) {
    return this.requireCropKnowledge().deleteGrowthStage(cropKnowledgeId, stageId);
  }

  listPhenologyStages(cropKnowledgeId: string) {
    return this.requireCropKnowledge().listPhenologyStages(cropKnowledgeId, true);
  }

  upsertPhenologyStage(cropKnowledgeId: string, input: UpsertPhenologyStageInput) {
    return this.requireCropKnowledge().upsertPhenologyStage(cropKnowledgeId, input);
  }

  validatePhenology(cropKnowledgeId: string) {
    return this.requireCropKnowledge().validatePhenology(cropKnowledgeId);
  }

  getClimateRequirementsAggregate(cropKnowledgeId: string) {
    return this.requireCropKnowledge().getClimateRequirementsAggregate(cropKnowledgeId);
  }

  getClimateRequirementsByCropCode(cropCode: string) {
    return this.requireCropKnowledge().getClimateRequirementsByCropCode(cropCode);
  }

  listClimateRequirements(cropKnowledgeId: string) {
    return this.requireCropKnowledge().listClimateRequirements(cropKnowledgeId);
  }

  getClimateRequirementDetails(requirementId: string) {
    return this.requireCropKnowledge().getClimateRequirementDetails(requirementId);
  }

  getClimateRequirementByFactor(cropKnowledgeId: string, climateFactor: ClimateFactor) {
    return this.requireCropKnowledge().getClimateRequirementByFactor(
      cropKnowledgeId,
      climateFactor,
    );
  }

  createClimateRequirement(cropKnowledgeId: string, input: CreateClimateRequirementInput) {
    return this.requireCropKnowledge().createClimateRequirement(cropKnowledgeId, input);
  }

  updateClimateRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateClimateRequirementInput,
  ) {
    return this.requireCropKnowledge().updateClimateRequirement(
      cropKnowledgeId,
      requirementId,
      input,
    );
  }

  deleteClimateRequirement(cropKnowledgeId: string, requirementId: string) {
    return this.requireCropKnowledge().deleteClimateRequirement(
      cropKnowledgeId,
      requirementId,
    );
  }

  validateClimateRequirements(cropKnowledgeId: string) {
    return this.requireCropKnowledge().validateClimateRequirements(cropKnowledgeId);
  }

  getSoilRequirementsAggregate(cropKnowledgeId: string) {
    return this.requireCropKnowledge().getSoilRequirementsAggregate(cropKnowledgeId);
  }

  getSoilRequirementsByCropCode(cropCode: string) {
    return this.requireCropKnowledge().getSoilRequirementsByCropCode(cropCode);
  }

  listSoilRequirements(cropKnowledgeId: string) {
    return this.requireCropKnowledge().listSoilRequirements(cropKnowledgeId);
  }

  getSoilRequirementDetails(requirementId: string) {
    return this.requireCropKnowledge().getSoilRequirementDetails(requirementId);
  }

  getSoilRequirementByFactor(cropKnowledgeId: string, soilFactor: SoilFactor) {
    return this.requireCropKnowledge().getSoilRequirementByFactor(cropKnowledgeId, soilFactor);
  }

  createSoilRequirement(cropKnowledgeId: string, input: CreateSoilRequirementInput) {
    return this.requireCropKnowledge().createSoilRequirement(cropKnowledgeId, input);
  }

  updateSoilRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateSoilRequirementInput,
  ) {
    return this.requireCropKnowledge().updateSoilRequirement(
      cropKnowledgeId,
      requirementId,
      input,
    );
  }

  deleteSoilRequirement(cropKnowledgeId: string, requirementId: string) {
    return this.requireCropKnowledge().deleteSoilRequirement(cropKnowledgeId, requirementId);
  }

  validateSoilRequirements(cropKnowledgeId: string) {
    return this.requireCropKnowledge().validateSoilRequirements(cropKnowledgeId);
  }

  getWaterRequirementsAggregate(cropKnowledgeId: string) {
    return this.requireCropKnowledge().getWaterRequirementsAggregate(cropKnowledgeId);
  }

  getWaterRequirementsByCropCode(cropCode: string) {
    return this.requireCropKnowledge().getWaterRequirementsByCropCode(cropCode);
  }

  listWaterRequirements(cropKnowledgeId: string) {
    return this.requireCropKnowledge().listWaterRequirements(cropKnowledgeId);
  }

  getWaterRequirementDetails(requirementId: string) {
    return this.requireCropKnowledge().getWaterRequirementDetails(requirementId);
  }

  getWaterRequirementByFactor(cropKnowledgeId: string, waterFactor: WaterFactor) {
    return this.requireCropKnowledge().getWaterRequirementByFactor(
      cropKnowledgeId,
      waterFactor,
    );
  }

  createWaterRequirement(cropKnowledgeId: string, input: CreateWaterRequirementInput) {
    return this.requireCropKnowledge().createWaterRequirement(cropKnowledgeId, input);
  }

  updateWaterRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateWaterRequirementInput,
  ) {
    return this.requireCropKnowledge().updateWaterRequirement(
      cropKnowledgeId,
      requirementId,
      input,
    );
  }

  deleteWaterRequirement(cropKnowledgeId: string, requirementId: string) {
    return this.requireCropKnowledge().deleteWaterRequirement(cropKnowledgeId, requirementId);
  }

  validateWaterRequirements(cropKnowledgeId: string) {
    return this.requireCropKnowledge().validateWaterRequirements(cropKnowledgeId);
  }

  getTerrainRequirementsAggregate(cropKnowledgeId: string) {
    return this.requireCropKnowledge().getTerrainRequirementsAggregate(cropKnowledgeId);
  }

  getTerrainRequirementsByCropCode(cropCode: string) {
    return this.requireCropKnowledge().getTerrainRequirementsByCropCode(cropCode);
  }

  listTerrainRequirements(cropKnowledgeId: string) {
    return this.requireCropKnowledge().listTerrainRequirements(cropKnowledgeId);
  }

  getTerrainRequirementDetails(requirementId: string) {
    return this.requireCropKnowledge().getTerrainRequirementDetails(requirementId);
  }

  getTerrainRequirementByFactor(cropKnowledgeId: string, terrainFactor: TerrainFactor) {
    return this.requireCropKnowledge().getTerrainRequirementByFactor(
      cropKnowledgeId,
      terrainFactor,
    );
  }

  createTerrainRequirement(cropKnowledgeId: string, input: CreateTerrainRequirementInput) {
    return this.requireCropKnowledge().createTerrainRequirement(cropKnowledgeId, input);
  }

  updateTerrainRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateTerrainRequirementInput,
  ) {
    return this.requireCropKnowledge().updateTerrainRequirement(
      cropKnowledgeId,
      requirementId,
      input,
    );
  }

  deleteTerrainRequirement(cropKnowledgeId: string, requirementId: string) {
    return this.requireCropKnowledge().deleteTerrainRequirement(cropKnowledgeId, requirementId);
  }

  validateTerrainRequirements(cropKnowledgeId: string) {
    return this.requireCropKnowledge().validateTerrainRequirements(cropKnowledgeId);
  }

  getRiskProfileAggregate(cropKnowledgeId: string) {
    return this.requireCropKnowledge().getRiskProfileAggregate(cropKnowledgeId);
  }

  getRiskProfileByCropCode(cropCode: string) {
    return this.requireCropKnowledge().getRiskProfileByCropCode(cropCode);
  }

  listCropRisks(cropKnowledgeId: string) {
    return this.requireCropKnowledge().listCropRisks(cropKnowledgeId);
  }

  getCropRiskDetails(riskId: string) {
    return this.requireCropKnowledge().getCropRiskDetails(riskId);
  }

  getCropRiskByType(cropKnowledgeId: string, riskType: RiskType) {
    return this.requireCropKnowledge().getCropRiskByType(cropKnowledgeId, riskType);
  }

  createCropRisk(cropKnowledgeId: string, input: CreateCropRiskInput) {
    return this.requireCropKnowledge().createCropRisk(cropKnowledgeId, input);
  }

  updateCropRisk(cropKnowledgeId: string, riskId: string, input: UpdateCropRiskInput) {
    return this.requireCropKnowledge().updateCropRisk(cropKnowledgeId, riskId, input);
  }

  deleteCropRisk(cropKnowledgeId: string, riskId: string) {
    return this.requireCropKnowledge().deleteCropRisk(cropKnowledgeId, riskId);
  }

  validateRiskProfile(cropKnowledgeId: string) {
    return this.requireCropKnowledge().validateRiskProfile(cropKnowledgeId);
  }

  getProductionCalendarAggregate(cropKnowledgeId: string) {
    return this.requireCropKnowledge().getProductionCalendarAggregate(cropKnowledgeId);
  }

  getProductionCalendarByCropCode(cropCode: string) {
    return this.requireCropKnowledge().getProductionCalendarByCropCode(cropCode);
  }

  listProductionCalendars(cropKnowledgeId: string) {
    return this.requireCropKnowledge().listProductionCalendars(cropKnowledgeId);
  }

  getProductionCalendarDetails(calendarId: string) {
    return this.requireCropKnowledge().getProductionCalendarDetails(calendarId);
  }

  getProductionCalendarByRegionId(cropKnowledgeId: string, regionId: string) {
    return this.requireCropKnowledge().getProductionCalendarByRegionId(cropKnowledgeId, regionId);
  }

  createProductionCalendarItem(cropKnowledgeId: string, input: CreateProductionCalendarInput) {
    return this.requireCropKnowledge().createProductionCalendarItem(cropKnowledgeId, input);
  }

  updateProductionCalendarItem(
    cropKnowledgeId: string,
    calendarId: string,
    input: UpdateProductionCalendarInput,
  ) {
    return this.requireCropKnowledge().updateProductionCalendarItem(
      cropKnowledgeId,
      calendarId,
      input,
    );
  }

  deleteProductionCalendarItem(cropKnowledgeId: string, calendarId: string) {
    return this.requireCropKnowledge().deleteProductionCalendarItem(cropKnowledgeId, calendarId);
  }

  validateProductionCalendar(cropKnowledgeId: string) {
    return this.requireCropKnowledge().validateProductionCalendar(cropKnowledgeId);
  }

  listScientificReferences(activeOnly = true) {
    return this.requireCropKnowledge().listScientificReferences(activeOnly);
  }

  getScientificReferenceDetails(referenceId: string) {
    return this.requireCropKnowledge().getScientificReferenceDetails(referenceId);
  }

  createScientificReference(input: CreateScientificReferenceInput) {
    return this.requireCropKnowledge().createScientificReference(input);
  }

  updateScientificReference(referenceId: string, input: UpdateScientificReferenceInput) {
    return this.requireCropKnowledge().updateScientificReference(referenceId, input);
  }

  deleteScientificReference(referenceId: string) {
    return this.requireCropKnowledge().deleteScientificReference(referenceId);
  }

  validateScientificReference(referenceId: string) {
    return this.requireCropKnowledge().validateScientificReference(referenceId);
  }

  getCropReferencesAggregate(cropKnowledgeId: string) {
    return this.requireCropKnowledge().getCropReferencesAggregate(cropKnowledgeId);
  }

  getCropReferencesByCropCode(cropCode: string) {
    return this.requireCropKnowledge().getCropReferencesByCropCode(cropCode);
  }

  listCropScientificReferences(cropKnowledgeId: string) {
    return this.requireCropKnowledge().listCropScientificReferences(cropKnowledgeId);
  }

  linkScientificReference(cropKnowledgeId: string, scientificReferenceId: string) {
    return this.requireCropKnowledge().linkScientificReference(
      cropKnowledgeId,
      scientificReferenceId,
    );
  }

  unlinkScientificReference(cropKnowledgeId: string, scientificReferenceId: string) {
    return this.requireCropKnowledge().unlinkScientificReference(
      cropKnowledgeId,
      scientificReferenceId,
    );
  }

  validateCropScientificReferences(cropKnowledgeId: string) {
    return this.requireCropKnowledge().validateCropScientificReferences(cropKnowledgeId);
  }

  // ---- Soil Laboratory (Phase 2.2A) ----

  listLaboratories() {
    return this.requireSoilLaboratory().listLaboratories(true);
  }
  getLaboratory(id: string) {
    return this.requireSoilLaboratory().getLaboratory(id);
  }
  createLaboratory(input: CreateLaboratoryInput) {
    return this.requireSoilLaboratory().createLaboratory(input);
  }
  updateLaboratory(id: string, input: UpdateLaboratoryInput) {
    return this.requireSoilLaboratory().updateLaboratory(id, input);
  }
  deleteLaboratory(id: string) {
    return this.requireSoilLaboratory().deleteLaboratory(id);
  }

  listAnalysisMethods() {
    return this.requireSoilLaboratory().listAnalysisMethods(true);
  }
  getAnalysisMethod(id: string) {
    return this.requireSoilLaboratory().getAnalysisMethod(id);
  }
  createAnalysisMethod(input: CreateAnalysisMethodInput) {
    return this.requireSoilLaboratory().createAnalysisMethod(input);
  }
  updateAnalysisMethod(id: string, input: UpdateAnalysisMethodInput) {
    return this.requireSoilLaboratory().updateAnalysisMethod(id, input);
  }
  deleteAnalysisMethod(id: string) {
    return this.requireSoilLaboratory().deleteAnalysisMethod(id);
  }

  listSoilSamples() {
    return this.requireSoilLaboratory().listSamples(true);
  }
  listSoilSamplesByParcel(parcelId: string) {
    return this.requireSoilLaboratory().listSamplesByParcel(parcelId);
  }
  getSoilSample(id: string) {
    return this.requireSoilLaboratory().getSample(id);
  }
  getSoilAnalysis(sampleId: string) {
    return this.requireSoilLaboratory().getSoilAnalysis(sampleId);
  }
  createSoilSample(input: CreateSoilSampleInput) {
    return this.requireSoilLaboratory().createSample(input);
  }
  updateSoilSample(id: string, input: UpdateSoilSampleInput) {
    return this.requireSoilLaboratory().updateSample(id, input);
  }
  deleteSoilSample(id: string) {
    return this.requireSoilLaboratory().deleteSample(id);
  }
  validateSoilSample(sampleId: string) {
    return this.requireSoilLaboratory().validateSample(sampleId);
  }

  listSoilAnalysisResults(sampleId: string) {
    return this.requireSoilLaboratory().listResults(sampleId);
  }
  getSoilAnalysisResult(id: string) {
    return this.requireSoilLaboratory().getResult(id);
  }
  createSoilAnalysisResult(sampleId: string, input: CreateSoilAnalysisResultInput) {
    return this.requireSoilLaboratory().createResult(sampleId, input);
  }
  updateSoilAnalysisResult(id: string, input: UpdateSoilAnalysisResultInput) {
    return this.requireSoilLaboratory().updateResult(id, input);
  }
  deleteSoilAnalysisResult(id: string) {
    return this.requireSoilLaboratory().deleteResult(id);
  }

  // ---- Soil Parameter Catalog (Phase 2.2C) ----

  listSoilParameters() {
    return this.requireSoilLaboratory().catalog.listParameters(true);
  }
  getSoilParameter(id: string) {
    return this.requireSoilLaboratory().catalog.getParameter(id);
  }
  getSoilParameterByCode(code: string) {
    return this.requireSoilLaboratory().catalog.getParameterByCode(code);
  }
  createSoilParameter(input: CreateSoilParameterInput) {
    return this.requireSoilLaboratory().catalog.createParameter(input);
  }
  updateSoilParameter(id: string, input: UpdateSoilParameterInput) {
    return this.requireSoilLaboratory().catalog.updateParameter(id, input);
  }
  deleteSoilParameter(id: string) {
    return this.requireSoilLaboratory().catalog.deleteParameter(id);
  }
  listSoilUnits() {
    return this.requireSoilLaboratory().catalog.listUnits(true);
  }
  convertSoilUnit(input: UnitConvertInput) {
    return this.requireSoilLaboratory().catalog.convertUnit(input);
  }
  listSoilParameterAliases() {
    return this.requireSoilLaboratory().catalog.listAliases(true);
  }
  createSoilParameterAlias(input: CreateSoilParameterAliasInput) {
    return this.requireSoilLaboratory().catalog.createAlias(input);
  }
  updateSoilParameterAlias(id: string, input: UpdateSoilParameterAliasInput) {
    return this.requireSoilLaboratory().catalog.updateAlias(id, input);
  }
  normalizeSoilAnalysisResult(input: NormalizeAnalysisResultInput) {
    return this.requireSoilLaboratory().catalog.normalizePayload(input);
  }
  validateSoilAnalysisResultPayload(input: ValidateAnalysisResultInput) {
    return this.requireSoilLaboratory().catalog.validatePayload(input);
  }

  // ---- Laboratory Report Management (Phase 2.2D) ----

  listLaboratoryReports() {
    return this.requireSoilLaboratory().reports.listReports(true);
  }
  getLaboratoryReport(id: string) {
    return this.requireSoilLaboratory().reports.getReport(id);
  }
  getLaboratoryReportAggregate(id: string) {
    return this.requireSoilLaboratory().reports.getAggregate(id);
  }
  createLaboratoryReport(input: CreateLaboratoryReportInput) {
    return this.requireSoilLaboratory().reports.createReport(input);
  }
  updateLaboratoryReport(id: string, input: UpdateLaboratoryReportInput) {
    return this.requireSoilLaboratory().reports.updateReport(id, input);
  }
  deleteLaboratoryReport(id: string) {
    return this.requireSoilLaboratory().reports.deleteReport(id);
  }
  uploadLaboratoryReport(input: UploadLaboratoryReportInput) {
    return this.requireSoilLaboratory().reports.uploadReport(input);
  }
  listLaboratoryReportAttachments(reportId: string) {
    return this.requireSoilLaboratory().reports.listAttachments(reportId);
  }
  addLaboratoryApproval(reportId: string, input: CreateLaboratoryApprovalInput) {
    return this.requireSoilLaboratory().reports.addApproval(reportId, input);
  }

  // ---- Laboratory Import Engine (Phase 2.2E) ----

  listLaboratoryImportSessions() {
    return this.requireSoilLaboratory().imports.listSessions();
  }
  getLaboratoryImport(sessionId: string) {
    return this.requireSoilLaboratory().imports.getAggregate(sessionId);
  }
  uploadLaboratoryImport(input: UploadImportSessionInput) {
    return this.requireSoilLaboratory().imports.upload(input);
  }
  validateLaboratoryImport(sessionId: string, input: ValidateImportSessionInput) {
    return this.requireSoilLaboratory().imports.validate(sessionId, input);
  }
  previewLaboratoryImport(sessionId: string, input?: PreviewImportSessionInput) {
    return this.requireSoilLaboratory().imports.preview(sessionId, input);
  }
  commitLaboratoryImport(sessionId: string, input: CommitImportSessionInput) {
    return this.requireSoilLaboratory().imports.commitImport(sessionId, input);
  }
  listLaboratoryImportValidations(sessionId: string) {
    return this.requireSoilLaboratory().imports.listValidations(sessionId);
  }
  createLaboratoryImportMapping(input: CreateImportMappingInput) {
    return this.requireSoilLaboratory().imports.createMapping(input);
  }

  // ---- Soil Sampling Management (Phase 2.2F) ----

  listSamplingCampaigns() {
    return this.requireSoilSampling().listCampaigns();
  }
  getSamplingCampaign(id: string) {
    return this.requireSoilSampling().getCampaign(id);
  }
  getSoilSamplingAggregate(campaignId: string) {
    return this.requireSoilSampling().getAggregate(campaignId);
  }
  createSamplingCampaign(input: CreateSamplingCampaignInput) {
    return this.requireSoilSampling().createCampaign(input);
  }
  updateSamplingCampaign(id: string, input: UpdateSamplingCampaignInput) {
    return this.requireSoilSampling().updateCampaign(id, input);
  }
  deleteSamplingCampaign(id: string) {
    return this.requireSoilSampling().deleteCampaign(id);
  }

  listSamplingPoints(campaignId?: string) {
    return this.requireSoilSampling().listPoints(campaignId);
  }
  getSamplingPoint(id: string) {
    return this.requireSoilSampling().getPoint(id);
  }
  createSamplingPoint(input: CreateSamplingPointInput) {
    return this.requireSoilSampling().createPoint(input);
  }
  updateSamplingPoint(id: string, input: UpdateSamplingPointInput) {
    return this.requireSoilSampling().updatePoint(id, input);
  }
  deleteSamplingPoint(id: string) {
    return this.requireSoilSampling().deletePoint(id);
  }

  listSamplingSamples(samplingPointId?: string) {
    return this.requireSoilSampling().listSamples(samplingPointId);
  }
  getSamplingSample(id: string) {
    return this.requireSoilSampling().getSample(id);
  }
  createSamplingSample(input: CreateSamplingSoilSampleInput) {
    return this.requireSoilSampling().createSample(input);
  }
  updateSamplingSample(id: string, input: UpdateSamplingSoilSampleInput) {
    return this.requireSoilSampling().updateSample(id, input);
  }
  deleteSamplingSample(id: string) {
    return this.requireSoilSampling().deleteSample(id);
  }

  listSamplingObservations(samplingPointId?: string) {
    return this.requireSoilSampling().listObservations(samplingPointId);
  }
  getSamplingObservation(id: string) {
    return this.requireSoilSampling().getObservation(id);
  }
  createSamplingObservation(input: CreateSamplingObservationInput) {
    return this.requireSoilSampling().createObservation(input);
  }
  updateSamplingObservation(id: string, input: UpdateSamplingObservationInput) {
    return this.requireSoilSampling().updateObservation(id, input);
  }
  deleteSamplingObservation(id: string) {
    return this.requireSoilSampling().deleteObservation(id);
  }

  listChainOfCustody(sampleId: string) {
    return this.requireSoilSampling().listCustody(sampleId);
  }
  getChainOfCustody(id: string) {
    return this.requireSoilSampling().getCustody(id);
  }
  createChainOfCustody(input: CreateChainOfCustodyInput) {
    return this.requireSoilSampling().createCustody(input);
  }
  updateChainOfCustody(id: string, input: UpdateChainOfCustodyInput) {
    return this.requireSoilSampling().updateCustody(id, input);
  }
  deleteChainOfCustody(id: string) {
    return this.requireSoilSampling().deleteCustody(id);
  }

  // ---- Irrigation Water Laboratory (Phase 2.2G) ----

  listWaterSources(parcelId?: string) {
    return this.requireIrrigationWater().listWaterSources(parcelId);
  }
  getWaterSource(id: string) {
    return this.requireIrrigationWater().getWaterSource(id);
  }
  getIrrigationWaterAggregate(sourceId: string) {
    return this.requireIrrigationWater().getAggregate(sourceId);
  }
  createWaterSource(input: CreateWaterSourceInput) {
    return this.requireIrrigationWater().createWaterSource(input);
  }
  updateWaterSource(id: string, input: UpdateWaterSourceInput) {
    return this.requireIrrigationWater().updateWaterSource(id, input);
  }
  deleteWaterSource(id: string) {
    return this.requireIrrigationWater().deleteWaterSource(id);
  }

  listWaterSamples(waterSourceId?: string) {
    return this.requireIrrigationWater().listWaterSamples(waterSourceId);
  }
  getWaterSample(id: string) {
    return this.requireIrrigationWater().getWaterSample(id);
  }
  createWaterSample(input: CreateWaterSampleInput) {
    return this.requireIrrigationWater().createWaterSample(input);
  }
  updateWaterSample(id: string, input: UpdateWaterSampleInput) {
    return this.requireIrrigationWater().updateWaterSample(id, input);
  }
  updateWaterSampleStatus(id: string, input: UpdateWaterSampleStatusInput) {
    return this.requireIrrigationWater().updateWaterSampleStatus(id, input);
  }

  listWaterParameters() {
    return this.requireIrrigationWater().listWaterParameters();
  }
  getWaterParameter(id: string) {
    return this.requireIrrigationWater().getWaterParameter(id);
  }
  getWaterParameterByCode(code: string) {
    return this.requireIrrigationWater().getWaterParameterByCode(code);
  }
  createWaterParameter(input: CreateWaterParameterInput) {
    return this.requireIrrigationWater().createWaterParameter(input);
  }
  updateWaterParameter(id: string, input: UpdateWaterParameterInput) {
    return this.requireIrrigationWater().updateWaterParameter(id, input);
  }

  listWaterAnalysisResults(sampleId: string) {
    return this.requireIrrigationWater().listWaterAnalysisResults(sampleId);
  }
  createWaterAnalysisResult(input: CreateWaterAnalysisResultInput) {
    return this.requireIrrigationWater().createWaterAnalysisResult(input);
  }
  updateWaterAnalysisResult(id: string, input: UpdateWaterAnalysisResultInput) {
    return this.requireIrrigationWater().updateWaterAnalysisResult(id, input);
  }
  normalizeWaterAnalysisResult(input: NormalizeWaterAnalysisResultInput) {
    return this.requireIrrigationWater().normalizeWaterAnalysisResult(input);
  }
  validateWaterAnalysisResultPayload(input: CreateWaterAnalysisResultInput) {
    return this.requireIrrigationWater().validateWaterAnalysisResultPayload(input);
  }

  calculateWaterIndicators(sampleId: string) {
    return this.requireIrrigationWater().calculateIndicators(sampleId);
  }
  listWaterDerivedIndicators(sampleId: string) {
    return this.requireIrrigationWater().listDerivedIndicators(sampleId);
  }

  listWaterChainOfCustody(sampleId: string) {
    return this.requireIrrigationWater().listChainOfCustody(sampleId);
  }
  createWaterChainOfCustody(sampleId: string, input: CreateWaterCustodyInput) {
    return this.requireIrrigationWater().createChainOfCustody(sampleId, input);
  }

  // ---- Field Observation (Phase 2.2H) ----

  listFieldSurveys(parcelId?: string) {
    return this.requireFieldObservation().listSurveys(parcelId);
  }
  getFieldSurvey(id: string) {
    return this.requireFieldObservation().getSurvey(id);
  }
  getFieldSurveyAggregate(id: string) {
    return this.requireFieldObservation().getAggregate(id);
  }
  createFieldSurvey(input: CreateFieldSurveyInput) {
    return this.requireFieldObservation().createSurvey(input);
  }
  updateFieldSurvey(id: string, input: UpdateFieldSurveyInput) {
    return this.requireFieldObservation().updateSurvey(id, input);
  }
  startFieldSurvey(id: string, actor?: string) {
    return this.requireFieldObservation().startSurvey(id, actor);
  }
  completeFieldSurvey(id: string, actor?: string) {
    return this.requireFieldObservation().completeSurvey(id, actor);
  }
  submitFieldSurveyReview(id: string, actor?: string) {
    return this.requireFieldObservation().submitReview(id, actor);
  }

  listFieldObservationPoints(surveyId: string) {
    return this.requireFieldObservation().listPoints(surveyId);
  }
  createFieldObservationPoint(surveyId: string, input: CreateFieldObservationPointInput) {
    return this.requireFieldObservation().createPoint(surveyId, input);
  }
  updateFieldObservationPoint(id: string, input: UpdateFieldObservationPointInput) {
    return this.requireFieldObservation().updatePoint(id, input);
  }
  deleteFieldObservationPoint(id: string) {
    return this.requireFieldObservation().deletePoint(id);
  }

  listFieldParameters() {
    return this.requireFieldObservation().listParameters();
  }
  getFieldParameter(id: string) {
    return this.requireFieldObservation().getParameter(id);
  }
  getFieldParameterByCode(code: string) {
    return this.requireFieldObservation().getParameterByCode(code);
  }
  createFieldParameter(input: CreateFieldParameterInput) {
    return this.requireFieldObservation().createParameter(input);
  }
  updateFieldParameter(id: string, input: UpdateFieldParameterInput) {
    return this.requireFieldObservation().updateParameter(id, input);
  }

  listFieldObservationResults(surveyId: string) {
    return this.requireFieldObservation().listResults(surveyId);
  }
  createFieldObservationResult(input: CreateFieldObservationResultInput) {
    return this.requireFieldObservation().createResult(input);
  }
  updateFieldObservationResult(id: string, input: UpdateFieldObservationResultInput) {
    return this.requireFieldObservation().updateResult(id, input);
  }
  deleteFieldObservationResult(id: string) {
    return this.requireFieldObservation().deleteResult(id);
  }
  verifyFieldObservationResult(id: string, actor: string) {
    return this.requireFieldObservation().verifyResult(id, actor);
  }
  rejectFieldObservationResult(id: string, actor: string, notes?: string) {
    return this.requireFieldObservation().rejectResult(id, actor, notes);
  }

  uploadFieldEvidence(input: UploadFieldEvidenceInput) {
    return this.requireFieldObservation().uploadEvidence(input);
  }
  listFieldEvidence(surveyId: string) {
    return this.requireFieldObservation().listEvidence(surveyId);
  }
  deleteFieldEvidence(id: string) {
    return this.requireFieldObservation().deleteEvidence(id);
  }

  listFieldMeasurementDevices() {
    return this.requireFieldObservation().listDevices();
  }
  createFieldMeasurementDevice(input: CreateFieldDeviceInput) {
    return this.requireFieldObservation().createDevice(input);
  }
  updateFieldMeasurementDevice(id: string, input: UpdateFieldDeviceInput) {
    return this.requireFieldObservation().updateDevice(id, input);
  }
  createFieldDeviceMeasurement(input: CreateFieldDeviceMeasurementInput) {
    return this.requireFieldObservation().createDeviceMeasurement(input);
  }

  getFieldSurveyReview(surveyId: string) {
    return this.requireFieldObservation().getReview(surveyId);
  }
  createFieldSurveyReviewRecord(surveyId: string, input: CreateFieldSurveyReviewInput) {
    return this.requireFieldObservation().createReview(surveyId, input);
  }
  approveFieldSurvey(surveyId: string, input: ReviewActionInput) {
    return this.requireFieldObservation().approveSurvey(surveyId, input);
  }
  requestFieldSurveyRevision(surveyId: string, input: ReviewActionInput) {
    return this.requireFieldObservation().requestRevision(surveyId, input);
  }
  rejectFieldSurvey(surveyId: string, input: ReviewActionInput) {
    return this.requireFieldObservation().rejectSurvey(surveyId, input);
  }
  registerParcelGeometryForFieldCheck(parcelId: string, geometryJson: string) {
    return this.requireFieldObservation().registerParcelGeometry(parcelId, geometryJson);
  }

  // ---- AgroClimate Indicators Engine (Phase 2.3A) ----

  listAgroClimateIndicators() {
    return this.requireAgroClimate().listIndicators();
  }
  getAgroClimateIndicator(id: string) {
    return this.requireAgroClimate().getIndicator(id);
  }
  getAgroClimateIndicatorByCode(code: string) {
    return this.requireAgroClimate().getIndicatorByCode(code);
  }

  listClimateDataSources() {
    return this.requireAgroClimate().listDataSources();
  }
  createClimateDataSource(input: CreateClimateDataSourceInput) {
    return this.requireAgroClimate().createDataSource(input);
  }

  listClimateObservations(filter?: {
    parcelId?: string;
    dataSourceId?: string;
    parameterCode?: ParameterCode;
    startDate?: string;
    endDate?: string;
  }) {
    return this.requireAgroClimate().listObservations(filter);
  }
  createClimateObservation(input: CreateClimateObservationInput) {
    return this.requireAgroClimate().createObservation(input);
  }

  listAgroClimateConfigurations(indicatorId?: string) {
    return this.requireAgroClimate().listConfigurations(indicatorId);
  }
  createAgroClimateConfiguration(input: CreateCalculationConfigInput) {
    return this.requireAgroClimate().createConfiguration(input);
  }
  updateAgroClimateConfiguration(id: string, input: UpdateCalculationConfigInput) {
    return this.requireAgroClimate().updateConfiguration(id, input);
  }
  deleteAgroClimateConfiguration(id: string) {
    return this.requireAgroClimate().deleteConfiguration(id);
  }

  listAgroClimateAnalyses(parcelId?: string) {
    return this.requireAgroClimate().listAnalyses(parcelId);
  }
  getAgroClimateAnalysis(id: string) {
    return this.requireAgroClimate().getAnalysis(id);
  }
  createAgroClimateAnalysis(input: CreateAnalysisRunInput) {
    return this.requireAgroClimate().createAnalysis(input);
  }
  validateAgroClimateAnalysis(id: string) {
    return this.requireAgroClimate().validateAnalysis(id);
  }
  calculateAgroClimateAnalysis(id: string) {
    return this.requireAgroClimate().calculateAnalysis(id);
  }
  recalculateAgroClimateAnalysis(id: string) {
    return this.requireAgroClimate().recalculateAnalysis(id);
  }

  listAgroClimateResults(analysisId: string) {
    return this.requireAgroClimate().listResults(analysisId);
  }
  listParcelAgroClimateIndicators(parcelId: string, indicatorCode?: string) {
    return this.requireAgroClimate().listParcelIndicators(parcelId, indicatorCode);
  }

  createClimateSourceComparison(input: CreateSourceComparisonInput) {
    return this.requireAgroClimate().createSourceComparison(input);
  }
  listClimateSourceComparisons(parcelId: string) {
    return this.requireAgroClimate().listSourceComparisons(parcelId);
  }

  listScenarios(cropId?: string) {
    return this.repo.listScenarios(cropId);
  }

  listRegions() {
    return this.repo.listRegions();
  }

  listSourceReferences() {
    return this.repo.listSourceReferences();
  }

  async addSourceReference(body: Omit<SourceReference, 'id' | 'retrievedAt'> & { id?: string }) {
    const ref: SourceReference = {
      id: body.id ?? newId(),
      title: body.title,
      organization: body.organization ?? null,
      author: body.author ?? null,
      publicationYear: body.publicationYear ?? null,
      urlOrIdentifier: body.urlOrIdentifier ?? null,
      region: body.region ?? null,
      notes: body.notes ?? null,
      retrievedAt: new Date().toISOString(),
      verificationStatus: body.verificationStatus,
    };
    const saved = await this.repo.upsertSourceReference(ref);
    await this.repo.appendAudit({
      id: newId(),
      entityType: 'SourceReference',
      entityId: saved.id,
      action: 'upsert',
      actor: 'system',
      previousValue: null,
      newValue: saved,
      reason: null,
      version: null,
      createdAt: new Date().toISOString(),
    });
    return saved;
  }

  upsertRule(rule: CropCriterionRule, actor = 'system', reason?: string) {
    return this.matrix.upsertRule(rule, actor, reason);
  }

  deactivateRule(id: string, actor = 'system', reason?: string) {
    return this.matrix.deactivateRule(id, actor, reason);
  }

  resolveDataSource(criterionCode: string, candidates: DataSourceRecord[]) {
    return this.sources.resolve(criterionCode, candidates);
  }

  evaluateMissingData(input: Parameters<MissingDataEvaluationService['evaluate']>[0]) {
    return this.missingData.evaluate(input);
  }

  evaluateBarrier(rule: CriticalBarrierRule, observedValue: unknown) {
    return this.barriers.evaluateSingle(rule, observedValue);
  }

  validateCrop(cropId: string) {
    return this.validation.validate(cropId);
  }

  getRepository() {
    return this.repo;
  }
}
