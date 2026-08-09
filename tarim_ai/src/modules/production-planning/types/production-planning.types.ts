import { z } from 'zod';

export const taskStatusSchema = z.enum([
  'Planned',
  'Waiting',
  'Ready',
  'In Progress',
  'Completed',
  'Skipped',
  'Cancelled'
]);

export const productionPlanSchema = z.object({
  id: z.string().uuid(),
  cropCode: z.string().min(1),
  parcelId: z.string().uuid().nullable(),
  plantingDate: z.string(), // ISO date string
  productionScenario: z.string().nullable(),
  rainfedIrrigated: z.string().nullable(),
  region: z.string().nullable(),
  status: z.enum(['Active', 'Completed', 'Cancelled', 'Paused']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const productionTaskSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  taskType: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startDate: z.string(), // ISO date string
  dueDate: z.string(), // ISO date string
  priority: z.enum(['High', 'Medium', 'Low', 'Critical']),
  estimatedDuration: z.number().nullable(), // in days
  status: taskStatusSchema,
  dependencies: z.array(z.string().uuid()).nullable(),
  source: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const taskAuditSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  previousStatus: z.string().nullable(),
  newStatus: z.string().nullable(),
  previousStartDate: z.string().nullable(),
  newStartDate: z.string().nullable(),
  previousDueDate: z.string().nullable(),
  newDueDate: z.string().nullable(),
  reason: z.string().nullable(),
  changedAt: z.string(),
});

export const createPlanRequestSchema = z.object({
  cropCode: z.string().min(1),
  parcelId: z.string().uuid().nullable().optional(),
  plantingDate: z.string(), // YYYY-MM-DD
  productionScenario: z.string().nullable().optional(),
  rainfedIrrigated: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
});

export const updateTaskRequestSchema = z.object({
  status: taskStatusSchema.optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  reason: z.string().optional(),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type ProductionPlan = z.infer<typeof productionPlanSchema>;
export type ProductionTask = z.infer<typeof productionTaskSchema>;
export type TaskAudit = z.infer<typeof taskAuditSchema>;
export type CreatePlanRequest = z.infer<typeof createPlanRequestSchema>;
export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;
