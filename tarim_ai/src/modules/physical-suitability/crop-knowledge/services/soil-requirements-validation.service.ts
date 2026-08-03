import { z } from 'zod';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  SOIL_FACTORS,
  SOIL_FACTOR_CATALOG,
  type SoilFactor,
  type SoilImportanceLevel,
  type SoilRequirement,
  type SoilRequirementsValidationIssue,
  type SoilRequirementsValidationResult,
  type SoilToleranceLevel,
} from '../soil/soil-requirement.types.js';

export const soilFactorSchema = z.enum([
  'TEXTURE',
  'PH',
  'EC',
  'ORGANIC_MATTER',
  'LIME',
  'CEC',
  'BULK_DENSITY',
  'ROOTING_DEPTH',
  'DRAINAGE',
  'STONE_CONTENT',
  'SALINITY',
  'SODICITY',
  'SOIL_DEPTH',
  'SOIL_MOISTURE',
  'FIELD_CAPACITY',
  'PERMANENT_WILTING_POINT',
]) satisfies z.ZodType<SoilFactor>;

const toleranceSchema = z.enum([
  'Unknown',
  'Narrow',
  'Moderate',
  'Wide',
]) satisfies z.ZodType<SoilToleranceLevel>;

const importanceSchema = z.enum([
  'Required',
  'Important',
  'Supporting',
  'Optional',
]) satisfies z.ZodType<SoilImportanceLevel>;

const verificationStatusSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

const nullableNumber = z.number().nullable().optional();

export const createSoilRequirementSchema = z.object({
  soilFactor: soilFactorSchema,
  minimum: nullableNumber,
  optimalMinimum: nullableNumber,
  optimalMaximum: nullableNumber,
  maximum: nullableNumber,
  preferred: nullableNumber,
  importanceLevel: importanceSchema.optional(),
  toleranceLevel: toleranceSchema.optional(),
  unit: z.string().min(1).max(64).optional(),
  description: z.string().max(8000).nullable().optional(),
  sourceReferenceId: z.string().uuid().nullable().optional(),
  verificationStatus: verificationStatusSchema.optional(),
});

export const updateSoilRequirementSchema = createSoilRequirementSchema.partial().extend({
  soilFactor: soilFactorSchema.optional(),
});

export type CreateSoilRequirementInput = z.infer<typeof createSoilRequirementSchema>;
export type UpdateSoilRequirementInput = z.infer<typeof updateSoilRequirementSchema>;

export class SoilRequirementsValidationService {
  constructor(private readonly repo: CropKnowledgeRepository) {}

  async validate(cropKnowledgeId: string): Promise<SoilRequirementsValidationResult> {
    const issues: SoilRequirementsValidationIssue[] = [];
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

    const section = await this.repo.getSoilRequirements(cropKnowledgeId);
    if (!section) {
      issues.push({
        code: 'SOIL_SECTION_MISSING',
        severity: 'error',
        message: 'CropSoilRequirements section is required',
      });
    }

    const items = await this.repo.listSoilRequirementItems(cropKnowledgeId, true);
    if (items.length === 0) {
      issues.push({
        code: 'SOIL_REQUIREMENTS_MISSING',
        severity: 'error',
        message: 'No active soil requirement factors defined',
      });
    }

    const factors = items.map((i) => i.soilFactor);
    if (new Set(factors).size !== factors.length) {
      issues.push({
        code: 'SOIL_FACTOR_DUPLICATE',
        severity: 'error',
        message: 'SoilFactor must be unique within a crop',
        path: 'soilFactor',
      });
    }

    for (const factor of SOIL_FACTORS) {
      if (!factors.includes(factor)) {
        issues.push({
          code: 'SOIL_FACTOR_SHELL_MISSING',
          severity: 'warning',
          message: `Catalog factor ${factor} has no active requirement row`,
          path: factor,
        });
      }
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
    row: SoilRequirement,
    issues: SoilRequirementsValidationIssue[] = [],
  ): SoilRequirementsValidationIssue[] {
    if (!SOIL_FACTORS.includes(row.soilFactor)) {
      issues.push({
        code: 'SOIL_FACTOR_INVALID',
        severity: 'error',
        message: 'Invalid SoilFactor',
        path: 'soilFactor',
      });
    }
    if (!row.unit?.trim()) {
      issues.push({
        code: 'UNIT_REQUIRED',
        severity: 'error',
        message: 'Unit is required',
        path: 'unit',
      });
    }

    const { minimum: min, optimalMinimum: oMin, optimalMaximum: oMax, maximum: max, preferred: pref } =
      row;

    if (oMin != null && oMax != null && oMin > oMax) {
      issues.push({
        code: 'OPTIMAL_RANGE_INVALID',
        severity: 'error',
        message: 'OptimalMinimum cannot exceed OptimalMaximum',
        path: 'optimalMinimum',
      });
    }
    if (min != null && max != null && min > max) {
      issues.push({
        code: 'ABSOLUTE_RANGE_INVALID',
        severity: 'error',
        message: 'Minimum cannot exceed Maximum',
        path: 'minimum',
      });
    }
    if (min != null && oMin != null && min > oMin) {
      issues.push({
        code: 'RANGE_ORDER_INVALID',
        severity: 'error',
        message: 'Minimum cannot exceed OptimalMinimum',
        path: 'minimum',
      });
    }
    if (oMax != null && max != null && oMax > max) {
      issues.push({
        code: 'RANGE_ORDER_INVALID',
        severity: 'error',
        message: 'OptimalMaximum cannot exceed Maximum',
        path: 'optimalMaximum',
      });
    }
    if (pref != null) {
      if (min != null && pref < min) {
        issues.push({
          code: 'PREFERRED_OUT_OF_RANGE',
          severity: 'error',
          message: 'Preferred is below Minimum',
          path: 'preferred',
        });
      }
      if (max != null && pref > max) {
        issues.push({
          code: 'PREFERRED_OUT_OF_RANGE',
          severity: 'error',
          message: 'Preferred is above Maximum',
          path: 'preferred',
        });
      }
    }

    if ([min, oMin, oMax, max, pref].every((v) => v == null)) {
      issues.push({
        code: 'THRESHOLDS_UNSET',
        severity: 'warning',
        message: `SoilFactor ${row.soilFactor} has no numeric thresholds yet (expected in Phase 2.1D)`,
        path: row.soilFactor,
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
    candidate: SoilRequirement,
    siblings: SoilRequirement[],
  ): SoilRequirementsValidationIssue[] {
    const issues: SoilRequirementsValidationIssue[] = [];
    const others = siblings.filter((s) => s.id !== candidate.id);
    if (others.some((s) => s.soilFactor === candidate.soilFactor)) {
      issues.push({
        code: 'SOIL_FACTOR_DUPLICATE',
        severity: 'error',
        message: 'Same SoilFactor cannot repeat for a crop',
        path: 'soilFactor',
      });
    }
    this.validateEntity(candidate, issues);
    return issues;
  }

  defaultUnit(factor: SoilFactor): string {
    return SOIL_FACTOR_CATALOG.find((c) => c.soilFactor === factor)?.unit ?? 'unknown';
  }
}
