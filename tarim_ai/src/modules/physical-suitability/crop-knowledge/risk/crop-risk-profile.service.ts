import { randomUUID } from 'node:crypto';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  RISK_TYPE_CATALOG,
  type CropRisk,
  type CropRiskProfileDto,
  type RiskType,
} from './crop-risk.types.js';
import {
  CropRiskValidationService,
  type CreateCropRiskInput,
  type UpdateCropRiskInput,
} from '../services/crop-risk-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

export class CropRiskProfileService {
  readonly validation: CropRiskValidationService;

  constructor(private readonly repo: CropKnowledgeRepository) {
    this.validation = new CropRiskValidationService(repo);
  }

  async getAggregate(cropKnowledgeId: string): Promise<CropRiskProfileDto | null> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) return null;
    const section = await this.repo.getRiskProfile(cropKnowledgeId);
    if (!section) return null;
    const risks = await this.repo.listCropRiskItems(cropKnowledgeId, true);
    return {
      sectionId: section.id,
      cropKnowledgeId,
      cropCode: knowledge.cropCode,
      notes: section.notes,
      risks,
    };
  }

  async getAggregateByCropCode(cropCode: string): Promise<CropRiskProfileDto | null> {
    const knowledge = await this.repo.getKnowledgeByCropCode(cropCode);
    if (!knowledge) return null;
    return this.getAggregate(knowledge.id);
  }

  listRisks(cropKnowledgeId: string) {
    return this.repo.listCropRiskItems(cropKnowledgeId, true);
  }

  getRiskById(id: string) {
    return this.repo.getCropRiskById(id);
  }

  getRiskByType(cropKnowledgeId: string, riskType: RiskType) {
    return this.repo.getCropRiskByType(cropKnowledgeId, riskType);
  }

  async createRisk(cropKnowledgeId: string, input: CreateCropRiskInput): Promise<CropRisk> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) throw httpError(404, 'CROP_KNOWLEDGE_NOT_FOUND', 'Crop knowledge not found');

    let section = await this.repo.getRiskProfile(cropKnowledgeId);
    const now = new Date().toISOString();
    if (!section) {
      section = await this.repo.upsertRiskProfile({
        id: newId(),
        cropKnowledgeId,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Risk Profile — Phase 2.1G data model.',
      });
    }

    const catalog = RISK_TYPE_CATALOG.find((c) => c.riskType === input.riskType);
    const candidate: CropRisk = {
      id: newId(),
      cropId: cropKnowledgeId,
      cropKnowledgeId,
      riskProfileId: section.id,
      riskType: input.riskType,
      riskLevel: input.riskLevel ?? 'Unknown',
      sensitivity: input.sensitivity ?? 'Unknown',
      description: input.description ?? catalog?.description ?? null,
      mitigationSuggestion: input.mitigationSuggestion ?? null,
      sourceReferenceId: input.sourceReferenceId ?? knowledge.sourceReferenceId,
      verificationStatus: input.verificationStatus ?? 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };

    const siblings = await this.repo.listCropRiskItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(candidate, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      throw httpError(422, 'CROP_RISK_INVALID', 'Crop risk validation failed', { issues: hard });
    }

    return this.repo.upsertCropRisk(candidate);
  }

  async updateRisk(
    cropKnowledgeId: string,
    riskId: string,
    input: UpdateCropRiskInput,
  ): Promise<CropRisk> {
    const existing = await this.repo.getCropRiskById(riskId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'CROP_RISK_NOT_FOUND', 'Crop risk not found');
    }

    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertCropRisk(existing);

    const next: CropRisk = {
      ...existing,
      id: newId(),
      riskType: input.riskType ?? existing.riskType,
      riskLevel: input.riskLevel ?? existing.riskLevel,
      sensitivity: input.sensitivity ?? existing.sensitivity,
      description: input.description !== undefined ? input.description : existing.description,
      mitigationSuggestion:
        input.mitigationSuggestion !== undefined
          ? input.mitigationSuggestion
          : existing.mitigationSuggestion,
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

    const siblings = await this.repo.listCropRiskItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(next, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      existing.isActive = true;
      existing.updatedAt = now;
      await this.repo.upsertCropRisk(existing);
      throw httpError(422, 'CROP_RISK_INVALID', 'Crop risk validation failed', { issues: hard });
    }

    return this.repo.upsertCropRisk(next);
  }

  async deleteRisk(cropKnowledgeId: string, riskId: string): Promise<CropRisk> {
    const existing = await this.repo.getCropRiskById(riskId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'CROP_RISK_NOT_FOUND', 'Crop risk not found');
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    return this.repo.upsertCropRisk(existing);
  }

  validate(cropKnowledgeId: string) {
    return this.validation.validate(cropKnowledgeId);
  }
}

/**
 * Seeds Draft CropRisk shells for every catalog risk type.
 * RiskLevel / Sensitivity remain Unknown; mitigation remains null.
 */
export async function seedCropRiskProfile(ckRepo: CropKnowledgeRepository): Promise<void> {
  const roots = await ckRepo.listKnowledge(true);
  const now = new Date().toISOString();

  for (const knowledge of roots) {
    let section = await ckRepo.getRiskProfile(knowledge.id);
    if (!section) {
      section = await ckRepo.upsertRiskProfile({
        id: newId(),
        cropKnowledgeId: knowledge.id,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: 'Crop Risk Profile — Phase 2.1G shells; levels deferred.',
      });
    }

    const existing = await ckRepo.listCropRiskItems(knowledge.id, true);
    const present = new Set(existing.map((r) => r.riskType));

    for (const catalog of RISK_TYPE_CATALOG) {
      if (present.has(catalog.riskType)) continue;
      await ckRepo.upsertCropRisk({
        id: newId(),
        cropId: knowledge.id,
        cropKnowledgeId: knowledge.id,
        riskProfileId: section.id,
        riskType: catalog.riskType,
        riskLevel: 'Unknown',
        sensitivity: 'Unknown',
        description: catalog.description,
        mitigationSuggestion: null,
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
