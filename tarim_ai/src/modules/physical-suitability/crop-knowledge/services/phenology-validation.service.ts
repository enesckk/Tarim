import { z } from 'zod';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  GROWTH_STAGE_CATALOG,
  GROWTH_STAGE_CODES,
  POST_HARVEST_STAGE_CODES,
  type CropGrowthStage,
  type GrowthStageCode,
  type PhenologyEngineValidationIssue,
  type PhenologyEngineValidationResult,
  type StageTransition,
} from '../phenology/growth-stage.types.js';

export const growthStageCodeSchema = z.enum([
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
]) satisfies z.ZodType<GrowthStageCode>;

const verificationStatusSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

export const createGrowthStageSchema = z.object({
  stageCode: growthStageCodeSchema,
  stageName: z.string().min(1).max(200),
  stageOrder: z.number().int().min(1).max(100),
  description: z.string().max(4000).nullable().optional(),
  scientificDescription: z.string().max(8000).nullable().optional(),
  typicalDurationDays: z.number().int().positive().nullable().optional(),
  minimumDurationDays: z.number().int().positive().nullable().optional(),
  maximumDurationDays: z.number().int().positive().nullable().optional(),
  canOverlapPreviousStage: z.boolean().optional(),
  isCriticalStage: z.boolean().optional(),
  requiresValidation: z.boolean().optional(),
  sourceReferenceId: z.string().uuid().nullable().optional(),
  verificationStatus: verificationStatusSchema.optional(),
});

export const updateGrowthStageSchema = createGrowthStageSchema.partial().extend({
  stageCode: growthStageCodeSchema.optional(),
  stageName: z.string().min(1).max(200).optional(),
  stageOrder: z.number().int().min(1).max(100).optional(),
});

export type CreateGrowthStageInput = z.infer<typeof createGrowthStageSchema>;
export type UpdateGrowthStageInput = z.infer<typeof updateGrowthStageSchema>;

/** @deprecated Use createGrowthStageSchema */
export const upsertPhenologyStageSchema = createGrowthStageSchema;
export type UpsertPhenologyStageInput = CreateGrowthStageInput;

function catalogOrder(code: GrowthStageCode): number {
  return GROWTH_STAGE_CATALOG.find((c) => c.stageCode === code)?.stageOrder ?? 999;
}

export class CropPhenologyValidationService {
  constructor(private readonly repo: CropKnowledgeRepository) {}

  async validate(cropKnowledgeId: string): Promise<PhenologyEngineValidationResult> {
    const issues: PhenologyEngineValidationIssue[] = [];
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) {
      return {
        cropKnowledgeId,
        valid: false,
        issues: [
          {
            code: 'CROP_KNOWLEDGE_NOT_FOUND',
            severity: 'error',
            message: 'Crop knowledge root not found',
          },
        ],
      };
    }

    const section = await this.repo.getPhenology(cropKnowledgeId);
    if (!section) {
      issues.push({
        code: 'PHENOLOGY_SECTION_MISSING',
        severity: 'error',
        message: 'Phenology section is required',
      });
    }

    const stages = await this.repo.listGrowthStages(cropKnowledgeId, true);
    if (stages.length === 0) {
      issues.push({
        code: 'GROWTH_STAGES_MISSING',
        severity: 'error',
        message: 'No active growth stages defined',
      });
    } else {
      const first = [...stages].sort((a, b) => a.stageOrder - b.stageOrder)[0]!;
      if (first.stageCode !== 'SEED') {
        issues.push({
          code: 'FIRST_STAGE_MUST_BE_SEED',
          severity: 'error',
          message: 'First stage (lowest StageOrder) must be SEED',
          path: first.stageCode,
        });
      }
    }

    const orders = stages.map((s) => s.stageOrder);
    if (new Set(orders).size !== orders.length) {
      issues.push({
        code: 'STAGE_ORDER_DUPLICATE',
        severity: 'error',
        message: 'StageOrder must be unique within a crop',
        path: 'stageOrder',
      });
    }

    const codes = stages.map((s) => s.stageCode);
    if (new Set(codes).size !== codes.length) {
      issues.push({
        code: 'STAGE_CODE_DUPLICATE',
        severity: 'error',
        message: 'StageCode must be unique within a crop',
        path: 'stageCode',
      });
    }

    for (const stage of stages) {
      this.validateStageEntity(stage, stages, issues);
    }

    const transitions = await this.repo.listStageTransitions(cropKnowledgeId, true);
    for (const transition of transitions) {
      this.validateTransition(transition, stages, issues);
    }

