import { z } from 'zod';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  CALENDAR_REGION_SCOPES,
  type CalendarRegionScope,
  type ProductionCalendar,
  type ProductionCalendarValidationIssue,
  type ProductionCalendarValidationResult,
} from '../calendar/production-calendar.types.js';

export const calendarRegionScopeSchema = z.enum([
  'Country',
  'Province',
  'District',
  'AgroClimatic',
  'Custom',
]) satisfies z.ZodType<CalendarRegionScope>;

const verificationStatusSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

/** Calendar window day: YYYY-MM-DD or MM-DD (year-agnostic seasonal). */
const calendarDateSchema = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2}|\d{2}-\d{2})$/, 'Expected YYYY-MM-DD or MM-DD')
  .nullable()
  .optional();

export const createProductionCalendarSchema = z.object({
  regionId: z.string().min(1).max(128),
  regionScope: calendarRegionScopeSchema,
  regionCode: z.string().min(1).max(64).nullable().optional(),
  parentRegionId: z.string().min(1).max(128).nullable().optional(),
  plantingStart: calendarDateSchema,
  plantingEnd: calendarDateSchema,
  harvestStart: calendarDateSchema,
  harvestEnd: calendarDateSchema,
  secondCropSupported: z.boolean().optional(),
  greenhouseSupported: z.boolean().optional(),
  rainfedSupported: z.boolean().optional(),
  irrigatedSupported: z.boolean().optional(),
  sourceReferenceId: z.string().uuid().nullable().optional(),
  verificationStatus: verificationStatusSchema.optional(),
});

export const updateProductionCalendarSchema = createProductionCalendarSchema.partial();

export type CreateProductionCalendarInput = z.infer<typeof createProductionCalendarSchema>;
export type UpdateProductionCalendarInput = z.infer<typeof updateProductionCalendarSchema>;

function normalizeDay(value: string): string {
  // Compare MM-DD portion for both YYYY-MM-DD and MM-DD
  return value.length === 5 ? value : value.slice(5);
}

function isAfter(a: string, b: string): boolean {
  return normalizeDay(a) > normalizeDay(b);
}

export class ProductionCalendarValidationService {
  constructor(private readonly repo: CropKnowledgeRepository) {}

  async validate(cropKnowledgeId: string): Promise<ProductionCalendarValidationResult> {
    const issues: ProductionCalendarValidationIssue[] = [];
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

    const section = await this.repo.getProductionCalendar(cropKnowledgeId);
    if (!section) {
      issues.push({
        code: 'PRODUCTION_CALENDAR_SECTION_MISSING',
        severity: 'error',
        message: 'CropProductionCalendar section is required',
      });
    }

    const items = await this.repo.listProductionCalendarItems(cropKnowledgeId, true);
    if (items.length === 0) {
      issues.push({
        code: 'PRODUCTION_CALENDARS_EMPTY',
        severity: 'warning',
        message:
          'No region calendars defined yet (expected in Phase 2.1H — no invented date data)',
      });
    }

    const regionIds = items.map((i) => i.regionId);
    if (new Set(regionIds).size !== regionIds.length) {
      issues.push({
        code: 'REGION_ID_DUPLICATE',
        severity: 'error',
        message: 'RegionId must be unique within a crop',
        path: 'regionId',
      });
    }

    for (const item of items) {
      this.validateEntity(item, issues);
    }

    return {
      cropKnowledgeId,
      valid: issues.every((i) => i.severity !== 'error'),
      issues,
    };
  }

  validateEntity(
    row: ProductionCalendar,
    issues: ProductionCalendarValidationIssue[] = [],
  ): ProductionCalendarValidationIssue[] {
    if (!CALENDAR_REGION_SCOPES.includes(row.regionScope)) {
      issues.push({
        code: 'REGION_SCOPE_INVALID',
        severity: 'error',
        message: 'Invalid CalendarRegionScope',
        path: 'regionScope',
      });
    }
    if (!row.regionId?.trim()) {
      issues.push({
        code: 'REGION_ID_REQUIRED',
        severity: 'error',
        message: 'RegionId is required',
        path: 'regionId',
      });
    }

    if (row.regionScope === 'District' && !row.parentRegionId) {
      issues.push({
        code: 'PARENT_REGION_MISSING',
        severity: 'warning',
        message: 'District calendars should reference a parent Province RegionId',
        path: 'parentRegionId',
      });
    }

    const { plantingStart, plantingEnd, harvestStart, harvestEnd } = row;
    if (plantingStart && plantingEnd && isAfter(plantingStart, plantingEnd)) {
      issues.push({
        code: 'PLANTING_WINDOW_INVALID',
        severity: 'error',
        message: 'PlantingStart cannot be after PlantingEnd',
        path: 'plantingStart',
      });
    }
    if (harvestStart && harvestEnd && isAfter(harvestStart, harvestEnd)) {
      issues.push({
        code: 'HARVEST_WINDOW_INVALID',
        severity: 'error',
        message: 'HarvestStart cannot be after HarvestEnd',
        path: 'harvestStart',
      });
    }

    if ([plantingStart, plantingEnd, harvestStart, harvestEnd].every((v) => v == null)) {
      issues.push({
        code: 'CALENDAR_WINDOWS_UNSET',
        severity: 'warning',
        message: `Region ${row.regionId} has no planting/harvest windows yet`,
        path: 'plantingStart',
      });
    }

    if (
      !row.secondCropSupported &&
      !row.greenhouseSupported &&
      !row.rainfedSupported &&
      !row.irrigatedSupported
    ) {
      issues.push({
        code: 'PRODUCTION_MODE_UNSET',
        severity: 'warning',
        message: 'No production mode flags set for this region calendar',
        path: 'irrigatedSupported',
      });
    }

    if (row.verificationStatus === 'Approved') {
      issues.push({
        code: 'PREMATURE_APPROVAL',
        severity: 'error',
        message: 'Approved status is not allowed without expert workflow',
        path: 'verificationStatus',
      });
    }

    return issues;
  }

  validateWriteCandidate(
    candidate: ProductionCalendar,
    siblings: ProductionCalendar[],
  ): ProductionCalendarValidationIssue[] {
    const issues: ProductionCalendarValidationIssue[] = [];
    const others = siblings.filter((s) => s.id !== candidate.id);
    if (others.some((s) => s.regionId === candidate.regionId)) {
      issues.push({
        code: 'REGION_ID_DUPLICATE',
        severity: 'error',
        message: 'Same RegionId cannot repeat for a crop',
        path: 'regionId',
      });
    }
    this.validateEntity(candidate, issues);
    return issues;
  }
}
