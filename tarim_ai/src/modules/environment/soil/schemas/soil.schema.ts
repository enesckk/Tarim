import { z } from 'zod';
import { geoJsonInputSchema } from '../../../../schemas/geojson.schema.js';
import { parcelQuerySchema } from '../../../parcel/schemas/parcel-query.schema.js';

const riskLevelSchema = z.enum(['low', 'medium', 'high']);
const salinityRiskSchema = z.enum(['low', 'medium', 'high', 'unknown']);
const textureSchema = z.enum([
  'clay',
  'clay_loam',
  'loam',
  'sandy_loam',
  'sand',
  'silt_loam',
  'unknown',
]);
const drainageSchema = z.enum(['poor', 'moderate', 'good', 'unknown']);
const capacitySchema = z.enum(['low', 'medium', 'high', 'unknown']);
const suitabilitySchema = z.enum(['poor', 'moderate', 'good']);

export const soilRequestSchema = z
  .object({
    geometry: geoJsonInputSchema.optional(),
    parcelQuery: parcelQuerySchema.optional(),
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

export const soilProviderMetadataSchema = z
  .object({
    source: z.string().min(1),
    generatedAt: z.string().min(1),
    isMock: z.boolean(),
    isEstimated: z.boolean().optional(),
    provider: z.string().optional(),
  })
  .passthrough();

export const soilProfileSchema = z.object({
  provider: z.string().min(1),
  location: z.object({
    longitude: z.number().finite(),
    latitude: z.number().finite(),
  }),
  soil: z.object({
    ph: z.number().finite().min(0).max(14),
    texture: textureSchema,
    organicMatterPercent: z.number().finite().nonnegative(),
    electricalConductivityDsM: z.number().finite().nonnegative().nullable(),
    salinityRisk: salinityRiskSchema,
    drainage: drainageSchema,
    waterHoldingCapacity: capacitySchema,
    calciumCarbonatePercent: z.number().finite().nonnegative().nullable(),
    depthCm: z.number().finite().nonnegative().nullable(),
  }),
  suitabilitySignals: z.object({
    rootDevelopment: suitabilitySchema,
    waterRetention: suitabilitySchema,
    salinityConstraint: salinityRiskSchema,
    generalSoilCondition: suitabilitySchema,
  }),
  confidence: riskLevelSchema,
  limitations: z.array(z.string()),
  metadata: soilProviderMetadataSchema,
});

export const environmentProfileRequestSchema = z
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

export type SoilRequestInput = z.infer<typeof soilRequestSchema>;
export type EnvironmentProfileRequestInput = z.infer<typeof environmentProfileRequestSchema>;