    return {
      cropKnowledgeId,
      valid: issues.every((i) => i.severity !== 'error'),
      issues,
    };
  }

  validateStageEntity(
    stage: CropGrowthStage,
    siblings: CropGrowthStage[],
    issues: PhenologyEngineValidationIssue[] = [],
  ): PhenologyEngineValidationIssue[] {
    if (!stage.stageCode || !GROWTH_STAGE_CODES.includes(stage.stageCode)) {
      issues.push({
        code: 'STAGE_CODE_INVALID',
        severity: 'error',
        message: 'Invalid StageCode',
        path: 'stageCode',
      });
    }
    if (!stage.stageName?.trim()) {
      issues.push({
        code: 'STAGE_NAME_REQUIRED',
        severity: 'error',
        message: 'StageName is required',
        path: 'stageName',
      });
    }
    if (stage.stageOrder < 1) {
      issues.push({
        code: 'STAGE_ORDER_INVALID',
        severity: 'error',
        message: 'StageOrder must be >= 1',
        path: 'stageOrder',
      });
    }

    const harvest = siblings.find((s) => s.stageCode === 'HARVEST' && s.id !== stage.id);
    if (
      harvest &&
      stage.stageOrder > harvest.stageOrder &&
      !POST_HARVEST_STAGE_CODES.has(stage.stageCode)
    ) {
      issues.push({
        code: 'STAGE_AFTER_HARVEST_FORBIDDEN',
        severity: 'error',
        message: 'Only POST_HARVEST or RESIDUE may be ordered after HARVEST',
        path: stage.stageCode,
      });
    }

    if (
      stage.minimumDurationDays != null &&
      stage.maximumDurationDays != null &&
      stage.minimumDurationDays > stage.maximumDurationDays
    ) {
      issues.push({
        code: 'DURATION_RANGE_INVALID',
        severity: 'error',
        message: 'MinimumDurationDays cannot exceed MaximumDurationDays',
        path: 'minimumDurationDays',
      });
    }

    if (stage.verificationStatus === 'Approved') {
      issues.push({
        code: 'PREMATURE_APPROVAL',
        severity: 'error',
        message: 'Approved status is not allowed without expert workflow',
        path: 'verificationStatus',
      });
    }

    if (stage.typicalDurationDays == null) {
      issues.push({
        code: 'TYPICAL_DURATION_UNSET',
        severity: 'warning',
        message: `Stage ${stage.stageCode} TypicalDurationDays is unset`,
        path: stage.stageCode,
      });
    }

    return issues;
  }

  validateTransition(
    transition: StageTransition,
    stages: CropGrowthStage[],
    issues: PhenologyEngineValidationIssue[] = [],
  ): PhenologyEngineValidationIssue[] {
    const from = stages.find((s) => s.stageCode === transition.fromStageCode);
    const to = stages.find((s) => s.stageCode === transition.toStageCode);
    if (!from || !to) {
      issues.push({
        code: 'TRANSITION_STAGE_MISSING',
        severity: 'error',
        message: `Transition ${transition.fromStageCode}→${transition.toStageCode} references missing stage`,
        path: `${transition.fromStageCode}->${transition.toStageCode}`,
      });
      return issues;
    }
    if (from.stageOrder >= to.stageOrder) {
      issues.push({
        code: 'INVALID_TRANSITION_ORDER',
        severity: 'error',
        message: 'FromStage must precede ToStage by StageOrder',
        path: `${transition.fromStageCode}->${transition.toStageCode}`,
      });
    }

    const adjacent = to.stageOrder === from.stageOrder + 1;
    const catalogGap = catalogOrder(to.stageCode) - catalogOrder(from.stageCode);
    if (!adjacent && !transition.canSkip && catalogGap > 1) {
      issues.push({
        code: 'INVALID_TRANSITION',
        severity: 'error',
        message: `Non-adjacent transition ${transition.fromStageCode}→${transition.toStageCode} requires CanSkip=true`,
        path: `${transition.fromStageCode}->${transition.toStageCode}`,
      });
    }

    if (from.stageCode === 'HARVEST' && !POST_HARVEST_STAGE_CODES.has(to.stageCode)) {
      issues.push({
        code: 'INVALID_TRANSITION_AFTER_HARVEST',
        severity: 'error',
        message: 'Transitions from HARVEST may only target POST_HARVEST or RESIDUE',
        path: `${transition.fromStageCode}->${transition.toStageCode}`,
      });
    }

    return issues;
  }

  /**
   * Validates a create/update candidate against existing active siblings.
   */
  validateWriteCandidate(
    candidate: CropGrowthStage,
    siblings: CropGrowthStage[],
    mode: 'create' | 'update',
  ): PhenologyEngineValidationIssue[] {
    const issues: PhenologyEngineValidationIssue[] = [];
    const others = siblings.filter((s) => s.id !== candidate.id);

    if (others.some((s) => s.stageCode === candidate.stageCode)) {
      issues.push({
        code: 'STAGE_CODE_DUPLICATE',
        severity: 'error',
        message: 'Same StageCode cannot repeat for a crop',
        path: 'stageCode',
      });
    }
    if (others.some((s) => s.stageOrder === candidate.stageOrder)) {
      issues.push({
        code: 'STAGE_ORDER_DUPLICATE',
        severity: 'error',
        message: 'StageOrder must be unique within a crop',
        path: 'stageOrder',
      });
    }

    const projected = [...others, candidate].sort((a, b) => a.stageOrder - b.stageOrder);
    if (projected.length > 0 && projected[0]!.stageCode !== 'SEED') {
      issues.push({
        code: 'FIRST_STAGE_MUST_BE_SEED',
        severity: 'error',
        message: 'First stage must always be SEED',
        path: 'stageCode',
      });
    }

    if (mode === 'create' && others.length === 0 && candidate.stageCode !== 'SEED') {
      issues.push({
        code: 'FIRST_STAGE_MUST_BE_SEED',
        severity: 'error',
        message: 'First stage must always be SEED',
        path: 'stageCode',
      });
    }

    this.validateStageEntity(candidate, projected, issues);
    return issues;
  }
}
