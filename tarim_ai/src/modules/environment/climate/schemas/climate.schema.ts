import { z } from 'zod';
import { geoJsonInputSchema } from '../../../../schemas/geojson.schema.js';
import { parcelQuerySchema } from '../../../parcel/schemas/parcel-query.schema.js';

const riskLevelSchema = z.enum(['low', 'medium', 'high']);

export const climateRequestSchema = z
  .object({
    geometry: geoJsonInputSchema.optional(),
    parcelQuery: parcelQuerySchema.optional(),
    years: z.number().int().min(3).max(30).default(10),
  })
  .superRefine((value, ctx) => {
    const hasGeometry = value.geometry != null;
    const hasParcel = value.parcelQuery != null;
    if (hasGeometry && hasParcel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either geometry or parcelQuery, not both',
      });
    }
    if (!hasGeometry && !hasParcel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either geometry or parcelQuery is required',
      });
    }
  });

export const providerMetadataSchema = z
  .object({
    source: z.string().min(1),
    generatedAt: z.string().min(1),
    isMock: z.boolean(),
    isEstimated: z.boolean().optional(),
    provider: z.string().optional(),
  })
  .passthrough();

export const climateProfileSchema = z.object({
  provider: z.string().min(1),
  location: z.object({
    longitude: z.number().finite(),
    latitude: z.number().finite(),
  }),
  period: z.object({
    years: z.number().int().positive(),
    type: z.literal('climatology'),
  }),
  temperature: z.object({
    annualMeanC: z.number().finite(),
    growingSeasonMeanC: z.number().finite(),
    summerMeanC: z.number().finite(),
    winterMeanC: z.number().finite(),
    annualMinC: z.number().finite(),
    annualMaxC: z.number().finite(),
    frostRisk: riskLevelSchema,
    extremeHeatRisk: riskLevelSchema,
  }),
  precipitation: z.object({
    annualTotalMm: z.number().finite().nonnegative(),
    growingSeasonTotalMm: z.number().finite().nonnegative(),
    summerTotalMm: z.number().finite().nonnegative(),
    seasonality: riskLevelSchema,
  }),
  water: z.object({
    estimatedIrrigationNeed: riskLevelSchema,
    droughtRisk: riskLevelSchema,
  }),
  confidence: riskLevelSchema,
  limitations: z.array(z.string()),
  metadata: providerMetadataSchema,
  climatology: z
    .object({
      monthly: z.array(
        z.object({
          month: z.number().int().min(1).max(12),
          temperatureMeanC: z.number().finite(),
          temperatureMinC: z.number().finite(),
          temperatureMaxC: z.number().finite(),
          precipitationMm: z.number().finite().nonnegative(),
          frostDays: z.number().finite().nonnegative(),
          extremeHeatDays: z.number().finite().nonnegative(),
          rainyDays: z.number().finite().nonnegative(),
        }),
      ),
      yearly: z
        .array(
          z.object({
            year: z.number().int(),
            temperatureMeanC: z.number().finite(),
            temperatureMinC: z.number().finite(),
            temperatureMaxC: z.number().finite(),
            precipitationMm: z.number().finite().nonnegative(),
            frostDays: z.number().finite().nonnegative(),
            extremeHeatDays: z.number().finite().nonnegative(),
            rainyDays: z.number().finite().nonnegative(),
          }),
        )
        .optional(),
      monthlyByYear: z
        .array(
          z.object({
            year: z.number().int(),
            monthly: z.array(
              z.object({
                month: z.number().int().min(1).max(12),
                temperatureMeanC: z.number().finite(),
                temperatureMinC: z.number().finite(),
                temperatureMaxC: z.number().finite(),
                precipitationMm: z.number().finite().nonnegative(),
                frostDays: z.number().finite().nonnegative(),
                extremeHeatDays: z.number().finite().nonnegative(),
                rainyDays: z.number().finite().nonnegative(),
              }),
            ),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type ClimateRequestInput = z.infer<typeof climateRequestSchema>;
