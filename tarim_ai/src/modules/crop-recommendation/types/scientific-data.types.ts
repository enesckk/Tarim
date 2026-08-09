import { z } from 'zod';

export const ReviewStatusSchema = z.enum(['Draft', 'Reviewed', 'Approved', 'Rejected']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const ScientificValueSchema = z.object({
  id: z.string().uuid(),
  crop_knowledge_id: z.string().uuid(),
  criterion_id: z.string().uuid().nullable().optional(),
  field_name: z.string(),
  provider: z.string(),
  provider_field: z.string().nullable().optional(),
  original_value: z.string().nullable().optional(),
  normalized_value: z.number().nullable().optional(),
  source_document: z.string().nullable().optional(),
  version: z.number(),
  retrieved_at: z.string().or(z.date()),
  review_status: ReviewStatusSchema,
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});
export type ScientificValue = z.infer<typeof ScientificValueSchema>;

export const PhenologyPhaseSchema = z.object({
  id: z.string().uuid(),
  crop_knowledge_id: z.string().uuid(),
  phase_name: z.string(),
  phase_order: z.number(),
  description: z.string().nullable().optional(),
  typical_duration_days: z.number().nullable().optional(),
  source: z.string().nullable().optional(),
  review_status: ReviewStatusSchema,
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});
export type PhenologyPhase = z.infer<typeof PhenologyPhaseSchema>;

export const ProductionProfileSchema = z.object({
  id: z.string().uuid(),
  crop_knowledge_id: z.string().uuid(),
  normal_planting_start_day: z.number().nullable().optional(),
  normal_planting_end_day: z.number().nullable().optional(),
  normal_harvest_start_day: z.number().nullable().optional(),
  normal_harvest_end_day: z.number().nullable().optional(),
  supports_second_crop: z.boolean().nullable().optional(),
  open_field: z.boolean().nullable().optional(),
  greenhouse: z.boolean().nullable().optional(),
  rainfed: z.boolean().nullable().optional(),
  irrigated: z.boolean().nullable().optional(),
  source: z.string().nullable().optional(),
  review_status: ReviewStatusSchema,
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});
export type ProductionProfile = z.infer<typeof ProductionProfileSchema>;
