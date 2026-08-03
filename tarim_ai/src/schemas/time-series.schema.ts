import { z } from 'zod';

const trendSchema = z.object({
  first: z.number(),
  last: z.number(),
  min: z.number(),
  max: z.number(),
  mean: z.number(),
  change: z.number(),
  direction: z.enum(['increasing', 'decreasing', 'stable']),
});

const seriesPointSchema = z.object({
  productId: z.string().min(1),
  datetime: z.string().min(1),
  satellite: z.string().min(1),
  tile: z.string().nullable(),
  cloudCoverage: z.number().nullable(),
  validPixelRatio: z.number().nullable(),
  indices: z
    .object({
      ndviMean: z.number(),
      ndmiMean: z.number(),
      bsiMean: z.number(),
    })
    .nullable(),
  status: z.enum(['success', 'failed']),
});

export const timeSeriesResponseSchema = z.object({
  period: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
    months: z.number().int().positive(),
  }),
  filters: z.object({
    maxCloudCoverage: z.number(),
    sampling: z.literal('weekly-best'),
  }),
  summary: z.object({
    catalogProductCount: z.number().int().nonnegative(),
    selectedAcquisitionCount: z.number().int().nonnegative(),
    successfulAcquisitionCount: z.number().int().nonnegative(),
    failedAcquisitionCount: z.number().int().nonnegative(),
  }),
  series: z.array(seriesPointSchema),
  trends: z.object({
    ndvi: trendSchema,
    ndmi: trendSchema,
    bsi: trendSchema,
  }),
  interpretation: z.object({
    vegetationTrend: z.string().min(1),
    moistureTrend: z.string().min(1),
    soilSurfaceTrend: z.string().min(1),
    summary: z.string().min(1),
    confidence: z.enum(['low', 'medium', 'high']),
  }),
});
