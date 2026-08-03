import { randomUUID } from 'node:crypto';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  GROWTH_STAGE_CATALOG,
  type CropGrowthStage,
  type CropGrowthStageDto,
  type CropPhenologyEngineDto,
  type GrowthStageCode,
  type StageReference,
  type StageTransition,
} from '../phenology/growth-stage.types.js';
import {
  CropPhenologyValidationService,
  type CreateGrowthStageInput,
  type UpdateGrowthStageInput,
} from '../services/phenology-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

export class CropPhenologyEngineService {
  readonly validation: CropPhenologyValidationService;

  constructor(private readonly repo: CropKnowledgeRepository) {
    this.validation = new CropPhenologyValidationService(repo);
  }

  async getEngine(cropKnowledgeId: string): Promise<CropPhenologyEngineDto | null> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) return null;
    const stages = await this.listStages(cropKnowledgeId);
    const transitions = await this.repo.listStageTransitions(cropKnowledgeId, true);
    return {
      cropKnowledgeId,
      cropCode: knowledge.cropCode,
      stages,
      transitions,
    };
  }

  async getEngineByCropCode(cropCode: string): Promise<CropPhenologyEngineDto | null> {
    const knowledge = await this.repo.getKnowledgeByCropCode(cropCode);
    if (!knowledge) return null;
    return this.getEngine(knowledge.id);
  }

  async listStages(cropKnowledgeId: string): Promise<CropGrowthStageDto[]> {
    const stages = await this.repo.listGrowthStages(cropKnowledgeId, true);
    const out: CropGrowthStageDto[] = [];
    for (const stage of stages) {
      const references = await this.repo.listStageReferences(stage.id, true);
      out.push({ ...stage, references });
    }
    return out;
  }

  async getStageDetails(stageId: string): Promise<CropGrowthStageDto | null> {
    const stage = await this.repo.getGrowthStageById(stageId);
    if (!stage || !stage.isActive) return null;
    const references = await this.repo.listStageReferences(stage.id, true);
    return { ...stage, references };
  }

  async getStageByCode(
    cropKnowledgeId: string,
    stageCode: GrowthStageCode,
  ): Promise<CropGrowthStageDto | null> {
    const stage = await this.repo.getGrowthStageByCode(cropKnowledgeId, stageCode);
    if (!stage) return null;
    const references = await this.repo.listStageReferences(stage.id, true);
    return { ...stage, references };
  }

  async createStage(
    cropKnowledgeId: string,
    input: CreateGrowthStageInput,
  ): Promise<CropGrowthStageDto> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) throw httpError(404, 'CROP_KNOWLEDGE_NOT_FOUND', 'Crop knowledge not found');

    let phenology = await this.repo.getPhenology(cropKnowledgeId);
    const now = new Date().toISOString();
    if (!phenology) {
      phenology = await this.repo.upsertPhenology({
        id: newId(),
        cropKnowledgeId,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Phenology Engine section.',
      });
    }

    const siblings = await this.repo.listGrowthStages(cropKnowledgeId, true);
    const candidate: CropGrowthStage = {
      id: newId(),
      cropId: cropKnowledgeId,
      cropKnowledgeId,
      phenologyId: phenology.id,
      stageCode: input.stageCode,
      stageName: input.stageName,
      stageOrder: input.stageOrder,
      description: input.description ?? null,
      scientificDescription: input.scientificDescription ?? null,
      typicalDurationDays: input.typicalDurationDays ?? null,
      minimumDurationDays: input.minimumDurationDays ?? null,
      maximumDurationDays: input.maximumDurationDays ?? null,
      canOverlapPreviousStage: input.canOverlapPreviousStage ?? false,
      isCriticalStage: input.isCriticalStage ?? false,
      requiresValidation: input.requiresValidation ?? false,
      createdAt: now,
      updatedAt: now,
      version: 1,
      sourceReferenceId: input.sourceReferenceId ?? knowledge.sourceReferenceId,
      verificationStatus: input.verificationStatus ?? 'Draft',
      isActive: true,
    };

    const issues = this.validation.validateWriteCandidate(candidate, siblings, 'create');
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      throw httpError(422, 'GROWTH_STAGE_INVALID', 'Growth stage validation failed', {
        issues: hard,
      });
    }

    const saved = await this.repo.upsertGrowthStage(candidate);
    return { ...saved, references: [] };
  }

  async updateStage(
    cropKnowledgeId: string,
    stageId: string,
    input: UpdateGrowthStageInput,
  ): Promise<CropGrowthStageDto> {
    const existing = await this.repo.getGrowthStageById(stageId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'GROWTH_STAGE_NOT_FOUND', 'Growth stage not found');
    }

    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertGrowthStage(existing);

    const next: CropGrowthStage = {
      ...existing,
      id: newId(),
      stageCode: input.stageCode ?? existing.stageCode,
      stageName: input.stageName ?? existing.stageName,
      stageOrder: input.stageOrder ?? existing.stageOrder,
      description: input.description !== undefined ? input.description : existing.description,
      scientificDescription:
        input.scientificDescription !== undefined
          ? input.scientificDescription
          : existing.scientificDescription,
      typicalDurationDays:
        input.typicalDurationDays !== undefined
          ? input.typicalDurationDays
          : existing.typicalDurationDays,
      minimumDurationDays:
        input.minimumDurationDays !== undefined
          ? input.minimumDurationDays
          : existing.minimumDurationDays,
      maximumDurationDays:
        input.maximumDurationDays !== undefined
          ? input.maximumDurationDays
          : existing.maximumDurationDays,
      canOverlapPreviousStage:
        input.canOverlapPreviousStage ?? existing.canOverlapPreviousStage,
      isCriticalStage: input.isCriticalStage ?? existing.isCriticalStage,
      requiresValidation: input.requiresValidation ?? existing.requiresValidation,
      sourceReferenceId:
        input.sourceReferenceId !== undefined
          ? input.sourceReferenceId
          : existing.sourceReferenceId,
      verificationStatus: input.verificationStatus ?? existing.verificationStatus,
      version: existing.version + 1,
      createdAt: existing.createdAt,
      updatedAt: now,
      isActive: true,
    };

    const siblings = await this.repo.listGrowthStages(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(next, siblings, 'update');
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      // restore previous active version
      existing.isActive = true;
      existing.updatedAt = now;
      await this.repo.upsertGrowthStage(existing);
      throw httpError(422, 'GROWTH_STAGE_INVALID', 'Growth stage validation failed', {
        issues: hard,
      });
    }

    const saved = await this.repo.upsertGrowthStage(next);
    const references = await this.repo.listStageReferences(saved.id, true);
    // migrate references pointer: keep on old id historically; new version starts empty unless copied
    for (const ref of await this.repo.listStageReferences(existing.id, true)) {
      const copy: StageReference = {
        ...ref,
        id: newId(),
        stageId: saved.id,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      await this.repo.upsertStageReference(copy);
    }
    const refs = await this.repo.listStageReferences(saved.id, true);
    return { ...saved, references: refs.length ? refs : references };
  }

  async deleteStage(cropKnowledgeId: string, stageId: string): Promise<CropGrowthStage> {
    const existing = await this.repo.getGrowthStageById(stageId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'GROWTH_STAGE_NOT_FOUND', 'Growth stage not found');
    }
    if (existing.stageCode === 'SEED') {
      const siblings = await this.repo.listGrowthStages(cropKnowledgeId, true);
      if (siblings.length > 1) {
        throw httpError(
          422,
          'SEED_STAGE_DELETE_FORBIDDEN',
          'Cannot delete SEED while other stages exist',
        );
      }
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    return this.repo.upsertGrowthStage(existing);
  }

  listTransitions(cropKnowledgeId: string) {
    return this.repo.listStageTransitions(cropKnowledgeId, true);
  }

  validate(cropKnowledgeId: string) {
    return this.validation.validate(cropKnowledgeId);
  }
}

