import { z } from 'zod';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  TERRAIN_FACTORS,
  TERRAIN_FACTOR_CATALOG,
  type TerrainFactor,
  type TerrainRequirement,
  type TerrainRequirementsValidationIssue,
  type TerrainRequirementsValidationResult,
} from '../terrain/terrain-requirement.types.js';

export const terrainFactorSchema = z.enum([
  'ELEVATION',
  'SLOPE',
  'ASPECT',
  'SOLAR_EXPOSURE',
  'TWI',
  'FLOW_ACCUMULATION',
  'EROSION_RISK',
]) satisfies z.ZodType<TerrainFactor>;

const verificationStatusSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

const nullableNumber = z.number().nullable().optional();

export const createTerrainRequirementSchema = z.object({
  terrainFactor: terrainFactorSchema,
  minimum: nullableNumber,
  optimalMinimum: nullableNumber,
  optimalMaximum: nullableNumber,
  maximum: nullableNumber,
  preferred: nullableNumber,
  unit: z.string().min(1).max(64).optional(),
  description: z.string().max(8000).nullable().optional(),
  sourceReferenceId: z.string().uuid().nullable().optional(),
  verificationStatus: verificationStatusSchema.optional(),
});

export const updateTerrainRequirementSchema = createTerrainRequirementSchema.partial().extend({
  terrainFactor: terrainFactorSchema.optional(),
});

export type CreateTerrainRequirementInput = z.infer<typeof createTerrainRequirementSchema>;
export type UpdateTerrainRequirementInput = z.infer<typeof updateTerrainRequirementSchema>;

export class TerrainRequirementsValidationService {
  constructor(private readonly repo: CropKnowledgeRepository) {}

  async validate(cropKnowledgeId: string): Promise<TerrainRequirementsValidationResult> {
    const issues: TerrainRequirementsValidationIssue[] = [];
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

    const section = await this.repo.getTerrainRequirements(cropKnowledgeId);
    if (!section) {
      issues.push({
        code: 'TERRAIN_SECTION_MISSING',
        severity: 'error',
        message: 'CropTerrainRequirements section is required',
      });
    }

    const items = await this.repo.listTerrainRequirementItems(cropKnowledgeId, true);
    if (items.length === 0) {
      issues.push({
        code: 'TERRAIN_REQUIREMENTS_MISSING',
        severity: 'error',
        message: 'No active terrain requirement factors defined',
      });
    }

    const factors = items.map((i) => i.terrainFactor);
    if (new Set(factors).size !== factors.length) {
      issues.push({
        code: 'TERRAIN_FACTOR_DUPLICATE',
        severity: 'error',
        message: 'TerrainFactor must be unique within a crop',
        path: 'terrainFactor',
      });
    }

    for (const factor of TERRAIN_FACTORS) {
      if (!factors.includes(factor)) {
        issues.push({
          code: 'TERRAIN_FACTOR_SHELL_MISSING',
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
    row: TerrainRequirement,
    issues: TerrainRequirementsValidationIssue[] = [],
  ): TerrainRequirementsValidationIssue[] {
    if (!TERRAIN_FACTORS.includes(row.terrainFactor)) {
      issues.push({
        code: 'TERRAIN_FACTOR_INVALID',
        severity: 'error',
        message: 'Invalid TerrainFactor',
        path: 'terrainFactor',
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
        message: `TerrainFactor ${row.terrainFactor} has no numeric thresholds yet (expected in Phase 2.1F)`,
        path: row.terrainFactor,
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
    candidate: TerrainRequirement,
    siblings: TerrainRequirement[],
  ): TerrainRequirementsValidationIssue[] {
    const issues: TerrainRequirementsValidationIssue[] = [];
    const others = siblings.filter((s) => s.id !== candidate.id);
    if (others.some((s) => s.terrainFactor === candidate.terrainFactor)) {
      issues.push({
        code: 'TERRAIN_FACTOR_DUPLICATE',
        severity: 'error',
        message: 'Same TerrainFactor cannot repeat for a crop',
        path: 'terrainFactor',
      });
    }
    this.validateEntity(candidate, issues);
    return issues;
  }

  defaultUnit(factor: TerrainFactor): string {
    return TERRAIN_FACTOR_CATALOG.find((c) => c.terrainFactor === factor)?.unit ?? 'unknown';
  }
}
