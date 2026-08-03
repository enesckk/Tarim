import { randomUUID } from 'node:crypto';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import type {
  CropReferencesDto,
  CropScientificReferenceLink,
  ScientificReference,
} from './scientific-reference.types.js';
import {
  ScientificReferenceValidationService,
  type CreateScientificReferenceInput,
  type UpdateScientificReferenceInput,
} from '../services/scientific-reference-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

export class ScientificReferenceLibraryService {
  readonly validation: ScientificReferenceValidationService;

  constructor(private readonly repo: CropKnowledgeRepository) {
    this.validation = new ScientificReferenceValidationService(repo);
  }

  listReferences(activeOnly = true) {
    return this.repo.listScientificReferences(activeOnly);
  }

  getReferenceById(id: string) {
    return this.repo.getScientificReferenceById(id);
  }

  async createReference(input: CreateScientificReferenceInput): Promise<ScientificReference> {
    const now = new Date().toISOString();
    const candidate: ScientificReference = {
      id: newId(),
      title: input.title,
      authors: input.authors ?? [],
      organization: input.organization ?? null,
      publicationYear: input.publicationYear ?? null,
      country: input.country ?? null,
      doi: input.doi ?? null,
      isbn: input.isbn ?? null,
      issn: input.issn ?? null,
      url: input.url ?? null,
      referenceType: input.referenceType,
      language: input.language ?? null,
      reliabilityScore: input.reliabilityScore ?? null,
      notes: input.notes ?? null,
      sourceReferenceId: input.sourceReferenceId ?? null,
      verificationStatus: input.verificationStatus ?? 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };

    const issues = this.validation.validateEntity(candidate);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      throw httpError(422, 'SCIENTIFIC_REFERENCE_INVALID', 'Scientific reference validation failed', {
        issues: hard,
      });
    }

