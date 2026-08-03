import { z } from 'zod';
import type {
  CropGeneralInformation,
  CropGeneralInformationValidationIssue,
  CropGeneralInformationValidationResult,
  GrowingType,
  HarvestType,
  SeedType,
} from '../types/crop-knowledge.types.js';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';

const verificationStatusSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

const growingTypeSchema = z.enum([
  'FieldCrop',
  'Vegetable',
  'Melon',
  'Industrial',
  'Other',
]) satisfies z.ZodType<GrowingType>;

const seedTypeSchema = z
  .enum(['Seed', 'Seedling', 'Tuber', 'Cutting', 'Other'])
  .nullable() satisfies z.ZodType<SeedType>;

const harvestTypeSchema = z
  .enum(['Grain', 'Fruit', 'Leaf', 'Root', 'Fiber', 'Multiple', 'Other'])
  .nullable() satisfies z.ZodType<HarvestType>;

/** Request body for creating/updating General Information (identity catalog only). */
export const upsertGeneralInformationSchema = z.object({
  identityCode: z.string().min(1).max(64),
  nameTr: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  scientificName: z.string().max(300).nullable().optional(),
  faoCode: z.string().max(64).nullable().optional(),
  eppoCode: z.string().max(64).nullable().optional(),
  cropGroup: z.string().min(1).max(100),
  family: z.string().max(100).nullable().optional(),
  lifecycle: z.enum(['Seasonal', 'Perennial', 'Biennial']),
  growingType: growingTypeSchema,
  supportsOpenField: z.boolean(),
  supportsGreenhouse: z.boolean(),
  supportsRainfed: z.boolean(),
  supportsIrrigated: z.boolean(),
  supportsFirstCrop: z.boolean(),
  supportsSecondCrop: z.boolean(),
  seedType: seedTypeSchema.optional(),
  harvestType: harvestTypeSchema.optional(),
  typicalGrowingDurationDays: z.number().int().positive().nullable().optional(),
  typicalRootDepthCm: z.number().positive().nullable().optional(),
  typicalPlantHeightCm: z.number().positive().nullable().optional(),
  economicPart: z.string().max(100).nullable().optional(),
  primaryUsage: z.string().max(100).nullable().optional(),
  secondaryUsage: z.string().max(100).nullable().optional(),
  regionAvailability: z.array(z.string().min(1)).default([]),
  description: z.string().max(4000).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  scientificReferenceIds: z.array(z.string().uuid()).default([]),
  sourceReferenceId: z.string().uuid().nullable().optional(),
  verificationStatus: verificationStatusSchema.optional(),
  isActive: z.boolean().optional(),
});

export type UpsertGeneralInformationInput = z.infer<typeof upsertGeneralInformationSchema>;

export class CropGeneralInformationValidationService {
  constructor(private readonly repo: CropKnowledgeRepository) {}

  async validate(cropKnowledgeId: string): Promise<CropGeneralInformationValidationResult> {
    const issues: CropGeneralInformationValidationIssue[] = [];
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

    const gi = await this.repo.getGeneralInformation(cropKnowledgeId);
    if (!gi) {
      return {
        cropKnowledgeId,
        valid: false,
        issues: [
          {
            code: 'GENERAL_INFORMATION_MISSING',
            severity: 'error',
            message: 'General Information section is required',
          },
        ],
      };
    }

    this.validateEntity(gi, issues);

    return {
      cropKnowledgeId,
      valid: issues.every((i) => i.severity !== 'error'),
      issues,
    };
  }

  validateEntity(
    gi: CropGeneralInformation,
    issues: CropGeneralInformationValidationIssue[] = [],
  ): CropGeneralInformationValidationIssue[] {
    if (!gi.identityCode?.trim()) {
      issues.push({
        code: 'IDENTITY_CODE_REQUIRED',
        severity: 'error',
        message: 'identityCode is required',
        path: 'identityCode',
      });
    }
    if (!gi.nameTr?.trim()) {
      issues.push({
        code: 'NAME_TR_REQUIRED',
        severity: 'error',
        message: 'nameTr is required',
        path: 'nameTr',
      });
    }
    if (!gi.nameEn?.trim()) {
      issues.push({
        code: 'NAME_EN_REQUIRED',
        severity: 'error',
        message: 'nameEn is required',
        path: 'nameEn',
      });
    }
    if (!gi.cropGroup?.trim()) {
      issues.push({
        code: 'CROP_GROUP_REQUIRED',
        severity: 'error',
        message: 'cropGroup is required',
        path: 'cropGroup',
      });
    }
    if (!gi.lifecycle) {
      issues.push({
        code: 'LIFECYCLE_REQUIRED',
        severity: 'error',
        message: 'lifecycle is required',
        path: 'lifecycle',
      });
    }
    if (!gi.growingType) {
      issues.push({
        code: 'GROWING_TYPE_REQUIRED',
        severity: 'error',
        message: 'growingType is required',
        path: 'growingType',
      });
    }

    const productionFlags = [
      gi.supportsOpenField,
      gi.supportsGreenhouse,
      gi.supportsRainfed,
      gi.supportsIrrigated,
      gi.supportsFirstCrop,
      gi.supportsSecondCrop,
    ];
    if (!productionFlags.some(Boolean)) {
      issues.push({
        code: 'PRODUCTION_TYPE_REQUIRED',
        severity: 'error',
        message: 'At least one production type flag must be true',
        path: 'productionTypes',
      });
    }

    if (!gi.scientificName) {
      issues.push({
        code: 'SCIENTIFIC_NAME_MISSING',
        severity: 'warning',
        message: 'scientificName is recommended for catalog completeness',
        path: 'scientificName',
      });
    }
    if (!gi.faoCode) {
      issues.push({
        code: 'FAO_CODE_MISSING',
        severity: 'warning',
        message: 'faoCode pending source verification',
        path: 'faoCode',
      });
    }
    if (!gi.eppoCode) {
      issues.push({
        code: 'EPPO_CODE_MISSING',
        severity: 'warning',
        message: 'eppoCode pending source verification',
        path: 'eppoCode',
      });
    }
    if (!gi.sourceReferenceId && gi.scientificReferenceIds.length === 0) {
      issues.push({
        code: 'SOURCE_REFERENCE_MISSING',
        severity: 'warning',
        message: 'No scientific source linked yet',
        path: 'scientificReferenceIds',
      });
    }
    if (gi.verificationStatus === 'Approved') {
      issues.push({
        code: 'PREMATURE_APPROVAL',
        severity: 'error',
        message: 'Approved status is not allowed in Phase 2.1 without expert workflow',
        path: 'verificationStatus',
      });
    }
    if (gi.verificationStatus === 'Draft') {
      issues.push({
        code: 'DRAFT_RECORD',
        severity: 'warning',
        message: 'General Information is Draft — not publishable as Approved',
        path: 'verificationStatus',
      });
    }

    // Typical descriptors may be null; do not invent thresholds.
    // Positive values are descriptive catalog only — never suitability scores.
    for (const [path, value] of [
      ['typicalGrowingDurationDays', gi.typicalGrowingDurationDays],
      ['typicalRootDepthCm', gi.typicalRootDepthCm],
      ['typicalPlantHeightCm', gi.typicalPlantHeightCm],
    ] as const) {
      if (value != null && value <= 0) {
        issues.push({
          code: 'INVALID_DESCRIPTIVE_MEASURE',
          severity: 'error',
          message: `${path} must be positive when set (descriptive only, not a threshold)`,
          path,
        });
      }
    }

    return issues;
  }
}
