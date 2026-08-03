import { z } from 'zod';

export const expertActorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.enum([
    'agricultural_engineer',
    'soil_scientist',
    'agronomist',
    'irrigation_specialist',
    'agricultural_mechanization_expert',
    'authorized_reviewer',
    'administrator',
  ]),
  organization: z.string().optional(),
  licenseOrRegistration: z.string().nullable().optional(),
});

export const requirementSourceSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum([
    'expert_opinion',
    'academic_publication',
    'official_guideline',
    'extension_service',
    'field_trial',
    'field_observation',
    'laboratory_result',
    'internal_initial_assumption',
    'other',
  ]),
  title: z.string().min(1),
  organization: z.string().optional(),
  authors: z.array(z.string()).optional(),
  publicationYear: z.number().int().nullable().optional(),
  reference: z.string().optional(),
  url: z.string().url().nullable().optional(),
  notes: z.string().optional(),
  supports: z.array(z.string()).default([]),
  verificationStatus: z
    .enum([
      'unverified',
      'metadata_verified',
      'content_reviewed',
      'accepted',
      'rejected',
    ])
    .default('unverified'),
});

export const createCropRequirementProfileSchema = z.object({
  cropId: z.string().min(1),
  requirements: z.unknown(),
  createdBy: expertActorSchema,
  notes: z.array(z.string()).optional(),
  sources: z.array(requirementSourceSchema).optional(),
});

export const updateCropRequirementProfileSchema = z.object({
  actor: expertActorSchema,
  reason: z.string().min(1),
  requirements: z.unknown().optional(),
  notes: z.array(z.string()).optional(),
  sources: z.array(requirementSourceSchema).optional(),
  fieldValidationStatus: z
    .record(
      z.enum([
        'rootableSoilDepth',
        'slope',
        'ruggedness',
        'surfaceStoniness',
        'bedrockOutcrop',
        'machineAccess',
        'drainage',
      ]),
      z.enum([
        'unvalidated',
        'literature_supported',
        'expert_reviewed',
        'field_observed',
        'field_validated',
        'disputed',
        'rejected',
      ]),
    )
    .optional(),
  changes: z
    .array(
      z.object({
        path: z.string().min(1),
        oldValue: z.unknown(),
        newValue: z.unknown(),
        reason: z.string().min(1),
        sourceIds: z.array(z.string()).min(1),
        changedBy: expertActorSchema,
        changedAt: z.string().optional(),
      }),
    )
    .optional(),
});

export const actorReasonSchema = z.object({
  actor: expertActorSchema,
  reason: z.string().min(1).default('workflow transition'),
});

export const addReviewSchema = z.object({
  reviewer: expertActorSchema,
  decision: z.enum([
    'approved',
    'approved_with_comments',
    'changes_requested',
    'rejected',
  ]),
  reviewedFields: z
    .array(
      z.enum([
        'rootableSoilDepth',
        'slope',
        'ruggedness',
        'surfaceStoniness',
        'bedrockOutcrop',
        'machineAccess',
        'drainage',
      ]),
    )
    .min(1),
  comments: z.string().min(1),
  suggestedChanges: z
    .array(z.object({ path: z.string(), suggestion: z.string() }))
    .optional(),
  fieldStatusUpdates: z
    .record(
      z.enum([
        'rootableSoilDepth',
        'slope',
        'ruggedness',
        'surfaceStoniness',
        'bedrockOutcrop',
        'machineAccess',
        'drainage',
      ]),
      z.enum([
        'unvalidated',
        'literature_supported',
        'expert_reviewed',
        'field_observed',
        'field_validated',
        'disputed',
        'rejected',
      ]),
    )
    .optional(),
});

export const impactAnalysisSchema = z.object({
  actor: expertActorSchema,
  includeDetails: z.boolean().optional().default(false),
  existingScores: z
    .record(z.string(), z.object({ score: z.number(), rank: z.number().int() }))
    .optional(),
});

export const bootstrapSchema = z.object({
  actor: expertActorSchema,
});
