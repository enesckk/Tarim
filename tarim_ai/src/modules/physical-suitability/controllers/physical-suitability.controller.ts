import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { PhysicalSuitabilityFacade } from '../services/physical-suitability.facade.js';
import { isApiError } from '../../../utils/api-error.js';
import { newId } from '../repositories/physical-suitability.repository.js';
import { upsertGeneralInformationSchema } from '../crop-knowledge/services/general-information-validation.service.js';
import {
  createGrowthStageSchema,
  updateGrowthStageSchema,
  upsertPhenologyStageSchema,
} from '../crop-knowledge/services/phenology-validation.service.js';
import {
  createClimateRequirementSchema,
  updateClimateRequirementSchema,
} from '../crop-knowledge/services/climate-requirements-validation.service.js';
import {
  createSoilRequirementSchema,
  updateSoilRequirementSchema,
} from '../crop-knowledge/services/soil-requirements-validation.service.js';
import {
  createWaterRequirementSchema,
  updateWaterRequirementSchema,
} from '../crop-knowledge/services/water-requirements-validation.service.js';
import {
  createTerrainRequirementSchema,
  updateTerrainRequirementSchema,
} from '../crop-knowledge/services/terrain-requirements-validation.service.js';
import {
  createCropRiskSchema,
  updateCropRiskSchema,
} from '../crop-knowledge/services/crop-risk-validation.service.js';
import {
  createProductionCalendarSchema,
  updateProductionCalendarSchema,
} from '../crop-knowledge/services/production-calendar-validation.service.js';
import {
  createScientificReferenceSchema,
  updateScientificReferenceSchema,
  linkScientificReferenceSchema,
} from '../crop-knowledge/services/scientific-reference-validation.service.js';
import {
  createLaboratorySchema,
  updateLaboratorySchema,
  createAnalysisMethodSchema,
  updateAnalysisMethodSchema,
  createSoilSampleSchema,
  updateSoilSampleSchema,
  createSoilAnalysisResultSchema,
  updateSoilAnalysisResultSchema,
} from '../soil-laboratory/services/soil-laboratory-validation.service.js';
import {
  createSoilParameterSchema,
  updateSoilParameterSchema,
  createSoilParameterAliasSchema,
  updateSoilParameterAliasSchema,
  unitConvertSchema,
  normalizeAnalysisResultSchema,
  validateAnalysisResultSchema,
} from '../soil-laboratory/services/soil-parameter-validation.service.js';
import {
  createLaboratoryReportSchema,
  updateLaboratoryReportSchema,
  uploadLaboratoryReportSchema,
} from '../soil-laboratory/services/laboratory-report-validation.service.js';
import {
  uploadImportSessionSchema,
  validateImportSessionSchema,
  previewImportSessionSchema,
  commitImportSessionSchema,
  createImportMappingSchema,
} from '../soil-laboratory/services/laboratory-import-validation.service.js';
import {
  createSamplingCampaignSchema,
  updateSamplingCampaignSchema,
  createSamplingPointSchema,
  updateSamplingPointSchema,
  createSamplingSoilSampleSchema,
  updateSamplingSoilSampleSchema,
  createSamplingObservationSchema,
  updateSamplingObservationSchema,
  createChainOfCustodySchema,
  updateChainOfCustodySchema,
} from '../soil-sampling/services/soil-sampling-validation.service.js';
import {
  createWaterSourceSchema,
  updateWaterSourceSchema,
  createWaterSampleSchema,
  updateWaterSampleSchema,
  updateWaterSampleStatusSchema,
  createWaterParameterSchema,
  updateWaterParameterSchema,
  createWaterAnalysisResultSchema,
  updateWaterAnalysisResultSchema,
  normalizeWaterAnalysisResultSchema,
  validateWaterAnalysisResultSchema,
  createWaterCustodySchema,
} from '../irrigation-water-laboratory/services/irrigation-water-validation.service.js';
import {
  createFieldSurveySchema,
  updateFieldSurveySchema,
  createFieldObservationPointSchema,
  updateFieldObservationPointSchema,
  createFieldParameterSchema,
  updateFieldParameterSchema,
  createFieldObservationResultSchema,
  updateFieldObservationResultSchema,
  uploadFieldEvidenceSchema,
  createFieldDeviceSchema,
  updateFieldDeviceSchema,
  createFieldDeviceMeasurementSchema,
  createFieldSurveyReviewSchema,
  reviewActionSchema,
} from '../field-observation/services/field-observation-validation.service.js';
import {
  createClimateDataSourceSchema,
  createClimateObservationSchema,
  createCalculationConfigSchema,
  updateCalculationConfigSchema,
  createAnalysisRunSchema,
  createSourceComparisonSchema,
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

function respondServiceError(
  res: Response,
  err: unknown,
): boolean {
  const e = err as { statusCode?: number; code?: string; message?: string; details?: unknown };
  if (e.statusCode) {
    res.status(e.statusCode).json({
      error: { code: e.code ?? 'ERROR', message: e.message ?? 'Error', details: e.details },
    });
    return true;
  }
  return false;
}

function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

export class PhysicalSuitabilityController {
  constructor(private readonly facade: PhysicalSuitabilityFacade) {}

  listCrops = asyncHandler(async (_req, res) => {
    const items = await this.facade.profiles.listCrops();
    res.json({ items, count: items.length });
  });

  getCrop = asyncHandler(async (req, res) => {
    const crop = await this.facade.profiles.getCrop(String(req.params.cropId));
    if (!crop) {
      res.status(404).json({ error: { code: 'CROP_NOT_FOUND', message: 'Crop not found' } });
      return;
    }
    const scenarios = await this.facade.listScenarios(crop.id);
    res.json({ crop, scenarios });
  });

  listScenarios = asyncHandler(async (req, res) => {
    const cropId = req.query.cropId ? String(req.query.cropId) : undefined;
    const items = await this.facade.listScenarios(cropId);
    res.json({ items, count: items.length });
  });

  listCriteria = asyncHandler(async (_req, res) => {
    const items = await this.facade.criteria.list();
    res.json({ items, count: items.length });
  });

  getDecisionMatrix = asyncHandler(async (req, res) => {
    const cropId = String(req.params.cropId);
    const scenarioId = String(req.query.productionScenarioId ?? '');
    if (!scenarioId) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'productionScenarioId is required' },
      });
      return;
    }
    const matrix = await this.facade.matrix.getMatrix(cropId, scenarioId);
    const conflicts = await this.facade.matrix.detectConflicts(cropId, scenarioId);
    res.json({ ...matrix, conflicts });
  });

  addRule = asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const rule = {
      id: typeof body.id === 'string' ? body.id : newId(),
      cropId: String(body.cropId),
      productionScenarioId: String(body.productionScenarioId),
      criterionDefinitionId: String(body.criterionDefinitionId),
      criterionCode: String(body.criterionCode),
      requirementLevel: body.requirementLevel as never,
      decisionRole: body.decisionRole as never,
      evaluationType: body.evaluationType as never,
      optimalRange: (body.optimalRange as never) ?? null,
      acceptableRange: (body.acceptableRange as never) ?? null,
      criticalMinimum: (body.criticalMinimum as number | null) ?? null,
      criticalMaximum: (body.criticalMaximum as number | null) ?? null,
      allowedValues: (body.allowedValues as string[] | null) ?? null,
      disallowedValues: (body.disallowedValues as string[] | null) ?? null,
      weightPlaceholder: (body.weightPlaceholder as number | null) ?? null,
      missingDataBehavior: body.missingDataBehavior as never,
      conditionExpression: (body.conditionExpression as string | null) ?? null,
      explanationTemplate: (body.explanationTemplate as string | null) ?? null,
      version: Number(body.version ?? 1),
      sourceReferenceId: (body.sourceReferenceId as string | null) ?? null,
      isActive: body.isActive !== false,
      verificationStatus: (body.verificationStatus as never) ?? 'Draft',
      notes: (body.notes as string | null) ?? null,
    };
    const saved = await this.facade.upsertRule(rule, String(body.actor ?? 'api'));
    res.status(201).json(saved);
  });

  updateRule = asyncHandler(async (req, res) => {
    const id = String(req.params.ruleId);
    const existing = await this.facade.getRepository().getRuleById(id);
    if (!existing) {
      res.status(404).json({ error: { code: 'RULE_NOT_FOUND', message: 'Rule not found' } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const merged = {
      ...existing,
      ...body,
      id,
      version: existing.version + 1,
    } as typeof existing;
    const saved = await this.facade.upsertRule(merged, String(body.actor ?? 'api'), 'update');
    res.json(saved);
  });

  deactivateRule = asyncHandler(async (req, res) => {
    const saved = await this.facade.deactivateRule(
      String(req.params.ruleId),
      String(req.body?.actor ?? 'api'),
      req.body?.reason,
    );
    res.json(saved);
  });

  addSourceReference = asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().min(1),
      organization: z.string().nullable().optional(),
      author: z.string().nullable().optional(),
      publicationYear: z.number().int().nullable().optional(),
      urlOrIdentifier: z.string().nullable().optional(),
      region: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      verificationStatus: z
        .enum(['Draft', 'SourceVerified', 'ExpertReviewed', 'Approved', 'Deprecated'])
        .default('Draft'),
    });
    const parsed = schema.parse(req.body);
    const saved = await this.facade.addSourceReference({
      title: parsed.title,
      organization: parsed.organization ?? null,
      author: parsed.author ?? null,
      publicationYear: parsed.publicationYear ?? null,
      urlOrIdentifier: parsed.urlOrIdentifier ?? null,
      region: parsed.region ?? null,
      notes: parsed.notes ?? null,
      verificationStatus: parsed.verificationStatus,
    });
    res.status(201).json(saved);
  });

  listSourceReferences = asyncHandler(async (_req, res) => {
    const items = await this.facade.listSourceReferences();
    res.json({ items, count: items.length });
  });

  validateCrop = asyncHandler(async (req, res) => {
    const result = await this.facade.validateCrop(String(req.params.cropId));
    res.status(result.valid ? 200 : 422).json(result);
  });

  /** Single critical-barrier evaluation helper for tests/admin. */
  evaluateBarrier = asyncHandler(async (req, res) => {
    const schema = z.object({
      ruleId: z.string().uuid(),
      observedValue: z.unknown(),
    });
    const parsed = schema.parse(req.body);
    const rules = await this.facade.getRepository().listBarrierRules({});
    const rule = rules.find((r) => r.id === parsed.ruleId);
    if (!rule) {
      res.status(404).json({ error: { code: 'BARRIER_NOT_FOUND', message: 'Barrier rule not found' } });
      return;
    }
    const result = this.facade.evaluateBarrier(rule, parsed.observedValue);
    res.json(result);
  });

  resolveDataSource = asyncHandler(async (req, res) => {
    const schema = z.object({
      criterionCode: z.string().min(1),
      candidates: z.array(z.record(z.unknown())).min(1),
    });
    const parsed = schema.parse(req.body);
    const result = await this.facade.resolveDataSource(
      parsed.criterionCode,
      parsed.candidates as never,
    );
    res.json(result);
  });

  evaluateMissingData = asyncHandler(async (req, res) => {
    const schema = z.object({
      criterionCode: z.string(),
      requirementLevel: z.enum(['Required', 'Important', 'Supporting']),
      missingDataBehavior: z.enum([
        'BlockEvaluation',
        'MarkInsufficientData',
        'ContinueWithReducedConfidence',
        'IgnoreForSuitability',
        'WarningOnly',
      ]),
      observedValue: z.unknown().optional(),
    });
    const parsed = schema.parse(req.body);
    const result = this.facade.evaluateMissingData({
      criterionCode: parsed.criterionCode,
      requirementLevel: parsed.requirementLevel,
      missingDataBehavior: parsed.missingDataBehavior,
      observedValue: parsed.observedValue ?? null,
    });
    res.json({ result });
  });

  // ---- Crop Knowledge Base / General Information ----

  listCropKnowledge = asyncHandler(async (_req, res) => {
    const items = await this.facade.listCropKnowledgeSummaries();
    res.json({ items, count: items.length });
  });

  getCropKnowledge = asyncHandler(async (req, res) => {
    const bundle = await this.facade.getCropKnowledgeBundle(String(req.params.cropKnowledgeId));
    if (!bundle) {
      res.status(404).json({
        error: { code: 'CROP_KNOWLEDGE_NOT_FOUND', message: 'Crop knowledge not found' },
      });
      return;
    }
    res.json(bundle);
  });

  getCropKnowledgeByCode = asyncHandler(async (req, res) => {
    const bundle = await this.facade.getCropKnowledgeByCode(String(req.params.cropCode));
    if (!bundle) {
      res.status(404).json({
        error: { code: 'CROP_KNOWLEDGE_NOT_FOUND', message: 'Crop knowledge not found' },
      });
      return;
    }
    res.json(bundle);
  });

  listGeneralInformation = asyncHandler(async (_req, res) => {
    const items = await this.facade.listGeneralInformation();
    res.json({ items, count: items.length });
  });

  getGeneralInformation = asyncHandler(async (req, res) => {
    const gi = await this.facade.getGeneralInformation(String(req.params.cropKnowledgeId));
    if (!gi) {
      res.status(404).json({
        error: {
          code: 'GENERAL_INFORMATION_NOT_FOUND',
          message: 'General Information not found',
        },
      });
      return;
    }
    res.json(gi);
  });

  getGeneralInformationByCode = asyncHandler(async (req, res) => {
    const gi = await this.facade.getGeneralInformationByCropCode(String(req.params.cropCode));
    if (!gi) {
      res.status(404).json({
        error: {
          code: 'GENERAL_INFORMATION_NOT_FOUND',
          message: 'General Information not found',
        },
      });
      return;
    }
    res.json(gi);
  });

  upsertGeneralInformation = asyncHandler(async (req, res) => {
    const parsed = upsertGeneralInformationSchema.parse(req.body);
    try {
      const saved = await this.facade.upsertGeneralInformation(
        String(req.params.cropKnowledgeId),
        parsed,
      );
      res.status(201).json(saved);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message?: string; details?: unknown };
      if (e.statusCode) {
        res.status(e.statusCode).json({
          error: { code: e.code ?? 'ERROR', message: e.message ?? 'Error', details: e.details },
        });
        return;
      }
      throw err;
    }
  });

  validateGeneralInformation = asyncHandler(async (req, res) => {
    const result = await this.facade.validateGeneralInformation(
      String(req.params.cropKnowledgeId),
    );
    res.status(result.valid ? 200 : 422).json(result);
  });

  // ---- Phenology Engine (Phase 2.1B) ----

  getPhenology = asyncHandler(async (req, res) => {
    const dto = await this.facade.getPhenology(String(req.params.cropKnowledgeId));
    if (!dto) {
      res.status(404).json({
        error: { code: 'PHENOLOGY_NOT_FOUND', message: 'Phenology not found' },
      });
      return;
    }
    res.json(dto);
  });

  getPhenologyByCode = asyncHandler(async (req, res) => {
    const dto = await this.facade.getPhenologyByCropCode(String(req.params.cropCode));
    if (!dto) {
      res.status(404).json({
        error: { code: 'PHENOLOGY_NOT_FOUND', message: 'Phenology not found' },
      });
      return;
    }
    res.json(dto);
  });

  listGrowthStages = asyncHandler(async (req, res) => {
    const items = await this.facade.listGrowthStages(String(req.params.cropKnowledgeId));
    res.json({ items, count: items.length });
  });

  getGrowthStageDetails = asyncHandler(async (req, res) => {
    const stage = await this.facade.getGrowthStageDetails(String(req.params.stageId));
    if (!stage || stage.cropKnowledgeId !== String(req.params.cropKnowledgeId)) {
      res.status(404).json({
        error: { code: 'GROWTH_STAGE_NOT_FOUND', message: 'Growth stage not found' },
      });
      return;
    }
    res.json(stage);
  });

  createGrowthStage = asyncHandler(async (req, res) => {
    const parsed = createGrowthStageSchema.parse(req.body);
    try {
      const saved = await this.facade.createGrowthStage(
        String(req.params.cropKnowledgeId),
        parsed,
      );
      res.status(201).json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateGrowthStage = asyncHandler(async (req, res) => {
    const parsed = updateGrowthStageSchema.parse(req.body);
    try {
      const saved = await this.facade.updateGrowthStage(
        String(req.params.cropKnowledgeId),
        String(req.params.stageId),
        parsed,
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteGrowthStage = asyncHandler(async (req, res) => {
    try {
      const saved = await this.facade.deleteGrowthStage(
        String(req.params.cropKnowledgeId),
        String(req.params.stageId),
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listPhenologyStages = asyncHandler(async (req, res) => {
    const items = await this.facade.listGrowthStages(String(req.params.cropKnowledgeId));
    res.json({ items, count: items.length });
  });

  getPhenologyStage = asyncHandler(async (req, res) => {
    const code = String(req.params.stageCode) as GrowthStageCode;
    const stage = await this.facade.getPhenologyStageByCode(
      String(req.params.cropKnowledgeId),
      code,
    );
    if (!stage) {
      res.status(404).json({
        error: { code: 'PHENOLOGY_STAGE_NOT_FOUND', message: 'Phenology stage not found' },
      });
      return;
    }
    res.json(stage);
  });

  upsertPhenologyStage = asyncHandler(async (req, res) => {
    const parsed = upsertPhenologyStageSchema.parse(req.body);
    try {
      const saved = await this.facade.upsertPhenologyStage(
        String(req.params.cropKnowledgeId),
        parsed,
      );
      res.status(201).json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validatePhenology = asyncHandler(async (req, res) => {
    const result = await this.facade.validatePhenology(String(req.params.cropKnowledgeId));
    res.status(result.valid ? 200 : 422).json(result);
  });

  // ---- Climate Requirements (Phase 2.1C) ----

  getClimateRequirements = asyncHandler(async (req, res) => {
    const dto = await this.facade.getClimateRequirementsAggregate(
      String(req.params.cropKnowledgeId),
    );
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'CLIMATE_REQUIREMENTS_NOT_FOUND',
          message: 'Climate requirements not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  getClimateRequirementsByCode = asyncHandler(async (req, res) => {
    const dto = await this.facade.getClimateRequirementsByCropCode(String(req.params.cropCode));
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'CLIMATE_REQUIREMENTS_NOT_FOUND',
          message: 'Climate requirements not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  listClimateRequirements = asyncHandler(async (req, res) => {
    const items = await this.facade.listClimateRequirements(String(req.params.cropKnowledgeId));
    res.json({ items, count: items.length });
  });

  getClimateRequirementDetails = asyncHandler(async (req, res) => {
    const row = await this.facade.getClimateRequirementDetails(String(req.params.requirementId));
    if (!row || row.cropKnowledgeId !== String(req.params.cropKnowledgeId)) {
      res.status(404).json({
        error: {
          code: 'CLIMATE_REQUIREMENT_NOT_FOUND',
          message: 'Climate requirement not found',
        },
      });
      return;
    }
    res.json(row);
  });

  getClimateRequirementByFactor = asyncHandler(async (req, res) => {
    const factor = String(req.params.climateFactor) as ClimateFactor;
    const row = await this.facade.getClimateRequirementByFactor(
      String(req.params.cropKnowledgeId),
      factor,
    );
    if (!row) {
      res.status(404).json({
        error: {
          code: 'CLIMATE_REQUIREMENT_NOT_FOUND',
          message: 'Climate requirement not found',
        },
      });
      return;
    }
    res.json(row);
  });

  createClimateRequirement = asyncHandler(async (req, res) => {
    const parsed = createClimateRequirementSchema.parse(req.body);
    try {
      const saved = await this.facade.createClimateRequirement(
        String(req.params.cropKnowledgeId),
        parsed,
      );
      res.status(201).json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateClimateRequirement = asyncHandler(async (req, res) => {
    const parsed = updateClimateRequirementSchema.parse(req.body);
    try {
      const saved = await this.facade.updateClimateRequirement(
        String(req.params.cropKnowledgeId),
        String(req.params.requirementId),
        parsed,
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteClimateRequirement = asyncHandler(async (req, res) => {
    try {
      const saved = await this.facade.deleteClimateRequirement(
        String(req.params.cropKnowledgeId),
        String(req.params.requirementId),
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateClimateRequirements = asyncHandler(async (req, res) => {
    const result = await this.facade.validateClimateRequirements(
      String(req.params.cropKnowledgeId),
    );
    res.status(result.valid ? 200 : 422).json(result);
  });

  // ---- Soil Requirements (Phase 2.1D) ----

  getSoilRequirements = asyncHandler(async (req, res) => {
    const dto = await this.facade.getSoilRequirementsAggregate(
      String(req.params.cropKnowledgeId),
    );
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'SOIL_REQUIREMENTS_NOT_FOUND',
          message: 'Soil requirements not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  getSoilRequirementsByCode = asyncHandler(async (req, res) => {
    const dto = await this.facade.getSoilRequirementsByCropCode(String(req.params.cropCode));
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'SOIL_REQUIREMENTS_NOT_FOUND',
          message: 'Soil requirements not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  listSoilRequirements = asyncHandler(async (req, res) => {
    const items = await this.facade.listSoilRequirements(String(req.params.cropKnowledgeId));
    res.json({ items, count: items.length });
  });

  getSoilRequirementDetails = asyncHandler(async (req, res) => {
    const row = await this.facade.getSoilRequirementDetails(String(req.params.requirementId));
    if (!row || row.cropKnowledgeId !== String(req.params.cropKnowledgeId)) {
      res.status(404).json({
        error: {
          code: 'SOIL_REQUIREMENT_NOT_FOUND',
          message: 'Soil requirement not found',
        },
      });
      return;
    }
    res.json(row);
  });

  getSoilRequirementByFactor = asyncHandler(async (req, res) => {
    const factor = String(req.params.soilFactor) as SoilFactor;
    const row = await this.facade.getSoilRequirementByFactor(
      String(req.params.cropKnowledgeId),
      factor,
    );
    if (!row) {
      res.status(404).json({
        error: {
          code: 'SOIL_REQUIREMENT_NOT_FOUND',
          message: 'Soil requirement not found',
        },
      });
      return;
    }
    res.json(row);
  });

  createSoilRequirement = asyncHandler(async (req, res) => {
    const parsed = createSoilRequirementSchema.parse(req.body);
    try {
      const saved = await this.facade.createSoilRequirement(
        String(req.params.cropKnowledgeId),
        parsed,
      );
      res.status(201).json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateSoilRequirement = asyncHandler(async (req, res) => {
    const parsed = updateSoilRequirementSchema.parse(req.body);
    try {
      const saved = await this.facade.updateSoilRequirement(
        String(req.params.cropKnowledgeId),
        String(req.params.requirementId),
        parsed,
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteSoilRequirement = asyncHandler(async (req, res) => {
    try {
      const saved = await this.facade.deleteSoilRequirement(
        String(req.params.cropKnowledgeId),
        String(req.params.requirementId),
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateSoilRequirements = asyncHandler(async (req, res) => {
    const result = await this.facade.validateSoilRequirements(
      String(req.params.cropKnowledgeId),
    );
    res.status(result.valid ? 200 : 422).json(result);
  });

  // ---- Water Requirements (Phase 2.1E) ----

  getWaterRequirements = asyncHandler(async (req, res) => {
    const dto = await this.facade.getWaterRequirementsAggregate(
      String(req.params.cropKnowledgeId),
    );
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'WATER_REQUIREMENTS_NOT_FOUND',
          message: 'Water requirements not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  getWaterRequirementsByCode = asyncHandler(async (req, res) => {
    const dto = await this.facade.getWaterRequirementsByCropCode(String(req.params.cropCode));
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'WATER_REQUIREMENTS_NOT_FOUND',
          message: 'Water requirements not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  listWaterRequirements = asyncHandler(async (req, res) => {
    const items = await this.facade.listWaterRequirements(String(req.params.cropKnowledgeId));
    res.json({ items, count: items.length });
  });

  getWaterRequirementDetails = asyncHandler(async (req, res) => {
    const row = await this.facade.getWaterRequirementDetails(String(req.params.requirementId));
    if (!row || row.cropKnowledgeId !== String(req.params.cropKnowledgeId)) {
      res.status(404).json({
        error: {
          code: 'WATER_REQUIREMENT_NOT_FOUND',
          message: 'Water requirement not found',
        },
      });
      return;
    }
    res.json(row);
  });

  getWaterRequirementByFactor = asyncHandler(async (req, res) => {
    const factor = String(req.params.waterFactor) as WaterFactor;
    const row = await this.facade.getWaterRequirementByFactor(
      String(req.params.cropKnowledgeId),
      factor,
    );
    if (!row) {
      res.status(404).json({
        error: {
          code: 'WATER_REQUIREMENT_NOT_FOUND',
          message: 'Water requirement not found',
        },
      });
      return;
    }
    res.json(row);
  });

  createWaterRequirement = asyncHandler(async (req, res) => {
    const parsed = createWaterRequirementSchema.parse(req.body);
    try {
      const saved = await this.facade.createWaterRequirement(
        String(req.params.cropKnowledgeId),
        parsed,
      );
      res.status(201).json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateWaterRequirement = asyncHandler(async (req, res) => {
    const parsed = updateWaterRequirementSchema.parse(req.body);
    try {
      const saved = await this.facade.updateWaterRequirement(
        String(req.params.cropKnowledgeId),
        String(req.params.requirementId),
        parsed,
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteWaterRequirement = asyncHandler(async (req, res) => {
    try {
      const saved = await this.facade.deleteWaterRequirement(
        String(req.params.cropKnowledgeId),
        String(req.params.requirementId),
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateWaterRequirements = asyncHandler(async (req, res) => {
    const result = await this.facade.validateWaterRequirements(
      String(req.params.cropKnowledgeId),
    );
    res.status(result.valid ? 200 : 422).json(result);
  });

  // ---- Terrain Requirements (Phase 2.1F) ----

  getTerrainRequirements = asyncHandler(async (req, res) => {
    const dto = await this.facade.getTerrainRequirementsAggregate(
      String(req.params.cropKnowledgeId),
    );
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'TERRAIN_REQUIREMENTS_NOT_FOUND',
          message: 'Terrain requirements not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  getTerrainRequirementsByCode = asyncHandler(async (req, res) => {
    const dto = await this.facade.getTerrainRequirementsByCropCode(String(req.params.cropCode));
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'TERRAIN_REQUIREMENTS_NOT_FOUND',
          message: 'Terrain requirements not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  listTerrainRequirements = asyncHandler(async (req, res) => {
    const items = await this.facade.listTerrainRequirements(String(req.params.cropKnowledgeId));
    res.json({ items, count: items.length });
  });

  getTerrainRequirementDetails = asyncHandler(async (req, res) => {
    const row = await this.facade.getTerrainRequirementDetails(String(req.params.requirementId));
    if (!row || row.cropKnowledgeId !== String(req.params.cropKnowledgeId)) {
      res.status(404).json({
        error: {
          code: 'TERRAIN_REQUIREMENT_NOT_FOUND',
          message: 'Terrain requirement not found',
        },
      });
      return;
    }
    res.json(row);
  });

  getTerrainRequirementByFactor = asyncHandler(async (req, res) => {
    const factor = String(req.params.terrainFactor) as TerrainFactor;
    const row = await this.facade.getTerrainRequirementByFactor(
      String(req.params.cropKnowledgeId),
      factor,
    );
    if (!row) {
      res.status(404).json({
        error: {
          code: 'TERRAIN_REQUIREMENT_NOT_FOUND',
          message: 'Terrain requirement not found',
        },
      });
      return;
    }
    res.json(row);
  });

  createTerrainRequirement = asyncHandler(async (req, res) => {
    const parsed = createTerrainRequirementSchema.parse(req.body);
    try {
      const saved = await this.facade.createTerrainRequirement(
        String(req.params.cropKnowledgeId),
        parsed,
      );
      res.status(201).json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateTerrainRequirement = asyncHandler(async (req, res) => {
    const parsed = updateTerrainRequirementSchema.parse(req.body);
    try {
      const saved = await this.facade.updateTerrainRequirement(
        String(req.params.cropKnowledgeId),
        String(req.params.requirementId),
        parsed,
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteTerrainRequirement = asyncHandler(async (req, res) => {
    try {
      const saved = await this.facade.deleteTerrainRequirement(
        String(req.params.cropKnowledgeId),
        String(req.params.requirementId),
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateTerrainRequirements = asyncHandler(async (req, res) => {
    const result = await this.facade.validateTerrainRequirements(
      String(req.params.cropKnowledgeId),
    );
    res.status(result.valid ? 200 : 422).json(result);
  });

  // ---- Risk Profile (Phase 2.1G) ----

  getRiskProfile = asyncHandler(async (req, res) => {
    const dto = await this.facade.getRiskProfileAggregate(String(req.params.cropKnowledgeId));
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'RISK_PROFILE_NOT_FOUND',
          message: 'Risk profile not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  getRiskProfileByCode = asyncHandler(async (req, res) => {
    const dto = await this.facade.getRiskProfileByCropCode(String(req.params.cropCode));
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'RISK_PROFILE_NOT_FOUND',
          message: 'Risk profile not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  listCropRisks = asyncHandler(async (req, res) => {
    const items = await this.facade.listCropRisks(String(req.params.cropKnowledgeId));
    res.json({ items, count: items.length });
  });

  getCropRiskDetails = asyncHandler(async (req, res) => {
    const row = await this.facade.getCropRiskDetails(String(req.params.riskId));
    if (!row || row.cropKnowledgeId !== String(req.params.cropKnowledgeId)) {
      res.status(404).json({
        error: {
          code: 'CROP_RISK_NOT_FOUND',
          message: 'Crop risk not found',
        },
      });
      return;
    }
    res.json(row);
  });

  getCropRiskByType = asyncHandler(async (req, res) => {
    const riskType = String(req.params.riskType) as RiskType;
    const row = await this.facade.getCropRiskByType(String(req.params.cropKnowledgeId), riskType);
    if (!row) {
      res.status(404).json({
        error: {
          code: 'CROP_RISK_NOT_FOUND',
          message: 'Crop risk not found',
        },
      });
      return;
    }
    res.json(row);
  });

  createCropRisk = asyncHandler(async (req, res) => {
    const parsed = createCropRiskSchema.parse(req.body);
    try {
      const saved = await this.facade.createCropRisk(String(req.params.cropKnowledgeId), parsed);
      res.status(201).json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateCropRisk = asyncHandler(async (req, res) => {
    const parsed = updateCropRiskSchema.parse(req.body);
    try {
      const saved = await this.facade.updateCropRisk(
        String(req.params.cropKnowledgeId),
        String(req.params.riskId),
        parsed,
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteCropRisk = asyncHandler(async (req, res) => {
    try {
      const saved = await this.facade.deleteCropRisk(
        String(req.params.cropKnowledgeId),
        String(req.params.riskId),
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateRiskProfile = asyncHandler(async (req, res) => {
    const result = await this.facade.validateRiskProfile(String(req.params.cropKnowledgeId));
    res.status(result.valid ? 200 : 422).json(result);
  });

  // ---- Production Calendar (Phase 2.1H) ----

  getProductionCalendar = asyncHandler(async (req, res) => {
    const dto = await this.facade.getProductionCalendarAggregate(
      String(req.params.cropKnowledgeId),
    );
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'PRODUCTION_CALENDAR_NOT_FOUND',
          message: 'Production calendar not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  getProductionCalendarByCode = asyncHandler(async (req, res) => {
    const dto = await this.facade.getProductionCalendarByCropCode(String(req.params.cropCode));
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'PRODUCTION_CALENDAR_NOT_FOUND',
          message: 'Production calendar not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  listProductionCalendars = asyncHandler(async (req, res) => {
    const items = await this.facade.listProductionCalendars(String(req.params.cropKnowledgeId));
    res.json({ items, count: items.length });
  });

  getProductionCalendarDetails = asyncHandler(async (req, res) => {
    const row = await this.facade.getProductionCalendarDetails(String(req.params.calendarId));
    if (!row || row.cropKnowledgeId !== String(req.params.cropKnowledgeId)) {
      res.status(404).json({
        error: {
          code: 'PRODUCTION_CALENDAR_ENTRY_NOT_FOUND',
          message: 'Production calendar entry not found',
        },
      });
      return;
    }
    res.json(row);
  });

  getProductionCalendarByRegion = asyncHandler(async (req, res) => {
    const row = await this.facade.getProductionCalendarByRegionId(
      String(req.params.cropKnowledgeId),
      String(req.params.regionId),
    );
    if (!row) {
      res.status(404).json({
        error: {
          code: 'PRODUCTION_CALENDAR_ENTRY_NOT_FOUND',
          message: 'Production calendar entry not found',
        },
      });
      return;
    }
    res.json(row);
  });

  createProductionCalendar = asyncHandler(async (req, res) => {
    const parsed = createProductionCalendarSchema.parse(req.body);
    try {
      const saved = await this.facade.createProductionCalendarItem(
        String(req.params.cropKnowledgeId),
        parsed,
      );
      res.status(201).json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateProductionCalendar = asyncHandler(async (req, res) => {
    const parsed = updateProductionCalendarSchema.parse(req.body);
    try {
      const saved = await this.facade.updateProductionCalendarItem(
        String(req.params.cropKnowledgeId),
        String(req.params.calendarId),
        parsed,
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteProductionCalendar = asyncHandler(async (req, res) => {
    try {
      const saved = await this.facade.deleteProductionCalendarItem(
        String(req.params.cropKnowledgeId),
        String(req.params.calendarId),
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateProductionCalendar = asyncHandler(async (req, res) => {
    const result = await this.facade.validateProductionCalendar(
      String(req.params.cropKnowledgeId),
    );
    res.status(result.valid ? 200 : 422).json(result);
  });

  // ---- Scientific Reference Library (Phase 2.1I) ----

  listScientificReferences = asyncHandler(async (_req, res) => {
    const items = await this.facade.listScientificReferences(true);
    res.json({ items, count: items.length });
  });

  getScientificReferenceDetails = asyncHandler(async (req, res) => {
    const row = await this.facade.getScientificReferenceDetails(String(req.params.referenceId));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: {
          code: 'SCIENTIFIC_REFERENCE_NOT_FOUND',
          message: 'Scientific reference not found',
        },
      });
      return;
    }
    res.json(row);
  });

  createScientificReference = asyncHandler(async (req, res) => {
    const parsed = createScientificReferenceSchema.parse(req.body);
    try {
      const saved = await this.facade.createScientificReference(parsed);
      res.status(201).json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateScientificReference = asyncHandler(async (req, res) => {
    const parsed = updateScientificReferenceSchema.parse(req.body);
    try {
      const saved = await this.facade.updateScientificReference(
        String(req.params.referenceId),
        parsed,
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteScientificReference = asyncHandler(async (req, res) => {
    try {
      const saved = await this.facade.deleteScientificReference(String(req.params.referenceId));
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateScientificReference = asyncHandler(async (req, res) => {
    const result = await this.facade.validateScientificReference(String(req.params.referenceId));
    res.status(result.valid ? 200 : 422).json(result);
  });

  getCropReferences = asyncHandler(async (req, res) => {
    const dto = await this.facade.getCropReferencesAggregate(String(req.params.cropKnowledgeId));
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'CROP_REFERENCES_NOT_FOUND',
          message: 'Crop references not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  getCropReferencesByCode = asyncHandler(async (req, res) => {
    const dto = await this.facade.getCropReferencesByCropCode(String(req.params.cropCode));
    if (!dto) {
      res.status(404).json({
        error: {
          code: 'CROP_REFERENCES_NOT_FOUND',
          message: 'Crop references not found',
        },
      });
      return;
    }
    res.json(dto);
  });

  listCropScientificReferences = asyncHandler(async (req, res) => {
    const items = await this.facade.listCropScientificReferences(
      String(req.params.cropKnowledgeId),
    );
    res.json({ items, count: items.length });
  });

  linkScientificReference = asyncHandler(async (req, res) => {
    const parsed = linkScientificReferenceSchema.parse(req.body);
    try {
      const saved = await this.facade.linkScientificReference(
        String(req.params.cropKnowledgeId),
        parsed.scientificReferenceId,
      );
      res.status(201).json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  unlinkScientificReference = asyncHandler(async (req, res) => {
    try {
      const saved = await this.facade.unlinkScientificReference(
        String(req.params.cropKnowledgeId),
        String(req.params.referenceId),
      );
      res.json(saved);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateCropScientificReferences = asyncHandler(async (req, res) => {
    const result = await this.facade.validateCropScientificReferences(
      String(req.params.cropKnowledgeId),
    );
    res.status(result.valid ? 200 : 422).json(result);
  });

  // ---- Soil Laboratory (Phase 2.2A) ----

  listLaboratories = asyncHandler(async (_req, res) => {
    const items = await this.facade.listLaboratories();
    res.json({ items, count: items.length });
  });

  getLaboratory = asyncHandler(async (req, res) => {
    const row = await this.facade.getLaboratory(String(req.params.laboratoryId));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'LABORATORY_NOT_FOUND', message: 'Laboratory not found' },
      });
      return;
    }
    res.json(row);
  });

  createLaboratory = asyncHandler(async (req, res) => {
    const parsed = createLaboratorySchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createLaboratory(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateLaboratory = asyncHandler(async (req, res) => {
    const parsed = updateLaboratorySchema.parse(req.body);
    try {
      res.json(await this.facade.updateLaboratory(String(req.params.laboratoryId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteLaboratory = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteLaboratory(String(req.params.laboratoryId)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listAnalysisMethods = asyncHandler(async (_req, res) => {
    const items = await this.facade.listAnalysisMethods();
    res.json({ items, count: items.length });
  });

  getAnalysisMethod = asyncHandler(async (req, res) => {
    const row = await this.facade.getAnalysisMethod(String(req.params.methodId));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'ANALYSIS_METHOD_NOT_FOUND', message: 'AnalysisMethod not found' },
      });
      return;
    }
    res.json(row);
  });

  createAnalysisMethod = asyncHandler(async (req, res) => {
    const parsed = createAnalysisMethodSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createAnalysisMethod(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateAnalysisMethod = asyncHandler(async (req, res) => {
    const parsed = updateAnalysisMethodSchema.parse(req.body);
    try {
      res.json(await this.facade.updateAnalysisMethod(String(req.params.methodId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteAnalysisMethod = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteAnalysisMethod(String(req.params.methodId)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listSoilSamples = asyncHandler(async (_req, res) => {
    const items = await this.facade.listSoilSamples();
    res.json({ items, count: items.length });
  });

  listSoilSamplesByParcel = asyncHandler(async (req, res) => {
    const items = await this.facade.listSoilSamplesByParcel(String(req.params.parcelId));
    res.json({ items, count: items.length });
  });

  getSoilSample = asyncHandler(async (req, res) => {
    const row = await this.facade.getSoilSample(String(req.params.sampleId));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'SOIL_SAMPLE_NOT_FOUND', message: 'Soil sample not found' },
      });
      return;
    }
    res.json(row);
  });

  getSoilAnalysis = asyncHandler(async (req, res) => {
    const dto = await this.facade.getSoilAnalysis(String(req.params.sampleId));
    if (!dto) {
      res.status(404).json({
        error: { code: 'SOIL_ANALYSIS_NOT_FOUND', message: 'Soil analysis not found' },
      });
      return;
    }
    res.json(dto);
  });

  createSoilSample = asyncHandler(async (req, res) => {
    const parsed = createSoilSampleSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createSoilSample(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateSoilSample = asyncHandler(async (req, res) => {
    const parsed = updateSoilSampleSchema.parse(req.body);
    try {
      res.json(await this.facade.updateSoilSample(String(req.params.sampleId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteSoilSample = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteSoilSample(String(req.params.sampleId)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateSoilSample = asyncHandler(async (req, res) => {
    const result = await this.facade.validateSoilSample(String(req.params.sampleId));
    res.status(result.valid ? 200 : 422).json(result);
  });

  listSoilAnalysisResults = asyncHandler(async (req, res) => {
    const items = await this.facade.listSoilAnalysisResults(String(req.params.sampleId));
    res.json({ items, count: items.length });
  });

  getSoilAnalysisResult = asyncHandler(async (req, res) => {
    const row = await this.facade.getSoilAnalysisResult(String(req.params.resultId));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: {
          code: 'SOIL_ANALYSIS_RESULT_NOT_FOUND',
          message: 'Soil analysis result not found',
        },
      });
      return;
    }
    res.json(row);
  });

  createSoilAnalysisResult = asyncHandler(async (req, res) => {
    const parsed = createSoilAnalysisResultSchema.parse(req.body);
    try {
      res
        .status(201)
        .json(await this.facade.createSoilAnalysisResult(String(req.params.sampleId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateSoilAnalysisResult = asyncHandler(async (req, res) => {
    const parsed = updateSoilAnalysisResultSchema.parse(req.body);
    try {
      res.json(await this.facade.updateSoilAnalysisResult(String(req.params.resultId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteSoilAnalysisResult = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteSoilAnalysisResult(String(req.params.resultId)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  // ---- Soil Parameter Catalog (Phase 2.2C) ----

  listSoilParameters = asyncHandler(async (_req, res) => {
    const items = await this.facade.listSoilParameters();
    res.json({ items, count: items.length });
  });

  getSoilParameter = asyncHandler(async (req, res) => {
    const row = await this.facade.getSoilParameter(String(req.params.parameterId));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'SOIL_PARAMETER_NOT_FOUND', message: 'SoilParameter not found' },
      });
      return;
    }
    res.json(row);
  });

  getSoilParameterByCode = asyncHandler(async (req, res) => {
    const row = await this.facade.getSoilParameterByCode(String(req.params.code));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'SOIL_PARAMETER_NOT_FOUND', message: 'SoilParameter not found' },
      });
      return;
    }
    res.json(row);
  });

  createSoilParameter = asyncHandler(async (req, res) => {
    const parsed = createSoilParameterSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createSoilParameter(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateSoilParameter = asyncHandler(async (req, res) => {
    const parsed = updateSoilParameterSchema.parse(req.body);
    try {
      res.json(await this.facade.updateSoilParameter(String(req.params.parameterId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteSoilParameter = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteSoilParameter(String(req.params.parameterId)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listSoilUnits = asyncHandler(async (_req, res) => {
    const items = await this.facade.listSoilUnits();
    res.json({ items, count: items.length });
  });

  convertSoilUnit = asyncHandler(async (req, res) => {
    const parsed = unitConvertSchema.parse(req.body);
    const result = await this.facade.convertSoilUnit(parsed);
    res.status(result.ok ? 200 : 422).json(result);
  });

  listSoilParameterAliases = asyncHandler(async (_req, res) => {
    const items = await this.facade.listSoilParameterAliases();
    res.json({ items, count: items.length });
  });

  createSoilParameterAlias = asyncHandler(async (req, res) => {
    const parsed = createSoilParameterAliasSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createSoilParameterAlias(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateSoilParameterAlias = asyncHandler(async (req, res) => {
    const parsed = updateSoilParameterAliasSchema.parse(req.body);
    try {
      res.json(
        await this.facade.updateSoilParameterAlias(String(req.params.aliasId), parsed),
      );
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  normalizeSoilAnalysisResult = asyncHandler(async (req, res) => {
    const parsed = normalizeAnalysisResultSchema.parse(req.body);
    try {
      res.json(await this.facade.normalizeSoilAnalysisResult(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateSoilAnalysisResultPayload = asyncHandler(async (req, res) => {
    const parsed = validateAnalysisResultSchema.parse(req.body);
    try {
      const result = await this.facade.validateSoilAnalysisResultPayload(parsed);
      res.status(result.valid ? 200 : 422).json(result);
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  // ---- Laboratory Report Management (Phase 2.2D) ----

  listLaboratoryReports = asyncHandler(async (_req, res) => {
    const items = await this.facade.listLaboratoryReports();
    res.json({ items, count: items.length });
  });

  getLaboratoryReport = asyncHandler(async (req, res) => {
    const aggregate = await this.facade.getLaboratoryReportAggregate(
      String(req.params.reportId),
    );
    if (!aggregate || !aggregate.report.isActive) {
      res.status(404).json({
        error: { code: 'LABORATORY_REPORT_NOT_FOUND', message: 'Laboratory report not found' },
      });
      return;
    }
    res.json(aggregate);
  });

  createLaboratoryReport = asyncHandler(async (req, res) => {
    const parsed = createLaboratoryReportSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createLaboratoryReport(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateLaboratoryReport = asyncHandler(async (req, res) => {
    const parsed = updateLaboratoryReportSchema.parse(req.body);
    try {
      res.json(await this.facade.updateLaboratoryReport(String(req.params.reportId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteLaboratoryReport = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteLaboratoryReport(String(req.params.reportId)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  uploadLaboratoryReport = asyncHandler(async (req, res) => {
    const parsed = uploadLaboratoryReportSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.uploadLaboratoryReport(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listLaboratoryReportAttachments = asyncHandler(async (req, res) => {
    const report = await this.facade.getLaboratoryReport(String(req.params.reportId));
    if (!report || !report.isActive) {
      res.status(404).json({
        error: { code: 'LABORATORY_REPORT_NOT_FOUND', message: 'Laboratory report not found' },
      });
      return;
    }
    const items = await this.facade.listLaboratoryReportAttachments(String(req.params.reportId));
    res.json({ items, count: items.length });
  });

  // ---- Laboratory Import Engine (Phase 2.2E) ----

  listLaboratoryImportSessions = asyncHandler(async (_req, res) => {
    const items = await this.facade.listLaboratoryImportSessions();
    res.json({ items, count: items.length });
  });

  getLaboratoryImport = asyncHandler(async (req, res) => {
    const aggregate = await this.facade.getLaboratoryImport(String(req.params.sessionId));
    if (!aggregate) {
      res.status(404).json({
        error: { code: 'IMPORT_SESSION_NOT_FOUND', message: 'Import session not found' },
      });
      return;
    }
    res.json(aggregate);
  });

  uploadLaboratoryImport = asyncHandler(async (req, res) => {
    const parsed = uploadImportSessionSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.uploadLaboratoryImport(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateLaboratoryImport = asyncHandler(async (req, res) => {
    const parsed = validateImportSessionSchema.parse(req.body ?? {});
    try {
      res.json(
        await this.facade.validateLaboratoryImport(String(req.params.sessionId), parsed),
      );
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  previewLaboratoryImport = asyncHandler(async (req, res) => {
    const parsed = previewImportSessionSchema.parse(req.body ?? {});
    try {
      res.json(await this.facade.previewLaboratoryImport(String(req.params.sessionId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  commitLaboratoryImport = asyncHandler(async (req, res) => {
    const parsed = commitImportSessionSchema.parse(req.body);
    try {
      res.json(await this.facade.commitLaboratoryImport(String(req.params.sessionId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listLaboratoryImportValidations = asyncHandler(async (req, res) => {
    const session = await this.facade.getLaboratoryImport(String(req.params.sessionId));
    if (!session) {
      res.status(404).json({
        error: { code: 'IMPORT_SESSION_NOT_FOUND', message: 'Import session not found' },
      });
      return;
    }
    const items = await this.facade.listLaboratoryImportValidations(String(req.params.sessionId));
    res.json({ items, count: items.length });
  });

  createLaboratoryImportMapping = asyncHandler(async (req, res) => {
    const parsed = createImportMappingSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createLaboratoryImportMapping(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  // ---- Soil Sampling Management (Phase 2.2F) ----

  listSamplingCampaigns = asyncHandler(async (_req, res) => {
    const items = await this.facade.listSamplingCampaigns();
    res.json({ items, count: items.length });
  });

  getSamplingCampaign = asyncHandler(async (req, res) => {
    const aggregate = await this.facade.getSoilSamplingAggregate(String(req.params.campaignId));
    if (!aggregate) {
      res.status(404).json({
        error: { code: 'SAMPLING_CAMPAIGN_NOT_FOUND', message: 'Sampling campaign not found' },
      });
      return;
    }
    res.json(aggregate);
  });

  createSamplingCampaign = asyncHandler(async (req, res) => {
    const parsed = createSamplingCampaignSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createSamplingCampaign(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateSamplingCampaign = asyncHandler(async (req, res) => {
    const parsed = updateSamplingCampaignSchema.parse(req.body);
    try {
      res.json(await this.facade.updateSamplingCampaign(String(req.params.campaignId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteSamplingCampaign = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteSamplingCampaign(String(req.params.campaignId)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listSamplingPoints = asyncHandler(async (req, res) => {
    const campaignId = req.query.campaignId ? String(req.query.campaignId) : undefined;
    const items = await this.facade.listSamplingPoints(campaignId);
    res.json({ items, count: items.length });
  });

  getSamplingPoint = asyncHandler(async (req, res) => {
    const row = await this.facade.getSamplingPoint(String(req.params.pointId));
    if (!row) {
      res.status(404).json({
        error: { code: 'SAMPLING_POINT_NOT_FOUND', message: 'Sampling point not found' },
      });
      return;
    }
    res.json(row);
  });

  createSamplingPoint = asyncHandler(async (req, res) => {
    const parsed = createSamplingPointSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createSamplingPoint(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateSamplingPoint = asyncHandler(async (req, res) => {
    const parsed = updateSamplingPointSchema.parse(req.body);
    try {
      res.json(await this.facade.updateSamplingPoint(String(req.params.pointId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteSamplingPoint = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteSamplingPoint(String(req.params.pointId)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listSamplingSamples = asyncHandler(async (req, res) => {
    const samplingPointId = req.query.samplingPointId
      ? String(req.query.samplingPointId)
      : undefined;
    const items = await this.facade.listSamplingSamples(samplingPointId);
    res.json({ items, count: items.length });
  });

  getSamplingSample = asyncHandler(async (req, res) => {
    const row = await this.facade.getSamplingSample(String(req.params.sampleId));
    if (!row) {
      res.status(404).json({
        error: { code: 'SAMPLING_SAMPLE_NOT_FOUND', message: 'Soil sample not found' },
      });
      return;
    }
    res.json(row);
  });

  createSamplingSample = asyncHandler(async (req, res) => {
    const parsed = createSamplingSoilSampleSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createSamplingSample(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateSamplingSample = asyncHandler(async (req, res) => {
    const parsed = updateSamplingSoilSampleSchema.parse(req.body);
    try {
      res.json(await this.facade.updateSamplingSample(String(req.params.sampleId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteSamplingSample = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteSamplingSample(String(req.params.sampleId)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listSamplingObservations = asyncHandler(async (req, res) => {
    const samplingPointId = req.query.samplingPointId
      ? String(req.query.samplingPointId)
      : undefined;
    const items = await this.facade.listSamplingObservations(samplingPointId);
    res.json({ items, count: items.length });
  });

  getSamplingObservation = asyncHandler(async (req, res) => {
    const row = await this.facade.getSamplingObservation(String(req.params.observationId));
    if (!row) {
      res.status(404).json({
        error: {
          code: 'SAMPLING_OBSERVATION_NOT_FOUND',
          message: 'Sampling observation not found',
        },
      });
      return;
    }
    res.json(row);
  });

  createSamplingObservation = asyncHandler(async (req, res) => {
    const parsed = createSamplingObservationSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createSamplingObservation(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateSamplingObservation = asyncHandler(async (req, res) => {
    const parsed = updateSamplingObservationSchema.parse(req.body);
    try {
      res.json(
        await this.facade.updateSamplingObservation(String(req.params.observationId), parsed),
      );
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteSamplingObservation = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteSamplingObservation(String(req.params.observationId)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listChainOfCustody = asyncHandler(async (req, res) => {
    const sampleId = String(req.query.sampleId ?? req.params.sampleId ?? '');
    if (!sampleId) {
      res.status(400).json({
        error: { code: 'SAMPLE_ID_REQUIRED', message: 'sampleId query parameter is required' },
      });
      return;
    }
    const items = await this.facade.listChainOfCustody(sampleId);
    res.json({ items, count: items.length });
  });

  getChainOfCustody = asyncHandler(async (req, res) => {
    const row = await this.facade.getChainOfCustody(String(req.params.custodyId));
    if (!row) {
      res.status(404).json({
        error: { code: 'CHAIN_OF_CUSTODY_NOT_FOUND', message: 'Chain of custody not found' },
      });
      return;
    }
    res.json(row);
  });

  createChainOfCustody = asyncHandler(async (req, res) => {
    const parsed = createChainOfCustodySchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createChainOfCustody(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateChainOfCustody = asyncHandler(async (req, res) => {
    const parsed = updateChainOfCustodySchema.parse(req.body);
    try {
      res.json(await this.facade.updateChainOfCustody(String(req.params.custodyId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteChainOfCustody = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteChainOfCustody(String(req.params.custodyId)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  // ---- Irrigation Water Laboratory (Phase 2.2G) ----

  listWaterSources = asyncHandler(async (req, res) => {
    const parcelId = req.query.parcelId
      ? String(req.query.parcelId)
      : req.params.parcelId
        ? String(req.params.parcelId)
        : undefined;
    const items = await this.facade.listWaterSources(parcelId);
    res.json({ items, count: items.length });
  });

  getWaterSource = asyncHandler(async (req, res) => {
    const row = await this.facade.getWaterSource(String(req.params.id));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'WATER_SOURCE_NOT_FOUND', message: 'Water source not found' },
      });
      return;
    }
    res.json(row);
  });

  createWaterSource = asyncHandler(async (req, res) => {
    const parsed = createWaterSourceSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createWaterSource(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateWaterSource = asyncHandler(async (req, res) => {
    const parsed = updateWaterSourceSchema.parse(req.body);
    try {
      res.json(await this.facade.updateWaterSource(String(req.params.id), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteWaterSource = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteWaterSource(String(req.params.id)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listWaterSamples = asyncHandler(async (req, res) => {
    const waterSourceId = req.query.waterSourceId
      ? String(req.query.waterSourceId)
      : undefined;
    const items = await this.facade.listWaterSamples(waterSourceId);
    res.json({ items, count: items.length });
  });

  getWaterSample = asyncHandler(async (req, res) => {
    const row = await this.facade.getWaterSample(String(req.params.id));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'WATER_SAMPLE_NOT_FOUND', message: 'Water sample not found' },
      });
      return;
    }
    res.json(row);
  });

  createWaterSample = asyncHandler(async (req, res) => {
    const parsed = createWaterSampleSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createWaterSample(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateWaterSample = asyncHandler(async (req, res) => {
    const parsed = updateWaterSampleSchema.parse(req.body);
    try {
      res.json(await this.facade.updateWaterSample(String(req.params.id), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateWaterSampleStatus = asyncHandler(async (req, res) => {
    const parsed = updateWaterSampleStatusSchema.parse(req.body);
    try {
      res.json(await this.facade.updateWaterSampleStatus(String(req.params.id), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listWaterParameters = asyncHandler(async (_req, res) => {
    const items = await this.facade.listWaterParameters();
    res.json({ items, count: items.length });
  });

  getWaterParameter = asyncHandler(async (req, res) => {
    const row = await this.facade.getWaterParameter(String(req.params.id));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'WATER_PARAMETER_NOT_FOUND', message: 'Water parameter not found' },
      });
      return;
    }
    res.json(row);
  });

  getWaterParameterByCode = asyncHandler(async (req, res) => {
    const row = await this.facade.getWaterParameterByCode(String(req.params.code));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'WATER_PARAMETER_NOT_FOUND', message: 'Water parameter not found' },
      });
      return;
    }
    res.json(row);
  });

  createWaterParameter = asyncHandler(async (req, res) => {
    const parsed = createWaterParameterSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createWaterParameter(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateWaterParameter = asyncHandler(async (req, res) => {
    const parsed = updateWaterParameterSchema.parse(req.body);
    try {
      res.json(await this.facade.updateWaterParameter(String(req.params.id), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listWaterAnalysisResults = asyncHandler(async (req, res) => {
    const items = await this.facade.listWaterAnalysisResults(String(req.params.sampleId));
    res.json({ items, count: items.length });
  });

  createWaterAnalysisResult = asyncHandler(async (req, res) => {
    const parsed = createWaterAnalysisResultSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createWaterAnalysisResult(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateWaterAnalysisResult = asyncHandler(async (req, res) => {
    const parsed = updateWaterAnalysisResultSchema.parse(req.body);
    try {
      res.json(await this.facade.updateWaterAnalysisResult(String(req.params.id), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  normalizeWaterAnalysisResult = asyncHandler(async (req, res) => {
    const parsed = normalizeWaterAnalysisResultSchema.parse(req.body);
    try {
      res.json(await this.facade.normalizeWaterAnalysisResult(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  validateWaterAnalysisResult = asyncHandler(async (req, res) => {
    const parsed = validateWaterAnalysisResultSchema.parse(req.body);
    try {
      res.json(await this.facade.validateWaterAnalysisResultPayload(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  calculateWaterIndicators = asyncHandler(async (req, res) => {
    try {
      const items = await this.facade.calculateWaterIndicators(String(req.params.sampleId));
      res.json({ items, count: items.length });
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listWaterDerivedIndicators = asyncHandler(async (req, res) => {
    const items = await this.facade.listWaterDerivedIndicators(String(req.params.sampleId));
    res.json({ items, count: items.length });
  });

  listWaterChainOfCustody = asyncHandler(async (req, res) => {
    const items = await this.facade.listWaterChainOfCustody(String(req.params.sampleId));
    res.json({ items, count: items.length });
  });

  createWaterChainOfCustody = asyncHandler(async (req, res) => {
    const parsed = createWaterCustodySchema.parse(req.body);
    try {
      res
        .status(201)
        .json(await this.facade.createWaterChainOfCustody(String(req.params.sampleId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  // ---- Field Observation (Phase 2.2H) ----

  listFieldSurveys = asyncHandler(async (req, res) => {
    const parcelId = req.query.parcelId
      ? String(req.query.parcelId)
      : req.params.parcelId
        ? String(req.params.parcelId)
        : undefined;
    const items = await this.facade.listFieldSurveys(parcelId);
    res.json({ items, count: items.length });
  });

  getFieldSurvey = asyncHandler(async (req, res) => {
    const row = await this.facade.getFieldSurveyAggregate(String(req.params.id));
    if (!row || !row.survey.isActive) {
      res.status(404).json({
        error: { code: 'FIELD_SURVEY_NOT_FOUND', message: 'Field survey not found' },
      });
      return;
    }
    res.json(row);
  });

  createFieldSurvey = asyncHandler(async (req, res) => {
    const parsed = createFieldSurveySchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createFieldSurvey(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateFieldSurvey = asyncHandler(async (req, res) => {
    const parsed = updateFieldSurveySchema.parse(req.body);
    try {
      res.json(await this.facade.updateFieldSurvey(String(req.params.id), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  startFieldSurvey = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.startFieldSurvey(String(req.params.id), req.body?.actor));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  completeFieldSurvey = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.completeFieldSurvey(String(req.params.id), req.body?.actor));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  submitFieldSurveyReview = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.submitFieldSurveyReview(String(req.params.id), req.body?.actor));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listFieldObservationPoints = asyncHandler(async (req, res) => {
    const items = await this.facade.listFieldObservationPoints(String(req.params.surveyId));
    res.json({ items, count: items.length });
  });

  createFieldObservationPoint = asyncHandler(async (req, res) => {
    const parsed = createFieldObservationPointSchema.parse(req.body);
    try {
      res
        .status(201)
        .json(await this.facade.createFieldObservationPoint(String(req.params.surveyId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateFieldObservationPoint = asyncHandler(async (req, res) => {
    const parsed = updateFieldObservationPointSchema.parse(req.body);
    try {
      res.json(await this.facade.updateFieldObservationPoint(String(req.params.id), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteFieldObservationPoint = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteFieldObservationPoint(String(req.params.id)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listFieldParameters = asyncHandler(async (_req, res) => {
    const items = await this.facade.listFieldParameters();
    res.json({ items, count: items.length });
  });

  getFieldParameter = asyncHandler(async (req, res) => {
    const row = await this.facade.getFieldParameter(String(req.params.id));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'FIELD_PARAMETER_NOT_FOUND', message: 'Field parameter not found' },
      });
      return;
    }
    res.json(row);
  });

  getFieldParameterByCode = asyncHandler(async (req, res) => {
    const row = await this.facade.getFieldParameterByCode(String(req.params.code));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'FIELD_PARAMETER_NOT_FOUND', message: 'Field parameter not found' },
      });
      return;
    }
    res.json(row);
  });

  createFieldParameter = asyncHandler(async (req, res) => {
    const parsed = createFieldParameterSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createFieldParameter(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateFieldParameter = asyncHandler(async (req, res) => {
    const parsed = updateFieldParameterSchema.parse(req.body);
    try {
      res.json(await this.facade.updateFieldParameter(String(req.params.id), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listFieldObservationResults = asyncHandler(async (req, res) => {
    const items = await this.facade.listFieldObservationResults(String(req.params.surveyId));
    res.json({ items, count: items.length });
  });

  createFieldObservationResult = asyncHandler(async (req, res) => {
    const parsed = createFieldObservationResultSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createFieldObservationResult(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateFieldObservationResult = asyncHandler(async (req, res) => {
    const parsed = updateFieldObservationResultSchema.parse(req.body);
    try {
      res.json(await this.facade.updateFieldObservationResult(String(req.params.id), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteFieldObservationResult = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteFieldObservationResult(String(req.params.id)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  verifyFieldObservationResult = asyncHandler(async (req, res) => {
    const actor = String(req.body?.actor ?? req.body?.reviewedBy ?? 'expert');
    try {
      res.json(await this.facade.verifyFieldObservationResult(String(req.params.id), actor));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  rejectFieldObservationResult = asyncHandler(async (req, res) => {
    const actor = String(req.body?.actor ?? req.body?.reviewedBy ?? 'expert');
    try {
      res.json(
        await this.facade.rejectFieldObservationResult(
          String(req.params.id),
          actor,
          req.body?.notes,
        ),
      );
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  uploadFieldEvidence = asyncHandler(async (req, res) => {
    const parsed = uploadFieldEvidenceSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.uploadFieldEvidence(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listFieldEvidence = asyncHandler(async (req, res) => {
    const items = await this.facade.listFieldEvidence(String(req.params.surveyId));
    res.json({ items, count: items.length });
  });

  deleteFieldEvidence = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteFieldEvidence(String(req.params.id)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listFieldMeasurementDevices = asyncHandler(async (_req, res) => {
    const items = await this.facade.listFieldMeasurementDevices();
    res.json({ items, count: items.length });
  });

  createFieldMeasurementDevice = asyncHandler(async (req, res) => {
    const parsed = createFieldDeviceSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createFieldMeasurementDevice(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateFieldMeasurementDevice = asyncHandler(async (req, res) => {
    const parsed = updateFieldDeviceSchema.parse(req.body);
    try {
      res.json(await this.facade.updateFieldMeasurementDevice(String(req.params.id), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  createFieldDeviceMeasurement = asyncHandler(async (req, res) => {
    const parsed = createFieldDeviceMeasurementSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createFieldDeviceMeasurement(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  getFieldSurveyReview = asyncHandler(async (req, res) => {
    const row = await this.facade.getFieldSurveyReview(String(req.params.surveyId));
    res.json(row);
  });

  createFieldSurveyReviewRecord = asyncHandler(async (req, res) => {
    const parsed = createFieldSurveyReviewSchema.parse(req.body);
    try {
      res
        .status(201)
        .json(await this.facade.createFieldSurveyReviewRecord(String(req.params.surveyId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  approveFieldSurvey = asyncHandler(async (req, res) => {
    const parsed = reviewActionSchema.parse(req.body);
    try {
      res.json(await this.facade.approveFieldSurvey(String(req.params.surveyId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  requestFieldSurveyRevision = asyncHandler(async (req, res) => {
    const parsed = reviewActionSchema.parse(req.body);
    try {
      res.json(await this.facade.requestFieldSurveyRevision(String(req.params.surveyId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  rejectFieldSurvey = asyncHandler(async (req, res) => {
    const parsed = reviewActionSchema.parse(req.body);
    try {
      res.json(await this.facade.rejectFieldSurvey(String(req.params.surveyId), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  // ---- AgroClimate Indicators Engine (Phase 2.3A) ----

  listAgroClimateIndicators = asyncHandler(async (_req, res) => {
    const items = await this.facade.listAgroClimateIndicators();
    res.json({ items, count: items.length });
  });

  getAgroClimateIndicator = asyncHandler(async (req, res) => {
    const row = await this.facade.getAgroClimateIndicator(String(req.params.id));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'AGROCLIMATE_INDICATOR_NOT_FOUND', message: 'Agroclimate indicator not found' },
      });
      return;
    }
    res.json(row);
  });

  getAgroClimateIndicatorByCode = asyncHandler(async (req, res) => {
    const row = await this.facade.getAgroClimateIndicatorByCode(String(req.params.code));
    if (!row || !row.isActive) {
      res.status(404).json({
        error: { code: 'AGROCLIMATE_INDICATOR_NOT_FOUND', message: 'Agroclimate indicator not found' },
      });
      return;
    }
    res.json(row);
  });

  listClimateDataSources = asyncHandler(async (_req, res) => {
    const items = await this.facade.listClimateDataSources();
    res.json({ items, count: items.length });
  });

  createClimateDataSource = asyncHandler(async (req, res) => {
    const parsed = createClimateDataSourceSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createClimateDataSource(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listClimateObservations = asyncHandler(async (req, res) => {
    const parcelId = req.query.parcelId
      ? String(req.query.parcelId)
      : req.params.parcelId
        ? String(req.params.parcelId)
        : undefined;
    const items = await this.facade.listClimateObservations({
      parcelId,
      dataSourceId: req.query.dataSourceId ? String(req.query.dataSourceId) : undefined,
      parameterCode: req.query.parameterCode
        ? (String(req.query.parameterCode) as ParameterCode)
        : undefined,
      startDate: req.query.startDate ? String(req.query.startDate) : undefined,
      endDate: req.query.endDate ? String(req.query.endDate) : undefined,
    });
    res.json({ items, count: items.length });
  });

  createClimateObservation = asyncHandler(async (req, res) => {
    const parsed = createClimateObservationSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createClimateObservation(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listAgroClimateConfigurations = asyncHandler(async (req, res) => {
    const indicatorId = req.query.indicatorId ? String(req.query.indicatorId) : undefined;
    const items = await this.facade.listAgroClimateConfigurations(indicatorId);
    res.json({ items, count: items.length });
  });

  createAgroClimateConfiguration = asyncHandler(async (req, res) => {
    const parsed = createCalculationConfigSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createAgroClimateConfiguration(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  updateAgroClimateConfiguration = asyncHandler(async (req, res) => {
    const parsed = updateCalculationConfigSchema.parse(req.body);
    try {
      res.json(await this.facade.updateAgroClimateConfiguration(String(req.params.id), parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  deleteAgroClimateConfiguration = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.deleteAgroClimateConfiguration(String(req.params.id)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  createAgroClimateAnalysis = asyncHandler(async (req, res) => {
    const parsed = createAnalysisRunSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createAgroClimateAnalysis(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  getAgroClimateAnalysis = asyncHandler(async (req, res) => {
    const row = await this.facade.getAgroClimateAnalysis(String(req.params.id));
    if (!row) {
      res.status(404).json({
        error: { code: 'AGROCLIMATE_ANALYSIS_NOT_FOUND', message: 'Agroclimate analysis not found' },
      });
      return;
    }
    res.json(row);
  });

  listAgroClimateAnalyses = asyncHandler(async (req, res) => {
    const items = await this.facade.listAgroClimateAnalyses(String(req.params.parcelId));
    res.json({ items, count: items.length });
  });

  validateAgroClimateAnalysis = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.validateAgroClimateAnalysis(String(req.params.id)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  calculateAgroClimateAnalysis = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.calculateAgroClimateAnalysis(String(req.params.id)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  recalculateAgroClimateAnalysis = asyncHandler(async (req, res) => {
    try {
      res.json(await this.facade.recalculateAgroClimateAnalysis(String(req.params.id)));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listAgroClimateResults = asyncHandler(async (req, res) => {
    const items = await this.facade.listAgroClimateResults(String(req.params.id));
    res.json({ items, count: items.length });
  });

  listParcelAgroClimateIndicators = asyncHandler(async (req, res) => {
    const indicatorCode = req.params.indicatorCode
      ? String(req.params.indicatorCode)
      : undefined;
    const items = await this.facade.listParcelAgroClimateIndicators(
      String(req.params.parcelId),
      indicatorCode,
    );
    res.json({ items, count: items.length });
  });

  createClimateSourceComparison = asyncHandler(async (req, res) => {
    const parsed = createSourceComparisonSchema.parse(req.body);
    try {
      res.status(201).json(await this.facade.createClimateSourceComparison(parsed));
    } catch (err) {
      if (respondServiceError(res, err)) return;
      throw err;
    }
  });

  listClimateSourceComparisons = asyncHandler(async (req, res) => {
    const items = await this.facade.listClimateSourceComparisons(String(req.params.parcelId));
    res.json({ items, count: items.length });
  });
}

export function physicalSuitabilityErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isApiError(err)) {
    res.status(err.statusCode).json({
      error: {
        code: (err.details as { code?: string } | undefined)?.code ?? err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }
  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.issues },
    });
    return;
  }
  next(err);
}
