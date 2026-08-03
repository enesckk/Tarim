import { randomUUID } from 'node:crypto';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import type {
  CropProductionCalendarDto,
  ProductionCalendar,
} from './production-calendar.types.js';
import {
  ProductionCalendarValidationService,
  type CreateProductionCalendarInput,
  type UpdateProductionCalendarInput,
} from '../services/production-calendar-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

export class CropProductionCalendarService {
  readonly validation: ProductionCalendarValidationService;

  constructor(private readonly repo: CropKnowledgeRepository) {
    this.validation = new ProductionCalendarValidationService(repo);
  }

  async getAggregate(cropKnowledgeId: string): Promise<CropProductionCalendarDto | null> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) return null;
    const section = await this.repo.getProductionCalendar(cropKnowledgeId);
    if (!section) return null;
    const calendars = await this.repo.listProductionCalendarItems(cropKnowledgeId, true);
    return {
      sectionId: section.id,
      cropKnowledgeId,
      cropCode: knowledge.cropCode,
      regionCode: section.regionCode,
      notes: section.notes,
      calendars,
    };
  }

  async getAggregateByCropCode(cropCode: string): Promise<CropProductionCalendarDto | null> {
    const knowledge = await this.repo.getKnowledgeByCropCode(cropCode);
    if (!knowledge) return null;
    return this.getAggregate(knowledge.id);
  }

  listCalendars(cropKnowledgeId: string) {
    return this.repo.listProductionCalendarItems(cropKnowledgeId, true);
  }

  getCalendarById(id: string) {
    return this.repo.getProductionCalendarItemById(id);
  }

  getCalendarByRegionId(cropKnowledgeId: string, regionId: string) {
    return this.repo.getProductionCalendarItemByRegionId(cropKnowledgeId, regionId);
  }

  async createCalendar(
    cropKnowledgeId: string,
    input: CreateProductionCalendarInput,
  ): Promise<ProductionCalendar> {
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) throw httpError(404, 'CROP_KNOWLEDGE_NOT_FOUND', 'Crop knowledge not found');

    let section = await this.repo.getProductionCalendar(cropKnowledgeId);
    const now = new Date().toISOString();
    if (!section) {
      section = await this.repo.upsertProductionCalendar({
        id: newId(),
        cropKnowledgeId,
        version: 1,
        sourceReferenceId: knowledge.sourceReferenceId,
        verificationStatus: 'Draft',
        createdAt: now,
        updatedAt: now,
        isActive: true,
        regionCode: null,
        notes: 'Crop Production Calendar — Phase 2.1H data model.',
      });
    }

    const candidate: ProductionCalendar = {
      id: newId(),
      cropId: cropKnowledgeId,
      cropKnowledgeId,
      productionCalendarSectionId: section.id,
      regionId: input.regionId,
      regionScope: input.regionScope,
      regionCode: input.regionCode ?? null,
      parentRegionId: input.parentRegionId ?? null,
      plantingStart: input.plantingStart ?? null,
      plantingEnd: input.plantingEnd ?? null,
      harvestStart: input.harvestStart ?? null,
      harvestEnd: input.harvestEnd ?? null,
      secondCropSupported: input.secondCropSupported ?? false,
      greenhouseSupported: input.greenhouseSupported ?? false,
      rainfedSupported: input.rainfedSupported ?? false,
      irrigatedSupported: input.irrigatedSupported ?? false,
      sourceReferenceId: input.sourceReferenceId ?? knowledge.sourceReferenceId,
      verificationStatus: input.verificationStatus ?? 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };

    const siblings = await this.repo.listProductionCalendarItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(candidate, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      throw httpError(422, 'PRODUCTION_CALENDAR_INVALID', 'Production calendar validation failed', {
        issues: hard,
      });
    }

    return this.repo.upsertProductionCalendarItem(candidate);
  }

  async updateCalendar(
    cropKnowledgeId: string,
    calendarId: string,
    input: UpdateProductionCalendarInput,
  ): Promise<ProductionCalendar> {
    const existing = await this.repo.getProductionCalendarItemById(calendarId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'PRODUCTION_CALENDAR_NOT_FOUND', 'Production calendar not found');
    }

    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertProductionCalendarItem(existing);

    const next: ProductionCalendar = {
      ...existing,
      id: newId(),
      regionId: input.regionId ?? existing.regionId,
      regionScope: input.regionScope ?? existing.regionScope,
      regionCode: input.regionCode !== undefined ? input.regionCode : existing.regionCode,
      parentRegionId:
        input.parentRegionId !== undefined ? input.parentRegionId : existing.parentRegionId,
      plantingStart:
        input.plantingStart !== undefined ? input.plantingStart : existing.plantingStart,
      plantingEnd: input.plantingEnd !== undefined ? input.plantingEnd : existing.plantingEnd,
      harvestStart: input.harvestStart !== undefined ? input.harvestStart : existing.harvestStart,
      harvestEnd: input.harvestEnd !== undefined ? input.harvestEnd : existing.harvestEnd,
      secondCropSupported: input.secondCropSupported ?? existing.secondCropSupported,
      greenhouseSupported: input.greenhouseSupported ?? existing.greenhouseSupported,
      rainfedSupported: input.rainfedSupported ?? existing.rainfedSupported,
      irrigatedSupported: input.irrigatedSupported ?? existing.irrigatedSupported,
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

    const siblings = await this.repo.listProductionCalendarItems(cropKnowledgeId, true);
    const issues = this.validation.validateWriteCandidate(next, siblings);
    const hard = issues.filter((i) => i.severity === 'error');
    if (hard.length > 0) {
      existing.isActive = true;
      existing.updatedAt = now;
      await this.repo.upsertProductionCalendarItem(existing);
      throw httpError(422, 'PRODUCTION_CALENDAR_INVALID', 'Production calendar validation failed', {
        issues: hard,
      });
    }

    return this.repo.upsertProductionCalendarItem(next);
  }

  async deleteCalendar(cropKnowledgeId: string, calendarId: string): Promise<ProductionCalendar> {
    const existing = await this.repo.getProductionCalendarItemById(calendarId);
    if (!existing || !existing.isActive || existing.cropKnowledgeId !== cropKnowledgeId) {
      throw httpError(404, 'PRODUCTION_CALENDAR_NOT_FOUND', 'Production calendar not found');
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    return this.repo.upsertProductionCalendarItem(existing);
  }

  validate(cropKnowledgeId: string) {
    return this.validation.validate(cropKnowledgeId);
  }
}

/**
 * Ensures Production Calendar section shells exist.
 * Does NOT invent planting/harvest windows or province/district rows.
 */
export async function seedCropProductionCalendar(
  ckRepo: CropKnowledgeRepository,
): Promise<void> {
  const roots = await ckRepo.listKnowledge(true);
  const now = new Date().toISOString();

  for (const knowledge of roots) {
    const section = await ckRepo.getProductionCalendar(knowledge.id);
    if (section) continue;
    await ckRepo.upsertProductionCalendar({
      id: newId(),
      cropKnowledgeId: knowledge.id,
      version: 1,
      sourceReferenceId: knowledge.sourceReferenceId,
      verificationStatus: 'Draft',
      createdAt: now,
      updatedAt: now,
      isActive: true,
      regionCode: null,
      notes: 'Crop Production Calendar — Phase 2.1H shell; region rows deferred.',
    });
  }
}