/**
 * Seeds CropGrowthStage + StageTransition (+ StageReference shell) for all active crops.
 * Durations remain null — no climate/water/GDD thresholds.
 */
export async function seedCropPhenologyEngine(
  ckRepo: CropKnowledgeRepository,
): Promise<void> {
  const roots = await ckRepo.listKnowledge(true);
  const now = new Date().toISOString();

  for (const knowledge of roots) {
    let phenology = await ckRepo.getPhenology(knowledge.id);
    if (!phenology) {
      phenology = await ckRepo.upsertPhenology({
        id: newId(),
        cropKnowledgeId: knowledge.id,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Phenology Engine — Phase 2.1B data model.',
      });
    }

    const existing = await ckRepo.listGrowthStages(knowledge.id, true);
    const present = new Set(existing.map((s) => s.stageCode));
    const created: CropGrowthStage[] = [...existing];

    for (const catalog of GROWTH_STAGE_CATALOG) {
      if (present.has(catalog.stageCode)) continue;
      const stage: CropGrowthStage = {
        id: newId(),
        cropId: knowledge.id,
        cropKnowledgeId: knowledge.id,
        phenologyId: phenology.id,
        stageCode: catalog.stageCode,
        stageName: catalog.stageName,
        stageOrder: catalog.stageOrder,
        description: catalog.description,
        scientificDescription: catalog.scientificDescription,
        typicalDurationDays: null,
        minimumDurationDays: null,
        maximumDurationDays: null,
        canOverlapPreviousStage: catalog.canOverlapPreviousStage,
        isCriticalStage: catalog.isCriticalStage,
        requiresValidation: catalog.requiresValidation,
        createdAt: now,
        updatedAt: now,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        isActive: true,
      };
      await ckRepo.upsertGrowthStage(stage);
      created.push(stage);

      if (knowledge.sourceReferenceId) {
        await ckRepo.upsertStageReference({
          id: newId(),
          stageId: stage.id,
          scientificSource: 'Phase 2.1B pilot catalog (draft)',
          organization: 'Tarım AI',
          publication: null,
          publicationYear: null,
          doi: null,
          referenceUrl: null,
          notes: 'Placeholder StageReference — replace with verified scientific source.',
          version: 1,
          sourceReferenceId: knowledge.sourceReferenceId,
          verificationStatus: 'Draft',
          createdAt: now,
          updatedAt: now,
          isActive: true,
        });
      }
    }

    const transitions = await ckRepo.listStageTransitions(knowledge.id, true);
    if (transitions.length === 0) {
      for (let i = 0; i < GROWTH_STAGE_CATALOG.length - 1; i++) {
        const from = GROWTH_STAGE_CATALOG[i]!;
        const to = GROWTH_STAGE_CATALOG[i + 1]!;
        const row: StageTransition = {
          id: newId(),
          cropKnowledgeId: knowledge.id,
          fromStageCode: from.stageCode,
          toStageCode: to.stageCode,
          order: i + 1,
          canSkip: false,
          requiresPreviousCompletion: true,
          notes: 'Canonical sequential transition (draft).',
          version: 1,
          sourceReferenceId: knowledge.sourceReferenceId,
          verificationStatus: 'Draft',
          createdAt: now,
          updatedAt: now,
          isActive: true,
        };
        await ckRepo.upsertStageTransition(row);
      }
    }
  }
}

/** @deprecated Prefer seedCropPhenologyEngine */
export const seedPhenologyStages = seedCropPhenologyEngine;
