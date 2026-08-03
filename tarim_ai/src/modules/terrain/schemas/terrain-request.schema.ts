import { z } from 'zod';
import { parcelQuerySchema } from '../../parcel/schemas/parcel-query.schema.js';

export const terrainRequestSchema = z
  .object({
    geometry: z.unknown().optional(),
    parcelQuery: parcelQuerySchema.optional(),
    options: z
      .object({
        provider: z.string().min(1).optional(),
        dataset: z.string().min(1).optional(),
        resolutionMeters: z.number().finite().positive().optional(),
      })
      .optional(),
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

export type TerrainRequest = z.infer<typeof terrainRequestSchema>;
