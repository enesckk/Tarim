import { z } from 'zod';
import { geoJsonInputSchema } from '../../../schemas/geojson.schema.js';
import { parcelQuerySchema } from '../../parcel/schemas/parcel-query.schema.js';

const surfaceAnalysisRequestObjectSchema = z.object({
  geometry: geoJsonInputSchema.optional(),
  parcelQuery: parcelQuerySchema.optional(),
  months: z.number().int().min(3).max(24).optional(),
  /** Alias accepted by validation clients (maps to months). */
  analysisMonths: z.number().int().min(3).max(24).optional(),
  maxCloudCoverage: z.number().min(0).max(100).optional(),
  /** Alias accepted by validation clients (maps to maxCloudCoverage). */
  maxCloudCoveragePercent: z.number().min(0).max(100).optional(),
});

export const surfaceAnalysisRequestSchema = surfaceAnalysisRequestObjectSchema
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
      value.months != null &&
      value.analysisMonths != null &&
      value.months !== value.analysisMonths
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'months and analysisMonths must match when both are provided',
      });
    }
    if (
      value.maxCloudCoverage != null &&
      value.maxCloudCoveragePercent != null &&
      value.maxCloudCoverage !== value.maxCloudCoveragePercent
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'maxCloudCoverage and maxCloudCoveragePercent must match when both are provided',
      });
    }
  })
  .transform((value) => ({
    geometry: value.geometry,
    parcelQuery: value.parcelQuery,
    months: value.months ?? value.analysisMonths ?? 12,
    maxCloudCoverage: value.maxCloudCoverage ?? value.maxCloudCoveragePercent ?? 20,
  }));

export type SurfaceAnalysisRequestInput = z.infer<typeof surfaceAnalysisRequestSchema>;

export const surfaceAnalysisResponseSchema = z.object({
  period: z.object({
    start: z.string(),
    end: z.string(),
    months: z.number().int(),
  }),
  dataQuality: z.object({
    successfulAcquisitionCount: z.number().int().nonnegative(),
    selectedAcquisitionCount: z.number().int().nonnegative(),
    failedAcquisitionCount: z.number().int().nonnegative(),
    averageValidPixelRatio: z.number().nullable(),
    seasonsWithObservations: z.number().int().nonnegative(),
    seasonCoverageRatio: z.number().min(0).max(1),
    confidence: z.enum(['low', 'medium', 'high']),
    limitations: z.array(z.string()),
  }),
  surfacePersistence: z.object({
    persistentVegetationSignal: z.enum(['low', 'medium', 'high', 'unknown']),
    persistentBareSurfaceSignal: z.enum(['low', 'medium', 'high', 'unknown']),
    lowNdviShare: z.number(),
    highBsiShare: z.number(),
    vegetatedShare: z.number(),
    crossSeasonBareConsistency: z.number(),
    messages: z.array(z.string()),
  }),
  seasonalVegetation: z.object({
    bySeason: z.record(z.string(), z.unknown()),
    peakSeason: z.string(),
    activityLevel: z.enum(['low', 'medium', 'high', 'unknown']),
    seasonalAmplitudeNdvi: z.number().nullable(),
    messages: z.array(z.string()),
  }),
  agriculturalCycle: z.object({
    signal: z.string(),
    confidence: z.enum(['low', 'medium', 'high']),
    evidence: z.array(z.unknown()),
    messages: z.array(z.string()),
  }),
  continuousBareSurface: z.object({
    signal: z.enum(['low', 'medium', 'high', 'unknown']),
    bareObservationShare: z.number(),
    consecutiveBareHint: z.boolean(),
    messages: z.array(z.string()),
  }),
  probableRockOrShallowSoil: z.object({
    riskLevel: z.enum(['low', 'medium', 'high', 'unknown']),
    informationalScore: z.number().min(0).max(100),
    evidence: z.array(z.unknown()),
    counterEvidence: z.array(z.unknown()).optional(),
    disclaimer: z.string(),
  }),
  audit: z.object({
    modelVersion: z.string(),
    calibrationVersion: z.string(),
    inputsUsed: z.array(z.string()),
    rulesApplied: z.array(z.string()),
    evidenceSummary: z.array(z.string()),
    notes: z.array(z.string()),
  }),
  limitations: z.array(z.string()),
  sourceTimeSeries: z.object({
    successfulAcquisitionCount: z.number().int(),
    ndviMean: z.number().nullable(),
    ndmiMean: z.number().nullable(),
    bsiMean: z.number().nullable(),
    trends: z.unknown(),
  }),
});
