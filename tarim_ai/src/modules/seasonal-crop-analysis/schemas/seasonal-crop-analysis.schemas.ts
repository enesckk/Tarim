import { z } from 'zod';

export const parcelQuerySchema = z.object({
  province: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  neighborhood: z.string().trim().min(1).max(100),
  block: z.string().trim().min(1).max(32),
  parcel: z.string().trim().min(1).max(32),
});

export const productionModeSchema = z.enum(['auto', 'rainfed', 'irrigated']);

export const irrigationAvailabilitySchema = z.enum([
  'unavailable',
  'available_limited',
  'available_and_sufficient',
]);

export const seasonalCropAnalysisRequestSchema = z.object({
  parcelQuery: parcelQuerySchema,
  seasonYear: z.number().int().min(2000).max(2100),
  productionMode: productionModeSchema,
  irrigationAvailability: irrigationAvailabilitySchema,
  soilLaboratoryReportId: z.string().trim().min(1).optional().nullable(),
  fieldSurveyId: z.string().trim().min(1).optional().nullable(),
  irrigationWaterSourceId: z.string().trim().min(1).optional().nullable(),
  targetCropCodes: z.array(z.string().trim().min(1)).min(1).optional(),
});

export type SeasonalCropAnalysisRequestInput = z.infer<
  typeof seasonalCropAnalysisRequestSchema
>;

export const seasonalDemoRequestSchema = z.object({
  parcelSlug: z.string().trim().min(1),
  seasonYear: z.number().int().min(2000).max(2100),
  productionMode: productionModeSchema,
  irrigationAvailability: irrigationAvailabilitySchema,
});

export type SeasonalDemoRequestInput = z.infer<typeof seasonalDemoRequestSchema>;
