import { z } from 'zod';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  WATER_FACTORS,
  WATER_FACTOR_CATALOG,
  type WaterFactor,
  type WaterImportanceLevel,
  type WaterRequirement,
  type WaterRequirementsValidationIssue,
  type WaterRequirementsValidationResult,
  type WaterToleranceLevel,
} from '../water/water-requirement.types.js';

export const waterFactorSchema = z.enum([
  'TOTAL_WATER_REQUIREMENT',
  'IRRIGATION_REQUIREMENT',
  'IRRIGATION_INTERVAL',
  'CRITICAL_IRRIGATION_STAGE',
  'WATER_STRESS_TOLERANCE',
  'DROUGHT_TOLERANCE',
  'SALINE_WATER_TOLERANCE',
  'BORON_TOLERANCE',
  'SAR_TOLERANCE',
]) satisfies z.ZodType<WaterFactor>;

const toleranceSchema = z.enum([
  'Unknown',
  'Narrow',
  'Moderate',
  'Wide',
]) satisfies z.ZodType<WaterToleranceLevel>;

const importanceSchema = z.enum([
  'Required',
  'Important',
  'Supporting',
  'Optional',
]) satisfies z.ZodType<WaterImportanceLevel>;

const verificationStatusSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

const nullableNumber = z.number().nullable().optional();

export const createWaterRequirementSchema = z.object({
  waterFactor: waterFactorSchema,
  minimum: nullableNumber,
  optimalMinimum: nullableNumber,
  optimalMaximum: nullableNumber,
  maximum: nullableNumber,
  preferred: nullableNumber,
  unit: z.string().min(1).max(64).optional(),
  toleranceLevel: toleranceSchema.optional(),
  importanceLevel: importanceSchema.optional(),
  description: z.string().max(8000).nullable().optional(),
  sourceReferenceId: z.string().uuid().nullable().optional(),
  verificationStatus: verificationStatusSchema.optional(),
});

export const updateWaterRequirementSchema = createWaterRequirementSchema.partial().extend({
  waterFactor: waterFactorSchema.optional(),
});

export type CreateWaterRequirementInput = z.infer<typeof createWaterRequirementSchema>;
export type UpdateWaterRequirementInput = z.infer<typeof updateWaterRequirementSchema>;

export class WaterRequirementsValidationService {
  constructor(private readonly repo: CropKnowledgeRepository) {}

  async validate(cropKnowledgeId: string): Promise<WaterRequirementsValidationResult> {
    const issues: WaterRequirementsValidationIssue[] = [];
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

    const section = await this.repo.getWaterRequirements(cropKnowledgeId);
    if (!section) {
      issues.push({
        code: 'WATER_SECTION_MISSING',
        severity: 'error',
        message: 'CropWaterRequirements section is required',
      });
    }

    const items = await this.repo.listWaterRequirementItems(cropKnowledgeId, true);
    if (items.length === 0) {
      issues.push({
        code: 'WATER_REQUIREMENTS_MISSING',
        severity: 'error',
        message: 'No active water requirement factors defined',
      });
    }

    const factors = items.map((i) => i.waterFactor);
    if (new Set(factors).size !== factors.length) {
      issues.push({
        code: 'WATER_FACTOR_DUPLICATE',
        severity: 'error',
        message: 'WaterFactor must be unique within a crop',
        path: 'waterFactor',
      });
    }

    for (const factor of WATER_FACTORS) {
      if (!factors.includes(factor)) {
        issues.push({
          code: 'WATER_FACTOR_SHELL_MISSING',
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
    row: WaterRequirement,
    issues: WaterRequirementsValidationIssue[] = [],
  ): WaterRequirementsValidationIssue[] {
    if (!WATER_FACTORS.includes(row.waterFactor)) {
      issues.push({
        code: 'WATER_FACTOR_INVALID',
        severity: 'error',
        message: 'Invalid WaterFactor',
        path: 'waterFactor',
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
        message: `WaterFactor ${row.waterFactor} has no numeric thresholds yet (expected in Phase 2.1E)`,
        path: row.waterFactor,
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
    candidate: WaterRequirement,
    siblings: WaterRequirement[],
  ): WaterRequirementsValidationIssue[] {
    const issues: WaterRequirementsValidationIssue[] = [];
    const others = siblings.filter((s) => s.id !== candidate.id);
    if (others.some((s) => s.waterFactor === candidate.waterFactor)) {
      issues.push({
        code: 'WATER_FACTOR_DUPLICATE',
        severity: 'error',
        message: 'Same WaterFactor cannot repeat for a crop',
        path: 'waterFactor',
      });
    }
    this.validateEntity(candidate, issues);
    return issues;
  }

  defaultUnit(factor: WaterFactor): string {
    return WATER_FACTOR_CATALOG.find((c) => c.waterFactor === factor)?.unit ?? 'unknown';
  }
}
