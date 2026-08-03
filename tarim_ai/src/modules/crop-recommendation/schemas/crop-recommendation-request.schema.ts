import { z } from 'zod';
import { parcelQuerySchema } from '../../parcel/schemas/parcel-query.schema.js';

export const soilManagementSchema = z
  .object({
    drainageImprovement: z.boolean().default(false),
    organicMatterImprovement: z.boolean().default(false),
    phCorrection: z.boolean().default(false),
  })
  .default({});

export const recommendationOptionsSchema = z
  .object({
    timeSeriesMonths: z.number().int().min(1).max(12).default(6),
    topN: z.number().int().min(1).max(14).default(5),
    climateYears: z.number().int().min(3).max(30).default(10),
    analysisDays: z.number().int().min(7).max(90).default(30),
    maxCloudCoverage: z.number().min(0).max(100).default(20),
    plantingScenario: z
      .enum(['automatic', 'earliest', 'latest', 'custom'])
      .default('automatic'),
    customPlantingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    irrigationScenario: z
      .enum(['unknown', 'rainfed', 'limited', 'full'])
      .default('unknown'),
    soilManagement: soilManagementSchema,
  })
  .default({});

export const cropRecommendationRequestSchema = z
  .object({
    geometry: z.unknown().optional(),
    parcelQuery: parcelQuerySchema.optional(),
    options: recommendationOptionsSchema,
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
      value.options.plantingScenario === 'custom' &&
      !value.options.customPlantingDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'customPlantingDate is required when plantingScenario=custom',
        path: ['options', 'customPlantingDate'],
      });
    }
  });

export const compareScenariosRequestSchema = z
  .object({
    geometry: z.unknown().optional(),
    parcelQuery: parcelQuerySchema.optional(),
    cropIds: z.array(z.string().min(1)).min(1).max(10),
    scenarios: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          irrigationScenario: z
            .enum(['unknown', 'rainfed', 'limited', 'full'])
            .optional(),
          plantingScenario: z
            .enum(['automatic', 'earliest', 'latest', 'custom'])
            .optional(),
          customPlantingDate: z.string().optional(),
          soilManagement: soilManagementSchema.optional(),
        }),
      )
      .min(1)
      .max(5),
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
  });

export type CropRecommendationRequest = z.infer<typeof cropRecommendationRequestSchema>;
export type CompareScenariosRequest = z.infer<typeof compareScenariosRequestSchema>;
