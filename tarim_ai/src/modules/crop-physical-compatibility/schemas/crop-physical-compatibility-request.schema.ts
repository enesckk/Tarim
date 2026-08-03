import { z } from 'zod';
import { parcelQuerySchema } from '../../parcel/schemas/parcel-query.schema.js';
import { geoJsonInputSchema } from '../../../schemas/geojson.schema.js';

export const cropPhysicalCompatibilityRequestSchema = z
  .object({
    geometry: geoJsonInputSchema.optional(),
    parcelQuery: parcelQuerySchema.optional(),
    fieldSurveyId: z.string().uuid().optional(),
    useLatestApprovedFieldSurvey: z.boolean().optional(),
    fieldEvidence: z
      .object({
        rootableSoilDepthMeasurementsCm: z.array(z.number()).optional(),
        surfaceStoniness: z.string().optional(),
        bedrockOutcrop: z.string().optional(),
        machineAccess: z.string().optional(),
        drainageObservation: z.string().optional(),
      })
      .optional(),
    cropIds: z.array(z.string().min(1)).optional(),
    includeDetails: z.boolean().default(true),
    includeExistingScores: z.boolean().default(false),
    includeLandUsability: z.boolean().default(false),
    requirementProfileMode: z
      .enum(['active', 'static_fallback', 'explicit'])
      .default('active'),
    requirementProfileIds: z.record(z.string(), z.string().uuid()).optional(),
    dryRun: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.geometry && value.parcelQuery) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either geometry or parcelQuery, not both',
      });
    }
    if (!value.geometry && !value.parcelQuery) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either geometry or parcelQuery is required',
      });
    }
    if (
      (value.fieldSurveyId || value.useLatestApprovedFieldSurvey) &&
      !value.parcelQuery
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'parcelQuery is required when fieldSurveyId or useLatestApprovedFieldSurvey is set',
      });
    }
    if (value.requirementProfileMode === 'explicit') {
      if (
        !value.requirementProfileIds ||
        Object.keys(value.requirementProfileIds).length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'requirementProfileIds is required when mode is explicit',
        });
      }
    }
  });

export type CropPhysicalCompatibilityRequestInput = z.infer<
  typeof cropPhysicalCompatibilityRequestSchema
>;