    return this.repo.upsertScientificReference(candidate);
  }

  async updateReference(
    referenceId: string,
    input: UpdateScientificReferenceInput,
  ): Promise<ScientificReference> {
    const existing = await this.repo.getScientificReferenceById(referenceId);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'SCIENTIFIC_REFERENCE_NOT_FOUND', 'Scientific reference not found');
    }

    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertScientificReference(existing);

    const next: ScientificReference = {
      ...existing,
      id: newId(),
      title: input.title ?? existing.title,
      authors: input.authors ?? existing.authors,
      organization: input.organization !== undefined ? input.organization : existing.organization,
      publicationYear:
        input.publicationYear !== undefined ? input.publicationYear : existing.publicationYear,
      country: input.country !== undefined ? input.country : existing.country,
      doi: input.doi !== undefined ? input.doi : existing.doi,
      isbn: input.isbn !== undefined ? input.isbn : existing.isbn,
      issn: input.issn !== undefined ? input.issn : existing.issn,
      url: input.url !== undefined ? input.url : existing.url,
      referenceType: input.referenceType ?? existing.referenceType,
      language: input.language !== undefined ? input.language : existing.language,
      reliabilityScore:
        input.reliabilityScore !== undefined ? input.reliabilityScore : existing.reliabilityScore,
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

    const issues = this.validation.validateEntity(next);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      existing.isActive = true;
      existing.updatedAt = now;
      await this.repo.upsertScientificReference(existing);
      throw httpError(422, 'SCIENTIFIC_REFERENCE_INVALID', 'Scientific reference validation failed', {
        issues: hard,
      });
    }

    const saved = await this.repo.upsertScientificReference(next);

    // Remap active crop links to the new version id
    const links = await this.repo.listAllCropScientificReferenceLinks(true);
    for (const link of links) {
      if (link.scientificReferenceId !== referenceId || !link.isActive) continue;
      link.isActive = false;
      link.updatedAt = now;
      await this.repo.upsertCropScientificReferenceLink(link);
      await this.repo.upsertCropScientificReferenceLink({
        ...link,
        id: newId(),
        scientificReferenceId: saved.id,
        createdAt: link.createdAt,
        updatedAt: now,
        isActive: true,
      });
      await this.syncSectionReferenceIds(link.cropKnowledgeId);
    }

    return saved;
  }

  async deleteReference(referenceId: string): Promise<ScientificReference> {
    const existing = await this.repo.getScientificReferenceById(referenceId);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'SCIENTIFIC_REFERENCE_NOT_FOUND', 'Scientific reference not found');
    }
    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;

    const links = await this.repo.listAllCropScientificReferenceLinks(true);
    for (const link of links) {
      if (link.scientificReferenceId !== referenceId || !link.isActive) continue;
      link.isActive = false;
      link.updatedAt = now;
      await this.repo.upsertCropScientificReferenceLink(link);
      await this.syncSectionReferenceIds(link.cropKnowledgeId);
    }

    return this.repo.upsertScientificReference(existing);
  }

  async getCropAggregate(cropKnowledgeId: string): Promise<CropReferencesDto | null> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) return null;
    const section = await this.repo.getReferences(cropKnowledgeId);
    if (!section) return null;
    const links = await this.repo.listCropScientificReferenceLinks(cropKnowledgeId, true);
    const references: ScientificReference[] = [];
    for (const link of links) {
      const ref = await this.repo.getScientificReferenceById(link.scientificReferenceId);
      if (ref && ref.isActive) references.push(ref);
    }
    references.sort((a, b) => a.title.localeCompare(b.title));
    return {
      sectionId: section.id,
      cropKnowledgeId,
      cropCode: knowledge.cropCode,
      notes: section.notes,
      references,
      links,
    };
  }

  async getCropAggregateByCropCode(cropCode: string): Promise<CropReferencesDto | null> {
    const knowledge = await this.repo.getKnowledgeByCropCode(cropCode);
    if (!knowledge) return null;
    return this.getCropAggregate(knowledge.id);
  }

  listCropReferences(cropKnowledgeId: string) {
    return this.getCropAggregate(cropKnowledgeId).then((dto) => dto?.references ?? []);
  }

  async linkReference(
    cropKnowledgeId: string,
    scientificReferenceId: string,
  ): Promise<CropScientificReferenceLink> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) throw httpError(404, 'CROP_KNOWLEDGE_NOT_FOUND', 'Crop knowledge not found');

    const ref = await this.repo.getScientificReferenceById(scientificReferenceId);
    if (!ref || !ref.isActive) {
      throw httpError(404, 'SCIENTIFIC_REFERENCE_NOT_FOUND', 'Scientific reference not found');
    }

    let section = await this.repo.getReferences(cropKnowledgeId);
    const now = new Date().toISOString();
    if (!section) {
      section = await this.repo.upsertReferences({
        id: newId(),
        cropKnowledgeId,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        referenceIds: [],
        notes: 'Crop References — Phase 2.1I Scientific Reference Library links.',
      });
    }

    const existing = await this.repo.getCropScientificReferenceLink(
      cropKnowledgeId,
      scientificReferenceId,
    );
    if (existing) {
      throw httpError(422, 'REFERENCE_LINK_DUPLICATE', 'Reference already linked to this crop');
    }

    const link: CropScientificReferenceLink = {
      id: newId(),
      cropKnowledgeId,
      scientificReferenceId,
      referencesSectionId: section.id,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    const saved = await this.repo.upsertCropScientificReferenceLink(link);
    await this.syncSectionReferenceIds(cropKnowledgeId);
    return saved;
  }

  async unlinkReference(
    cropKnowledgeId: string,
    scientificReferenceId: string,
  ): Promise<CropScientificReferenceLink> {
    const existing = await this.repo.getCropScientificReferenceLink(
      cropKnowledgeId,
      scientificReferenceId,
    );
    if (!existing || !existing.isActive) {
      throw httpError(404, 'REFERENCE_LINK_NOT_FOUND', 'Crop–reference link not found');
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    const saved = await this.repo.upsertCropScientificReferenceLink(existing);
    await this.syncSectionReferenceIds(cropKnowledgeId);
    return saved;
  }

  validateReference(referenceId: string) {
    return this.validation.validateReference(referenceId);
  }

  validateCropLinks(cropKnowledgeId: string) {
    return this.validation.validateCropLinks(cropKnowledgeId);
  }

  private async syncSectionReferenceIds(cropKnowledgeId: string): Promise<void> {
    const section = await this.repo.getReferences(cropKnowledgeId);
    if (!section) return;
    const links = await this.repo.listCropScientificReferenceLinks(cropKnowledgeId, true);
    section.referenceIds = links.map((l) => l.scientificReferenceId);
    section.updatedAt = new Date().toISOString();
    await this.repo.upsertReferences(section);
  }
}

/**
 * Ensures References section shells exist.
 * Does NOT invent bibliographic ScientificReference rows.
 */
export async function seedScientificReferenceLibrary(
  ckRepo: CropKnowledgeRepository,
): Promise<void> {
  const roots = await ckRepo.listKnowledge(true);
  const now = new Date().toISOString();

  for (const knowledge of roots) {
    const section = await ckRepo.getReferences(knowledge.id);
    if (section) continue;
    await ckRepo.upsertReferences({
      id: newId(),
      cropKnowledgeId: knowledge.id,
      version: 1,
      sourceReferenceId: knowledge.sourceReferenceId,
      verificationStatus: 'Draft',
      createdAt: now,
      updatedAt: now,
      isActive: true,
      referenceIds: [],
      notes: 'Crop References — Phase 2.1I shell; library links deferred.',
    });
  }
}
