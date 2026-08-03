import { z } from 'zod';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  RISK_TYPES,
  RISK_TYPE_CATALOG,
  type CropRisk,
  type CropRiskValidationIssue,
  type CropRiskValidationResult,
  type RiskType,
} from '../risk/crop-risk.types.js';

export const riskTypeSchema = z.enum([
  'FROST',
  'DROUGHT',
  'HEAT',
  'EXCESS_RAIN',
  'FLOOD',
  'SALINITY',
  'SODICITY',
  'EROSION',
  'DISEASE',
  'PEST',
  'WIND',
  'HAIL',
]) satisfies z.ZodType<RiskType>;

export const riskLevelSchema = z.enum(['Unknown', 'Low', 'Moderate', 'High', 'Critical']);

export const riskSensitivitySchema = z.enum(['Unknown', 'Low', 'Moderate', 'High']);

const verificationStatusSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

export const createCropRiskSchema = z.object({
  riskType: riskTypeSchema,
  riskLevel: riskLevelSchema.optional(),
  sensitivity: riskSensitivitySchema.optional(),
  description: z.string().max(8000).nullable().optional(),
  mitigationSuggestion: z.string().max(8000).nullable().optional(),
  sourceReferenceId: z.string().uuid().nullable().optional(),
  verificationStatus: verificationStatusSchema.optional(),
});

export const updateCropRiskSchema = createCropRiskSchema.partial().extend({
  riskType: riskTypeSchema.optional(),
});

export type CreateCropRiskInput = z.infer<typeof createCropRiskSchema>;
export type UpdateCropRiskInput = z.infer<typeof updateCropRiskSchema>;

export class CropRiskValidationService {
  constructor(private readonly repo: CropKnowledgeRepository) {}

  async validate(cropKnowledgeId: string): Promise<CropRiskValidationResult> {
    const issues: CropRiskValidationIssue[] = [];
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

    const section = await this.repo.getRiskProfile(cropKnowledgeId);
    if (!section) {
      issues.push({
        code: 'RISK_PROFILE_SECTION_MISSING',
        severity: 'error',
        message: 'CropRiskProfile section is required',
      });
    }

    const items = await this.repo.listCropRiskItems(cropKnowledgeId, true);
    if (items.length === 0) {
      issues.push({
        code: 'CROP_RISKS_MISSING',
        severity: 'error',
        message: 'No active crop risk rows defined',
      });
    }

    const types = items.map((i) => i.riskType);
    if (new Set(types).size !== types.length) {
      issues.push({
        code: 'RISK_TYPE_DUPLICATE',
        severity: 'error',
        message: 'RiskType must be unique within a crop',
        path: 'riskType',
      });
    }

    for (const riskType of RISK_TYPES) {
      if (!types.includes(riskType)) {
        issues.push({
          code: 'RISK_TYPE_SHELL_MISSING',
          severity: 'warning',
          message: `Catalog risk type ${riskType} has no active row`,
          path: riskType,
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
    row: CropRisk,
    issues: CropRiskValidationIssue[] = [],
  ): CropRiskValidationIssue[] {
    if (!RISK_TYPES.includes(row.riskType)) {
      issues.push({
        code: 'RISK_TYPE_INVALID',
        severity: 'error',
        message: 'Invalid RiskType',
        path: 'riskType',
      });
    }

    if (row.riskLevel === 'Unknown') {
      issues.push({
        code: 'RISK_LEVEL_UNSET',
        severity: 'warning',
        message: `RiskType ${row.riskType} has Unknown RiskLevel (expected in Phase 2.1G)`,
        path: 'riskLevel',
      });
    }

    if (row.sensitivity === 'Unknown') {
      issues.push({
        code: 'SENSITIVITY_UNSET',
        severity: 'warning',
        message: `RiskType ${row.riskType} has Unknown Sensitivity (expected in Phase 2.1G)`,
        path: 'sensitivity',
      });
    }

    if (row.mitigationSuggestion == null || !row.mitigationSuggestion.trim()) {
      issues.push({
        code: 'MITIGATION_UNSET',
        severity: 'warning',
        message: `RiskType ${row.riskType} has no mitigation suggestion yet`,
        path: 'mitigationSuggestion',
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
    candidate: CropRisk,
    siblings: CropRisk[],
  ): CropRiskValidationIssue[] {
    const issues: CropRiskValidationIssue[] = [];
    const others = siblings.filter((s) => s.id !== candidate.id);
    if (others.some((s) => s.riskType === candidate.riskType)) {
      issues.push({
        code: 'RISK_TYPE_DUPLICATE',
        severity: 'error',
        message: 'Same RiskType cannot repeat for a crop',
        path: 'riskType',
      });
    }
    this.validateEntity(candidate, issues);
    return issues;
  }

  defaultDescription(riskType: RiskType): string {
    return RISK_TYPE_CATALOG.find((c) => c.riskType === riskType)?.description ?? riskType;
  }
}
