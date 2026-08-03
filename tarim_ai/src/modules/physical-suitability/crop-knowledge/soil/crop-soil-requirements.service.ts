import { randomUUID } from 'node:crypto';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  SOIL_FACTOR_CATALOG,
  type CropSoilRequirementsDto,
  type SoilFactor,
  type SoilRequirement,
} from './soil-requirement.types.js';
import {
  SoilRequirementsValidationService,
  type CreateSoilRequirementInput,
  type UpdateSoilRequirementInput,
} from '../services/soil-requirements-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

export class CropSoilRequirementsService {
  readonly validation: SoilRequirementsValidationService;

  constructor(private readonly repo: CropKnowledgeRepository) {
    this.validation = new SoilRequirementsValidationService(repo);
  }

  async getAggregate(cropKnowledgeId: string): Promise<CropSoilRequirementsDto | null> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) return null;
    const section = await this.repo.getSoilRequirements(cropKnowledgeId);
    if (!section) return null;
    const requirements = await this.repo.listSoilRequirementItems(cropKnowledgeId, true);
    return {
      sectionId: section.id,
      cropKnowledgeId,
      cropCode: knowledge.cropCode,
      notes: section.notes,
      requirements,
    };
  }

  async getAggregateByCropCode(cropCode: string): Promise<CropSoilRequirementsDto | null> {
    const knowledge = await this.repo.getKnowledgeByCropCode(cropCode);
    if (!knowledge) return null;
    return this.getAggregate(knowledge.id);
  }

  listRequirements(cropKnowledgeId: string) {
    return this.repo.listSoilRequirementItems(cropKnowledgeId, true);
  }

  getRequirementById(id: string) {
    return this.repo.getSoilRequirementById(id);
  }

  getRequirementByFactor(cropKnowledgeId: string, soilFactor: SoilFactor) {
    return this.repo.getSoilRequirementByFactor(cropKnowledgeId, soilFactor);
  }

  async createRequirement(
    cropKnowledgeId: string,
    input: CreateSoilRequirementInput,
  ): Promise<SoilRequirement> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) throw httpError(404, 'CROP_KNOWLEDGE_NOT_FOUND', 'Crop knowledge not found');

    let section = await this.repo.getSoilRequirements(cropKnowledgeId);
    const now = new Date().toISOString();
    if (!section) {
      section = await this.repo.upsertSoilRequirements({
        id: newId(),
        cropKnowledgeId,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Soil Requirements — Phase 2.1D data model.',
      });
    }

    const catalog = SOIL_FACTOR_CATALOG.find((c) => c.soilFactor === input.soilFactor);
    const candidate: SoilRequirement = {
      id: newId(),
      cropId: cropKnowledgeId,
      cropKnowledgeId,
      soilRequirementsId: section.id,
      soilFactor: input.soilFactor,
      minimum: input.minimum ?? null,
      optimalMinimum: input.optimalMinimum ?? null,
      optimalMaximum: input.optimalMaximum ?? null,
      maximum: input.maximum ?? null,
      preferred: input.preferred ?? null,
      importanceLevel: input.importanceLevel ?? catalog?.importanceLevel ?? 'Supporting',
      toleranceLevel: input.toleranceLevel ?? 'Unknown',
      unit: input.unit ?? catalog?.unit ?? this.validation.defaultUnit(input.soilFactor),
      description: input.description ?? catalog?.description ?? null,
      sourceReferenceId: input.sourceReferenceId ?? knowledge.sourceReferenceId,
      verificationStatus: input.verificationStatus ?? 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };

    const siblings = await this.repo.listSoilRequirementItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(candidate, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      throw httpError(422, 'SOIL_REQUIREMENT_INVALID', 'Soil requirement validation failed', {
        issues: hard,
      });
    }

    return this.repo.upsertSoilRequirement(candidate);
  }

  async updateRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateSoilRequirementInput,
  ): Promise<SoilRequirement> {
    const existing = await this.repo.getSoilRequirementById(requirementId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'SOIL_REQUIREMENT_NOT_FOUND', 'Soil requirement not found');
    }

    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertSoilRequirement(existing);

    const next: SoilRequirement = {
      ...existing,
      id: newId(),
      soilFactor: input.soilFactor ?? existing.soilFactor,
      minimum: input.minimum !== undefined ? input.minimum : existing.minimum,
      optimalMinimum:
        input.optimalMinimum !== undefined ? input.optimalMinimum : existing.optimalMinimum,
      optimalMaximum:
        input.optimalMaximum !== undefined ? input.optimalMaximum : existing.optimalMaximum,
      maximum: input.maximum !== undefined ? input.maximum : existing.maximum,
      preferred: input.preferred !== undefined ? input.preferred : existing.preferred,
      importanceLevel: input.importanceLevel ?? existing.importanceLevel,
      toleranceLevel: input.toleranceLevel ?? existing.toleranceLevel,
      unit: input.unit ?? existing.unit,
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

    const siblings = await this.repo.listSoilRequirementItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(next, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      existing.isActive = true;
      existing.updatedAt = now;
      await this.repo.upsertSoilRequirement(existing);
      throw httpError(422, 'SOIL_REQUIREMENT_INVALID', 'Soil requirement validation failed', {
        issues: hard,
      });
    }

    return this.repo.upsertSoilRequirement(next);
  }

  async deleteRequirement(
    cropKnowledgeId: string,
    requirementId: string,
  ): Promise<SoilRequirement> {
    const existing = await this.repo.getSoilRequirementById(requirementId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'SOIL_REQUIREMENT_NOT_FOUND', 'Soil requirement not found');
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    return this.repo.upsertSoilRequirement(existing);
  }

  validate(cropKnowledgeId: string) {
    return this.validation.validate(cropKnowledgeId);
  }
}

/**
 * Seeds Draft SoilRequirement shells for every catalog factor.
 * Numeric thresholds remain null — no lab linkage / suitability values.
 */
export async function seedCropSoilRequirements(
  ckRepo: CropKnowledgeRepository,
): Promise<void> {
  const roots = await ckRepo.listKnowledge(true);
  const now = new Date().toISOString();

  for (const knowledge of roots) {
    let section = await ckRepo.getSoilRequirements(knowledge.id);
    if (!section) {
      section = await ckRepo.upsertSoilRequirements({
        id: newId(),
        cropKnowledgeId: knowledge.id,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Soil Requirements — Phase 2.1D shells; thresholds deferred.',
      });
    }

    const existing = await ckRepo.listSoilRequirementItems(knowledge.id, true);
    const present = new Set(existing.map((r) => r.soilFactor));

    for (const catalog of SOIL_FACTOR_CATALOG) {
      if (present.has(catalog.soilFactor)) continue;
      await ckRepo.upsertSoilRequirement({
        id: newId(),
        cropId: knowledge.id,
        cropKnowledgeId: knowledge.id,
        soilRequirementsId: section.id,
        soilFactor: catalog.soilFactor,
        minimum: null,
        optimalMinimum: null,
        optimalMaximum: null,
        maximum: null,
        preferred: null,
        importanceLevel: catalog.importanceLevel,
        toleranceLevel: 'Unknown',
        unit: catalog.unit,
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
