import { randomUUID } from 'node:crypto';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  WATER_FACTOR_CATALOG,
  type CropWaterRequirementsDto,
  type WaterFactor,
  type WaterRequirement,
} from './water-requirement.types.js';
import {
  WaterRequirementsValidationService,
  type CreateWaterRequirementInput,
  type UpdateWaterRequirementInput,
} from '../services/water-requirements-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

export class CropWaterRequirementsService {
  readonly validation: WaterRequirementsValidationService;

  constructor(private readonly repo: CropKnowledgeRepository) {
    this.validation = new WaterRequirementsValidationService(repo);
  }

  async getAggregate(cropKnowledgeId: string): Promise<CropWaterRequirementsDto | null> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) return null;
    const section = await this.repo.getWaterRequirements(cropKnowledgeId);
    if (!section) return null;
    const requirements = await this.repo.listWaterRequirementItems(cropKnowledgeId, true);
    return {
      sectionId: section.id,
      cropKnowledgeId,
      cropCode: knowledge.cropCode,
      notes: section.notes,
      requirements,
    };
  }

  async getAggregateByCropCode(cropCode: string): Promise<CropWaterRequirementsDto | null> {
    const knowledge = await this.repo.getKnowledgeByCropCode(cropCode);
    if (!knowledge) return null;
    return this.getAggregate(knowledge.id);
  }

  listRequirements(cropKnowledgeId: string) {
    return this.repo.listWaterRequirementItems(cropKnowledgeId, true);
  }

  getRequirementById(id: string) {
    return this.repo.getWaterRequirementById(id);
  }

  getRequirementByFactor(cropKnowledgeId: string, waterFactor: WaterFactor) {
    return this.repo.getWaterRequirementByFactor(cropKnowledgeId, waterFactor);
  }

  async createRequirement(
    cropKnowledgeId: string,
    input: CreateWaterRequirementInput,
  ): Promise<WaterRequirement> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) throw httpError(404, 'CROP_KNOWLEDGE_NOT_FOUND', 'Crop knowledge not found');

    let section = await this.repo.getWaterRequirements(cropKnowledgeId);
    const now = new Date().toISOString();
    if (!section) {
      section = await this.repo.upsertWaterRequirements({
        id: newId(),
        cropKnowledgeId,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Water Requirements — Phase 2.1E data model.',
      });
    }

    const catalog = WATER_FACTOR_CATALOG.find((c) => c.waterFactor === input.waterFactor);
    const candidate: WaterRequirement = {
      id: newId(),
      cropId: cropKnowledgeId,
      cropKnowledgeId,
      waterRequirementsId: section.id,
      waterFactor: input.waterFactor,
      minimum: input.minimum ?? null,
      optimalMinimum: input.optimalMinimum ?? null,
      optimalMaximum: input.optimalMaximum ?? null,
      maximum: input.maximum ?? null,
      preferred: input.preferred ?? null,
      unit: input.unit ?? catalog?.unit ?? this.validation.defaultUnit(input.waterFactor),
      toleranceLevel: input.toleranceLevel ?? 'Unknown',
      importanceLevel: input.importanceLevel ?? catalog?.importanceLevel ?? 'Supporting',
      description: input.description ?? catalog?.description ?? null,
      sourceReferenceId: input.sourceReferenceId ?? knowledge.sourceReferenceId,
      verificationStatus: input.verificationStatus ?? 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };

    const siblings = await this.repo.listWaterRequirementItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(candidate, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      throw httpError(422, 'WATER_REQUIREMENT_INVALID', 'Water requirement validation failed', {
        issues: hard,
      });
    }

    return this.repo.upsertWaterRequirement(candidate);
  }

  async updateRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateWaterRequirementInput,
  ): Promise<WaterRequirement> {
    const existing = await this.repo.getWaterRequirementById(requirementId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'WATER_REQUIREMENT_NOT_FOUND', 'Water requirement not found');
    }

    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertWaterRequirement(existing);

    const next: WaterRequirement = {
      ...existing,
      id: newId(),
      waterFactor: input.waterFactor ?? existing.waterFactor,
      minimum: input.minimum !== undefined ? input.minimum : existing.minimum,
      optimalMinimum:
        input.optimalMinimum !== undefined ? input.optimalMinimum : existing.optimalMinimum,
      optimalMaximum:
        input.optimalMaximum !== undefined ? input.optimalMaximum : existing.optimalMaximum,
      maximum: input.maximum !== undefined ? input.maximum : existing.maximum,
      preferred: input.preferred !== undefined ? input.preferred : existing.preferred,
      unit: input.unit ?? existing.unit,
      toleranceLevel: input.toleranceLevel ?? existing.toleranceLevel,
      importanceLevel: input.importanceLevel ?? existing.importanceLevel,
      description: input.description !== undefined ? input.description : existing.description,
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

    const siblings = await this.repo.listWaterRequirementItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(next, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      existing.isActive = true;
      existing.updatedAt = now;
      await this.repo.upsertWaterRequirement(existing);
      throw httpError(422, 'WATER_REQUIREMENT_INVALID', 'Water requirement validation failed', {
        issues: hard,
      });
    }

    return this.repo.upsertWaterRequirement(next);
  }

  async deleteRequirement(
    cropKnowledgeId: string,
    requirementId: string,
  ): Promise<WaterRequirement> {
    const existing = await this.repo.getWaterRequirementById(requirementId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'WATER_REQUIREMENT_NOT_FOUND', 'Water requirement not found');
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    return this.repo.upsertWaterRequirement(existing);
  }

  validate(cropKnowledgeId: string) {
    return this.validation.validate(cropKnowledgeId);
  }
}

/**
 * Seeds Draft WaterRequirement shells for every catalog factor.
 * Numeric thresholds remain null.
 */
export async function seedCropWaterRequirements(
  ckRepo: CropKnowledgeRepository,
): Promise<void> {
  const roots = await ckRepo.listKnowledge(true);
  const now = new Date().toISOString();

  for (const knowledge of roots) {
    let section = await ckRepo.getWaterRequirements(knowledge.id);
    if (!section) {
      section = await ckRepo.upsertWaterRequirements({
        id: newId(),
        cropKnowledgeId: knowledge.id,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Water Requirements — Phase 2.1E shells; thresholds deferred.',
      });
    }

    const existing = await ckRepo.listWaterRequirementItems(knowledge.id, true);
    const present = new Set(existing.map((r) => r.waterFactor));

    for (const catalog of WATER_FACTOR_CATALOG) {
      if (present.has(catalog.waterFactor)) continue;
      await ckRepo.upsertWaterRequirement({
        id: newId(),
        cropId: knowledge.id,
        cropKnowledgeId: knowledge.id,
        waterRequirementsId: section.id,
        waterFactor: catalog.waterFactor,
        minimum: null,
        optimalMinimum: null,
        optimalMaximum: null,
        maximum: null,
        preferred: null,
        unit: catalog.unit,
        toleranceLevel: 'Unknown',
        importanceLevel: catalog.importanceLevel,
        description: catalog.description,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        version: 1,
        isActive: true,
      });
    }
  }
}
