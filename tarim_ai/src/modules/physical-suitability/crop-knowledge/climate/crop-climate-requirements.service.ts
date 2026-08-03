import { randomUUID } from 'node:crypto';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  CLIMATE_FACTOR_CATALOG,
  type ClimateFactor,
  type ClimateRequirement,
  type CropClimateRequirementsDto,
} from '../climate/climate-requirement.types.js';
import {
  ClimateRequirementsValidationService,
  type CreateClimateRequirementInput,
  type UpdateClimateRequirementInput,
} from '../services/climate-requirements-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

export class CropClimateRequirementsService {
  readonly validation: ClimateRequirementsValidationService;

  constructor(private readonly repo: CropKnowledgeRepository) {
    this.validation = new ClimateRequirementsValidationService(repo);
  }

  async getAggregate(cropKnowledgeId: string): Promise<CropClimateRequirementsDto | null> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) return null;
    const section = await this.repo.getClimateRequirements(cropKnowledgeId);
    if (!section) return null;
    const requirements = await this.repo.listClimateRequirementItems(cropKnowledgeId, true);
    return {
      sectionId: section.id,
      cropKnowledgeId,
      cropCode: knowledge.cropCode,
      notes: section.notes,
      requirements,
    };
  }

  async getAggregateByCropCode(cropCode: string): Promise<CropClimateRequirementsDto | null> {
    const knowledge = await this.repo.getKnowledgeByCropCode(cropCode);
    if (!knowledge) return null;
    return this.getAggregate(knowledge.id);
  }

  listRequirements(cropKnowledgeId: string) {
    return this.repo.listClimateRequirementItems(cropKnowledgeId, true);
  }

  getRequirementById(id: string) {
    return this.repo.getClimateRequirementById(id);
  }

  getRequirementByFactor(cropKnowledgeId: string, climateFactor: ClimateFactor) {
    return this.repo.getClimateRequirementByFactor(cropKnowledgeId, climateFactor);
  }

  async createRequirement(
    cropKnowledgeId: string,
    input: CreateClimateRequirementInput,
  ): Promise<ClimateRequirement> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) throw httpError(404, 'CROP_KNOWLEDGE_NOT_FOUND', 'Crop knowledge not found');

    let section = await this.repo.getClimateRequirements(cropKnowledgeId);
    const now = new Date().toISOString();
    if (!section) {
      section = await this.repo.upsertClimateRequirements({
        id: newId(),
        cropKnowledgeId,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Climate Requirements — Phase 2.1C data model.',
      });
    }

    const catalog = CLIMATE_FACTOR_CATALOG.find((c) => c.climateFactor === input.climateFactor);
    const candidate: ClimateRequirement = {
      id: newId(),
      cropId: cropKnowledgeId,
      cropKnowledgeId,
      climateRequirementsId: section.id,
      climateFactor: input.climateFactor,
      minimumValue: input.minimumValue ?? null,
      optimalMinimum: input.optimalMinimum ?? null,
      optimalMaximum: input.optimalMaximum ?? null,
      maximumValue: input.maximumValue ?? null,
      preferredValue: input.preferredValue ?? null,
      toleranceLevel: input.toleranceLevel ?? 'Unknown',
      importanceLevel: input.importanceLevel ?? catalog?.importanceLevel ?? 'Supporting',
      unit: input.unit ?? catalog?.unit ?? this.validation.defaultUnit(input.climateFactor),
      scientificExplanation:
        input.scientificExplanation ?? catalog?.scientificExplanation ?? null,
      notes: input.notes ?? null,
      sourceReferenceId: input.sourceReferenceId ?? knowledge.sourceReferenceId,
      verificationStatus: input.verificationStatus ?? 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };

    const siblings = await this.repo.listClimateRequirementItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(candidate, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      throw httpError(422, 'CLIMATE_REQUIREMENT_INVALID', 'Climate requirement validation failed', {
        issues: hard,
      });
    }

    return this.repo.upsertClimateRequirement(candidate);
  }

  async updateRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateClimateRequirementInput,
  ): Promise<ClimateRequirement> {
    const existing = await this.repo.getClimateRequirementById(requirementId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'CLIMATE_REQUIREMENT_NOT_FOUND', 'Climate requirement not found');
    }

    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertClimateRequirement(existing);

    const next: ClimateRequirement = {
      ...existing,
      id: newId(),
      climateFactor: input.climateFactor ?? existing.climateFactor,
      minimumValue:
        input.minimumValue !== undefined ? input.minimumValue : existing.minimumValue,
      optimalMinimum:
        input.optimalMinimum !== undefined ? input.optimalMinimum : existing.optimalMinimum,
      optimalMaximum:
        input.optimalMaximum !== undefined ? input.optimalMaximum : existing.optimalMaximum,
      maximumValue:
        input.maximumValue !== undefined ? input.maximumValue : existing.maximumValue,
      preferredValue:
        input.preferredValue !== undefined ? input.preferredValue : existing.preferredValue,
      toleranceLevel: input.toleranceLevel ?? existing.toleranceLevel,
      importanceLevel: input.importanceLevel ?? existing.importanceLevel,
      unit: input.unit ?? existing.unit,
      scientificExplanation:
        input.scientificExplanation !== undefined
          ? input.scientificExplanation
          : existing.scientificExplanation,
      notes: input.notes !== undefined ? input.notes : existing.notes,
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

    const siblings = await this.repo.listClimateRequirementItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(next, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      existing.isActive = true;
      existing.updatedAt = now;
      await this.repo.upsertClimateRequirement(existing);
      throw httpError(422, 'CLIMATE_REQUIREMENT_INVALID', 'Climate requirement validation failed', {
        issues: hard,
      });
    }

    return this.repo.upsertClimateRequirement(next);
  }

  async deleteRequirement(
    cropKnowledgeId: string,
    requirementId: string,
  ): Promise<ClimateRequirement> {
    const existing = await this.repo.getClimateRequirementById(requirementId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'CLIMATE_REQUIREMENT_NOT_FOUND', 'Climate requirement not found');
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    return this.repo.upsertClimateRequirement(existing);
  }

  validate(cropKnowledgeId: string) {
    return this.validation.validate(cropKnowledgeId);
  }
}

