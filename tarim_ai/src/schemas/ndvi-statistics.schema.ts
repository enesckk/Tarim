import { z } from 'zod';

export const ndviStatisticsSchema = z.object({
  min: z.number(),
  max: z.number(),
  mean: z.number(),
  median: z.number(),
  standardDeviation: z.number(),
  validPixelCount: z.number().int().nonnegative(),
  noDataPixelCount: z.number().int().nonnegative(),
  totalPixelCount: z.number().int().nonnegative(),
  vegetatedPixelCount: z.number().int().nonnegative(),
  lowVegetationPixelCount: z.number().int().nonnegative(),
  bareOrWaterPixelCount: z.number().int().nonnegative(),
  vegetatedPixelRatio: z.number().min(0).max(1),
  lowVegetationPixelRatio: z.number().min(0).max(1),
  bareOrWaterPixelRatio: z.number().min(0).max(1),
});

export const ndviStatisticsResponseSchema = z.object({
  selectionType: z.literal('best'),
  selectionReason: z.string().min(1),
  product: z.object({
    productId: z.string().min(1),
    datetime: z.string().min(1),
    satellite: z.string().min(1),
    tile: z.string().nullable(),
    cloudCoverage: z.number().nullable(),
  }),
  statistics: ndviStatisticsSchema,
});

export type NdviStatisticsResponseParsed = z.infer<typeof ndviStatisticsResponseSchema>;
