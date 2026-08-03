import { z } from 'zod';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  CLIMATE_FACTORS,
  CLIMATE_FACTOR_CATALOG,
  type ClimateFactor,
  type ClimateImportanceLevel,
  type ClimateRequirement,
  type ClimateRequirementsValidationIssue,
  type ClimateRequirementsValidationResult,
  type ClimateToleranceLevel,
} from '../climate/climate-requirement.types.js';

export const climateFactorSchema = z.enum([
  'AIR_TEMPERATURE',
  'SOIL_TEMPERATURE',
  'GDD',
  'FROST',
  'FROST_FREE_PERIOD',
  'EXTREME_HEAT',
  'HEAT_WAVE',
  'RAINFALL',
  'RAINFALL_DISTRIBUTION',
  'HUMIDITY',
  'SOLAR_RADIATION',
  'SUNSHINE_DURATION',
  'DAY_LENGTH',
  'WIND',
  'EVAPOTRANSPIRATION',
  'CLIMATIC_WATER_DEFICIT',
]) satisfies z.ZodType<ClimateFactor>;

const toleranceSchema = z.enum([
  'Unknown',
  'Narrow',
  'Moderate',
  'Wide',
]) satisfies z.ZodType<ClimateToleranceLevel>;

const importanceSchema = z.enum([
  'Required',
  'Important',
  'Supporting',
  'Optional',
]) satisfies z.ZodType<ClimateImportanceLevel>;

const verificationStatusSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

const nullableNumber = z.number().nullable().optional();

export const createClimateRequirementSchema = z.object({
  climateFactor: climateFactorSchema,
  minimumValue: nullableNumber,
  optimalMinimum: nullableNumber,
  optimalMaximum: nullableNumber,
  maximumValue: nullableNumber,
  preferredValue: nullableNumber,
  toleranceLevel: toleranceSchema.optional(),
  importanceLevel: importanceSchema.optional(),
  unit: z.string().min(1).max(64).optional(),
  scientificExplanation: z.string().max(8000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  sourceReferenceId: z.string().uuid().nullable().optional(),
  verificationStatus: verificationStatusSchema.optional(),
});

export const updateClimateRequirementSchema = createClimateRequirementSchema
  .partial()
  .extend({
    climateFactor: climateFactorSchema.optional(),
  });

export type CreateClimateRequirementInput = z.infer<typeof createClimateRequirementSchema>;
export type UpdateClimateRequirementInput = z.infer<typeof updateClimateRequirementSchema>;

export class ClimateRequirementsValidationService {
  constructor(private readonly repo: CropKnowledgeRepository) {}

  async validate(cropKnowledgeId: string): Promise<ClimateRequirementsValidationResult> {
    const issues: ClimateRequirementsValidationIssue[] = [];
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

    const section = await this.repo.getClimateRequirements(cropKnowledgeId);
    if (!section) {
      issues.push({
        code: 'CLIMATE_SECTION_MISSING',
        severity: 'error',
        message: 'CropClimateRequirements section is required',
      });
    }

    const items = await this.repo.listClimateRequirementItems(cropKnowledgeId, true);
    if (items.length === 0) {
      issues.push({
        code: 'CLIMATE_REQUIREMENTS_MISSING',
        severity: 'error',
        message: 'No active climate requirement factors defined',
      });
    }

    const factors = items.map((i) => i.climateFactor);
    if (new Set(factors).size !== factors.length) {
      issues.push({
        code: 'CLIMATE_FACTOR_DUPLICATE',
        severity: 'error',
        message: 'ClimateFactor must be unique within a crop',
        path: 'climateFactor',
      });
    }

    for (const factor of CLIMATE_FACTORS) {
      if (!factors.includes(factor)) {
        issues.push({
          code: 'CLIMATE_FACTOR_SHELL_MISSING',
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
    row: ClimateRequirement,
    issues: ClimateRequirementsValidationIssue[] = [],
  ): ClimateRequirementsValidationIssue[] {
    if (!CLIMATE_FACTORS.includes(row.climateFactor)) {
      issues.push({
        code: 'CLIMATE_FACTOR_INVALID',
        severity: 'error',
        message: 'Invalid ClimateFactor',
        path: 'climateFactor',
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

    const {
      minimumValue: min,
      optimalMinimum: oMin,
      optimalMaximum: oMax,
      maximumValue: max,
      preferredValue: pref,
    } = row;

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
        message: 'MinimumValue cannot exceed MaximumValue',
        path: 'minimumValue',
      });
    }
    if (min != null && oMin != null && min > oMin) {
      issues.push({
        code: 'RANGE_ORDER_INVALID',
        severity: 'error',
        message: 'MinimumValue cannot exceed OptimalMinimum',
        path: 'minimumValue',
      });
    }
    if (oMax != null && max != null && oMax > max) {
      issues.push({
        code: 'RANGE_ORDER_INVALID',
        severity: 'error',
        message: 'OptimalMaximum cannot exceed MaximumValue',
        path: 'optimalMaximum',
      });
    }
    if (pref != null) {
      if (min != null && pref < min) {
        issues.push({
          code: 'PREFERRED_OUT_OF_RANGE',
          severity: 'error',
          message: 'PreferredValue is below MinimumValue',
          path: 'preferredValue',
        });
      }
      if (max != null && pref > max) {
        issues.push({
          code: 'PREFERRED_OUT_OF_RANGE',
          severity: 'error',
          message: 'PreferredValue is above MaximumValue',
          path: 'preferredValue',
        });
      }
    }

    const thresholdsSet = [min, oMin, oMax, max, pref].some((v) => v != null);
    if (!thresholdsSet) {
      issues.push({
        code: 'THRESHOLDS_UNSET',
        severity: 'warning',
        message: `ClimateFactor ${row.climateFactor} has no numeric thresholds yet (expected in Phase 2.1C)`,
        path: row.climateFactor,
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
    candidate: ClimateRequirement,
    siblings: ClimateRequirement[],
  ): ClimateRequirementsValidationIssue[] {
    const issues: ClimateRequirementsValidationIssue[] = [];
    const others = siblings.filter((s) => s.id !== candidate.id);
    if (others.some((s) => s.climateFactor === candidate.climateFactor)) {
      issues.push({
        code: 'CLIMATE_FACTOR_DUPLICATE',
        severity: 'error',
        message: 'Same ClimateFactor cannot repeat for a crop',
        path: 'climateFactor',
      });
    }
    this.validateEntity(candidate, issues);
    return issues;
  }

  defaultUnit(factor: ClimateFactor): string {
    return (
      CLIMATE_FACTOR_CATALOG.find((c) => c.climateFactor === factor)?.unit ?? 'unknown'
    );
  }
}
