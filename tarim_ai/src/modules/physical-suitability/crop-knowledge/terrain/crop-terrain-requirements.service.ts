import { randomUUID } from 'node:crypto';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  TERRAIN_FACTOR_CATALOG,
  type CropTerrainRequirementsDto,
  type TerrainFactor,
  type TerrainRequirement,
} from './terrain-requirement.types.js';
import {
  TerrainRequirementsValidationService,
  type CreateTerrainRequirementInput,
  type UpdateTerrainRequirementInput,
} from '../services/terrain-requirements-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

export class CropTerrainRequirementsService {
  readonly validation: TerrainRequirementsValidationService;

  constructor(private readonly repo: CropKnowledgeRepository) {
    this.validation = new TerrainRequirementsValidationService(repo);
  }

  async getAggregate(cropKnowledgeId: string): Promise<CropTerrainRequirementsDto | null> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) return null;
    const section = await this.repo.getTerrainRequirements(cropKnowledgeId);
    if (!section) return null;
    const requirements = await this.repo.listTerrainRequirementItems(cropKnowledgeId, true);
    return {
      sectionId: section.id,
      cropKnowledgeId,
      cropCode: knowledge.cropCode,
      notes: section.notes,
      requirements,
    };
  }

  async getAggregateByCropCode(cropCode: string): Promise<CropTerrainRequirementsDto | null> {
    const knowledge = await this.repo.getKnowledgeByCropCode(cropCode);
    if (!knowledge) return null;
    return this.getAggregate(knowledge.id);
  }

  listRequirements(cropKnowledgeId: string) {
    return this.repo.listTerrainRequirementItems(cropKnowledgeId, true);
  }

  getRequirementById(id: string) {
    return this.repo.getTerrainRequirementById(id);
  }

  getRequirementByFactor(cropKnowledgeId: string, terrainFactor: TerrainFactor) {
    return this.repo.getTerrainRequirementByFactor(cropKnowledgeId, terrainFactor);
  }

  async createRequirement(
    cropKnowledgeId: string,
    input: CreateTerrainRequirementInput,
  ): Promise<TerrainRequirement> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) throw httpError(404, 'CROP_KNOWLEDGE_NOT_FOUND', 'Crop knowledge not found');

    let section = await this.repo.getTerrainRequirements(cropKnowledgeId);
    const now = new Date().toISOString();
    if (!section) {
      section = await this.repo.upsertTerrainRequirements({
        id: newId(),
        cropKnowledgeId,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Terrain Requirements — Phase 2.1F data model.',
      });
    }

    const catalog = TERRAIN_FACTOR_CATALOG.find((c) => c.terrainFactor === input.terrainFactor);
    const candidate: TerrainRequirement = {
      id: newId(),
      cropId: cropKnowledgeId,
      cropKnowledgeId,
      terrainRequirementsId: section.id,
      terrainFactor: input.terrainFactor,
      minimum: input.minimum ?? null,
      optimalMinimum: input.optimalMinimum ?? null,
      optimalMaximum: input.optimalMaximum ?? null,
      maximum: input.maximum ?? null,
      preferred: input.preferred ?? null,
      unit: input.unit ?? catalog?.unit ?? this.validation.defaultUnit(input.terrainFactor),
      description: input.description ?? catalog?.description ?? null,
      sourceReferenceId: input.sourceReferenceId ?? knowledge.sourceReferenceId,
      verificationStatus: input.verificationStatus ?? 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };

    const siblings = await this.repo.listTerrainRequirementItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(candidate, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      throw httpError(422, 'TERRAIN_REQUIREMENT_INVALID', 'Terrain requirement validation failed', {
        issues: hard,
      });
    }

    return this.repo.upsertTerrainRequirement(candidate);
  }

  async updateRequirement(
    cropKnowledgeId: string,
    requirementId: string,
    input: UpdateTerrainRequirementInput,
  ): Promise<TerrainRequirement> {
    const existing = await this.repo.getTerrainRequirementById(requirementId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'TERRAIN_REQUIREMENT_NOT_FOUND', 'Terrain requirement not found');
    }

    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertTerrainRequirement(existing);

    const next: TerrainRequirement = {
      ...existing,
      id: newId(),
      terrainFactor: input.terrainFactor ?? existing.terrainFactor,
      minimum: input.minimum !== undefined ? input.minimum : existing.minimum,
      optimalMinimum:
        input.optimalMinimum !== undefined ? input.optimalMinimum : existing.optimalMinimum,
      optimalMaximum:
        input.optimalMaximum !== undefined ? input.optimalMaximum : existing.optimalMaximum,
      maximum: input.maximum !== undefined ? input.maximum : existing.maximum,
      preferred: input.preferred !== undefined ? input.preferred : existing.preferred,
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

    const siblings = await this.repo.listTerrainRequirementItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(next, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      existing.isActive = true;
      existing.updatedAt = now;
      await this.repo.upsertTerrainRequirement(existing);
      throw httpError(422, 'TERRAIN_REQUIREMENT_INVALID', 'Terrain requirement validation failed', {
        issues: hard,
      });
    }

    return this.repo.upsertTerrainRequirement(next);
  }

  async deleteRequirement(
    cropKnowledgeId: string,
    requirementId: string,
  ): Promise<TerrainRequirement> {
    const existing = await this.repo.getTerrainRequirementById(requirementId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'TERRAIN_REQUIREMENT_NOT_FOUND', 'Terrain requirement not found');
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    return this.repo.upsertTerrainRequirement(existing);
  }

  validate(cropKnowledgeId: string) {
    return this.validation.validate(cropKnowledgeId);
  }
}

/**
 * Seeds Draft TerrainRequirement shells for every catalog factor.
 * Numeric thresholds remain null.
 */
export async function seedCropTerrainRequirements(
  ckRepo: CropKnowledgeRepository,
): Promise<void> {
  const roots = await ckRepo.listKnowledge(true);
  const now = new Date().toISOString();

  for (const knowledge of roots) {
    let section = await ckRepo.getTerrainRequirements(knowledge.id);
    if (!section) {
      section = await ckRepo.upsertTerrainRequirements({
        id: newId(),
        cropKnowledgeId: knowledge.id,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Terrain Requirements — Phase 2.1F shells; thresholds deferred.',
      });
    }

    const existing = await ckRepo.listTerrainRequirementItems(knowledge.id, true);
    const present = new Set(existing.map((r) => r.terrainFactor));

    for (const catalog of TERRAIN_FACTOR_CATALOG) {
      if (present.has(catalog.terrainFactor)) continue;
      await ckRepo.upsertTerrainRequirement({
        id: newId(),
        cropId: knowledge.id,
        cropKnowledgeId: knowledge.id,
        terrainRequirementsId: section.id,
        terrainFactor: catalog.terrainFactor,
        minimum: null,
        optimalMinimum: null,
        optimalMaximum: null,
        maximum: null,
        preferred: null,
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
