import { z } from 'zod';

const positionSchema = z
  .array(z.number())
  .min(2, 'Coordinate must be [longitude, latitude]')
  .max(3, 'Coordinate must be [longitude, latitude] or [longitude, latitude, elevation]');

const linearRingSchema = z
  .array(positionSchema)
  .min(4, 'Each ring must contain at least 4 coordinates');

export const polygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(linearRingSchema).min(1, 'Polygon must have at least one linear ring'),
});

export const multiPolygonGeometrySchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z
    .array(z.array(linearRingSchema).min(1, 'Each polygon must have at least one linear ring'))
    .min(1, 'MultiPolygon must have at least one polygon'),
});

export const geometrySchema = z.discriminatedUnion('type', [
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
]);

export const featureSchema = z.object({
  type: z.literal('Feature'),
  geometry: geometrySchema,
  properties: z.record(z.unknown()).nullable().optional(),
  id: z.union([z.string(), z.number()]).optional(),
});

export const featureCollectionSchema = z
  .object({
    type: z.literal('FeatureCollection'),
    features: z.array(featureSchema),
  })
  .superRefine((value, ctx) => {
    if (value.features.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `FeatureCollection must contain exactly 1 Feature, received ${value.features.length}`,
        path: ['features'],
      });
    }
  });

/**
 * Accepts Polygon/MultiPolygon geometry, Feature, or single-feature FeatureCollection.
 */
export const geoJsonInputSchema = z.union([
  geometrySchema,
  featureSchema,
  featureCollectionSchema,
]);

export type GeoJsonInputParsed = z.infer<typeof geoJsonInputSchema>;
export type PolygonGeometryInput = z.infer<typeof polygonGeometrySchema>;
