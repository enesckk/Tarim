import { z } from 'zod';
import { ndviStatisticsSchema } from './ndvi-statistics.schema.js';

const productSummarySchema = z.object({
  productId: z.string().min(1),
  datetime: z.string().min(1),
  satellite: z.string().min(1),
  tile: z.string().nullable(),
  cloudCoverage: z.number().nullable(),
});

const indexBaseSchema = z.object({
  min: z.number(),
  max: z.number(),
  mean: z.number(),
  median: z.number(),
  standardDeviation: z.number(),
  validPixelCount: z.number().int().nonnegative(),
  noDataPixelCount: z.number().int().nonnegative(),
  totalPixelCount: z.number().int().nonnegative(),
});

export const ndmiStatisticsSchema = indexBaseSchema.extend({
  highMoisturePixelCount: z.number().int().nonnegative(),
  moderateMoisturePixelCount: z.number().int().nonnegative(),
  lowMoisturePixelCount: z.number().int().nonnegative(),
  highMoisturePixelRatio: z.number().min(0).max(1),
  moderateMoisturePixelRatio: z.number().min(0).max(1),
  lowMoisturePixelRatio: z.number().min(0).max(1),
});

export const bsiStatisticsSchema = indexBaseSchema.extend({
  highBareSoilPixelCount: z.number().int().nonnegative(),
  moderateBareSoilPixelCount: z.number().int().nonnegative(),
  lowBareSoilPixelCount: z.number().int().nonnegative(),
  highBareSoilPixelRatio: z.number().min(0).max(1),
  moderateBareSoilPixelRatio: z.number().min(0).max(1),
  lowBareSoilPixelRatio: z.number().min(0).max(1),
});

export const indexStatisticsResponseSchema = z.object({
  selectionType: z.literal('best'),
  selectionReason: z.string().min(1),
  product: productSummarySchema,
  statistics: z.union([ndviStatisticsSchema, ndmiStatisticsSchema, bsiStatisticsSchema]),
});

export const analysisSummaryResponseSchema = z.object({
  selectionType: z.literal('best'),
  selectionReason: z.string().min(1),
  product: productSummarySchema,
  indices: z.object({
    ndvi: ndviStatisticsSchema,
    ndmi: ndmiStatisticsSchema,
    bsi: bsiStatisticsSchema,
  }),
  interpretation: z.object({
    vegetationStatus: z.string().min(1),
    moistureStatus: z.string().min(1),
    soilSurfaceStatus: z.string().min(1),
    summary: z.string().min(1),
    confidence: z.enum(['low', 'medium', 'high']),
  }),
});
