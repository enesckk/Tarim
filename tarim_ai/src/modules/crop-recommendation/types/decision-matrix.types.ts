import { z } from 'zod';

export const CriteriaCategorySchema = z.enum([
  'Climate',
  'Soil',
  'Water',
  'Terrain',
  'Management',
  'Production'
]);
export type CriteriaCategory = z.infer<typeof CriteriaCategorySchema>;

export const DataTypeSchema = z.enum(['numeric', 'boolean', 'categorical']);
export type DataType = z.infer<typeof DataTypeSchema>;

export const CriteriaCatalogSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  category: CriteriaCategorySchema,
  data_type: DataTypeSchema,
  unit: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});
export type CriteriaCatalog = z.infer<typeof CriteriaCatalogSchema>;

export const DecisionRoleSchema = z.enum([
  'critical_barrier',
  'major_constraint',
  'scoring',
  'supporting',
  'informational'
]);
export type DecisionRole = z.infer<typeof DecisionRoleSchema>;

export const ImportanceSchema = z.enum(['required', 'high', 'medium', 'low']);
export type Importance = z.infer<typeof ImportanceSchema>;

export const MissingDataBehaviorSchema = z.enum([
  'stop_analysis',
  'continue_with_warning',
  'continue_using_fallback',
  'exclude_from_score',
  'required_user_input'
]);
export type MissingDataBehavior = z.infer<typeof MissingDataBehaviorSchema>;

export const ReviewStatusSchema = z.enum(['Draft', 'Reviewing', 'Approved', 'Rejected']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const DataSourcePrioritySchema = z.object({
  id: z.string().uuid(),
  rule_id: z.string().uuid(),
  source_name: z.string(),
  priority_rank: z.number(),
  created_at: z.string().or(z.date()),
});
export type DataSourcePriority = z.infer<typeof DataSourcePrioritySchema>;

export const DecisionRuleSchema = z.object({
  id: z.string().uuid(),
  crop_knowledge_id: z.string().uuid(),
  criterion_id: z.string().uuid(),
  decision_role: DecisionRoleSchema,
  importance: ImportanceSchema,
  missing_data_behavior: MissingDataBehaviorSchema,
  
  // Thresholds
  min_value: z.number().nullable().optional(),
  max_value: z.number().nullable().optional(),
  optimal_min: z.number().nullable().optional(),
  optimal_max: z.number().nullable().optional(),
  tolerance: z.number().nullable().optional(),
  
  condition_expression: z.string().nullable().optional(),
  explanation_template: z.string().nullable().optional(),
  
  version: z.number(),
  source: z.string().nullable().optional(),
  review_status: ReviewStatusSchema,
  
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
  reviewed_at: z.string().or(z.date()).nullable().optional(),
  approved_at: z.string().or(z.date()).nullable().optional(),

  // Joined properties for convenience
  criterion: CriteriaCatalogSchema.optional(),
  source_priorities: z.array(DataSourcePrioritySchema).optional(),
});
export type DecisionRule = z.infer<typeof DecisionRuleSchema>;
