import { z } from 'zod';
import { geoJsonInputSchema } from '../../../schemas/geojson.schema.js';
import { parcelQuerySchema } from '../../parcel/schemas/parcel-query.schema.js';

const fieldEvidenceSchema = z
  .object({
    rootableSoilDepthMeasurementsCm: z.array(z.number()).optional(),
    surfaceStoniness: z
      .enum(['none', 'low', 'medium', 'high', 'unknown'])
      .optional(),
    bedrockOutcrop: z
      .enum(['not_observed', 'sparse', 'extensive', 'unknown'])
      .optional(),
    machineAccess: z
      .enum(['verified', 'limited', 'impossible', 'unknown'])
      .optional(),
    drainageObservation: z
      .enum([
        'adequate',
        'moderately_limited',
        'poor',
        'waterlogging_observed',
        'unknown',
      ])
      .optional(),
    sourceDate: z.string().optional(),
    surveyId: z.string().uuid().optional(),
  })
  .optional();

export const landUsabilityRequestSchema = z
  .object({
    geometry: geoJsonInputSchema.optional(),
    parcelQuery: parcelQuerySchema.optional(),
    includeTerrain: z.boolean().default(true),
    includeSurfaceAnalysis: z.boolean().default(true),
    includeSoil: z.boolean().default(true),
    includeClimate: z.boolean().default(false),
    surfaceAnalysisOptions: z
      .object({
        analysisMonths: z.number().int().min(3).max(24).optional(),
        months: z.number().int().min(3).max(24).optional(),
        maxCloudCoveragePercent: z.number().min(0).max(100).optional(),
        maxCloudCoverage: z.number().min(0).max(100).optional(),
      })
      .optional(),
    fieldEvidence: fieldEvidenceSchema,
    fieldSurveyId: z.string().uuid().optional(),
    useLatestApprovedFieldSurvey: z.boolean().optional(),
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
        message: 'parcelQuery is required when resolving a field survey',
      });
    }
  });

export type LandUsabilityRequestInput = z.infer<typeof landUsabilityRequestSchema>;
