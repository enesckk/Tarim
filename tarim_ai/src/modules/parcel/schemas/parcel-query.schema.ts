import { z } from 'zod';

const trimmedNonEmpty = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1).max(100));

const cadastralCode = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1)
      .max(32)
      .regex(
        /^[0-9A-Za-zÇĞİÖŞÜçğıöşü]+([/-][0-9A-Za-zÇĞİÖŞÜçğıöşü]+)*$/,
        'block/parcel must be a cadastral code (digits/letters with optional / or -)',
      ),
  );

export const parcelQuerySchema = z.object({
  province: trimmedNonEmpty,
  district: trimmedNonEmpty,
  neighborhood: trimmedNonEmpty,
  block: cadastralCode,
  parcel: cadastralCode,
});

export type ParcelQueryInput = z.infer<typeof parcelQuerySchema>;

export const parcelResolveResponseSchema = z.object({
  query: parcelQuerySchema,
  parcel: z.object({
    title: z.string().min(1),
    province: z.string().min(1),
    district: z.string().min(1),
    neighborhood: z.string().min(1),
    block: z.string().min(1),
    parcel: z.string().min(1),
    landType: z.string().nullable(),
    areaSquareMeters: z.number().nullable(),
    sheet: z.string().nullable(),
    geometry: z.object({
      type: z.enum(['Polygon', 'MultiPolygon']),
      coordinates: z.array(z.any()).min(1),
    }),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  }),
});
