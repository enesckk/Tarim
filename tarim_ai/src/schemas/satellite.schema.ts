import { z } from 'zod';
import { geoJsonInputSchema } from './geojson.schema.js';

export const satelliteSearchSchema = z.object({
  geometry: geoJsonInputSchema,
  days: z.number().int().positive().max(365).default(30),
});

export type SatelliteSearchInput = z.infer<typeof satelliteSearchSchema>;

export const timeSeriesRequestSchema = z.object({
  geometry: geoJsonInputSchema,
  months: z.number().int().positive().max(24).default(6),
  maxCloudCoverage: z.number().min(0).max(100).default(20),
});

export type TimeSeriesRequestInput = z.infer<typeof timeSeriesRequestSchema>;