/**
 * Seeds Draft ClimateRequirement shells for every catalog factor.
 * Numeric thresholds remain null — no suitability values invented.
 */
export async function seedCropClimateRequirements(
  ckRepo: CropKnowledgeRepository,
): Promise<void> {
  const roots = await ckRepo.listKnowledge(true);
  const now = new Date().toISOString();

  for (const knowledge of roots) {
    let section = await ckRepo.getClimateRequirements(knowledge.id);
    if (!section) {
      section = await ckRepo.upsertClimateRequirements({
        id: newId(),
        cropKnowledgeId: knowledge.id,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Climate Requirements — Phase 2.1C shells; thresholds deferred.',
      });
    }

    const existing = await ckRepo.listClimateRequirementItems(knowledge.id, true);
    const present = new Set(existing.map((r) => r.climateFactor));

    for (const catalog of CLIMATE_FACTOR_CATALOG) {
      if (present.has(catalog.climateFactor)) continue;
      await ckRepo.upsertClimateRequirement({
        id: newId(),
        cropId: knowledge.id,
        cropKnowledgeId: knowledge.id,
        climateRequirementsId: section.id,
        climateFactor: catalog.climateFactor,
        minimumValue: null,
        optimalMinimum: null,
        optimalMaximum: null,
        maximumValue: null,
        preferredValue: null,
        toleranceLevel: 'Unknown',
        importanceLevel: catalog.importanceLevel,
        unit: catalog.unit,
        scientificExplanation: catalog.scientificExplanation,
        notes: 'Draft factor shell — numeric thresholds not filled in Phase 2.1C.',
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
