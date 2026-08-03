import { z } from 'zod';

export const importanceLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const ruggednessClassOrder = [
  'very_low',
  'low',
  'medium',
  'high',
  'very_high',
] as const;

export const stoninessClassOrder = [
  'none',
  'low',
  'medium',
  'high',
  'very_high',
] as const;

export const bedrockClassOrder = [
  'not_observed',
  'isolated',
  'scattered',
  'frequent',
  'extensive',
] as const;

export const machineAccessClassOrder = [
  'verified_accessible',
  'accessible_with_limitations',
  'seasonally_accessible',
  'difficult',
  'impossible',
] as const;

export const drainageClassSchema = z.enum([
  'adequate',
  'moderately_limited',
  'poor',
  'waterlogging_observed',
  'unknown',
]);

const metaSchema = z.object({
  source: z.string().min(1),
  validationStatus: z.enum(['unvalidated', 'validated', 'rejected']),
  notes: z.array(z.string()).optional(),
});

export const physicalRequirementsSchema = z
  .object({
    rootableSoilDepth: z
      .object({
        minimumCm: z.number().finite().positive(),
        preferredMinimumCm: z.number().finite().positive(),
        optimalMinimumCm: z.number().finite().positive(),
        importance: importanceLevelSchema,
      })
      .superRefine((v, ctx) => {
        if (!(v.minimumCm <= v.preferredMinimumCm && v.preferredMinimumCm <= v.optimalMinimumCm)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'rootableSoilDepth: minimum <= preferred <= optimal required',
          });
        }
      }),
    slope: z
      .object({
        preferredMaximumMeanPercent: z.number().finite().nonnegative(),
        acceptableMaximumMeanPercent: z.number().finite().nonnegative(),
        maximumMeanPercent: z.number().finite().nonnegative(),
        maximumP90Percent: z.number().finite().nonnegative(),
        importance: importanceLevelSchema,
      })
      .superRefine((v, ctx) => {
        if (
          !(
            v.preferredMaximumMeanPercent <= v.acceptableMaximumMeanPercent &&
            v.acceptableMaximumMeanPercent <= v.maximumMeanPercent
          )
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'slope: preferred <= acceptable <= maximum mean required',
          });
        }
      }),
    ruggedness: z.object({
      preferredMaximumClass: z.enum(ruggednessClassOrder),
      acceptableMaximumClass: z.enum(ruggednessClassOrder),
      importance: importanceLevelSchema,
    }),
    surfaceStoninessTolerance: z.object({
      preferredMaximum: z.enum(stoninessClassOrder),
      acceptableMaximum: z.enum(stoninessClassOrder),
      maximum: z.enum(stoninessClassOrder),
      importance: importanceLevelSchema,
    }),
    bedrockOutcropTolerance: z.object({
      preferredMaximum: z.enum(bedrockClassOrder),
      acceptableMaximum: z.enum(bedrockClassOrder),
      maximum: z.enum(bedrockClassOrder),
      importance: importanceLevelSchema,
    }),
    machineAccessRequirement: z.object({
      minimum: z.enum(machineAccessClassOrder),
      importance: importanceLevelSchema,
    }),
    drainageRequirement: z.object({
      preferred: z.array(drainageClassSchema).min(1),
      acceptable: z.array(drainageClassSchema),
      notPreferred: z.array(drainageClassSchema),
      importance: importanceLevelSchema,
    }),
    source: z.string().min(1),
    validationStatus: z.enum(['unvalidated', 'validated', 'rejected']),
    notes: z.array(z.string()).optional(),
  })
  .superRefine((v, ctx) => {
    const rRank = (c: string) => ruggednessClassOrder.indexOf(c as never);
    if (rRank(v.ruggedness.preferredMaximumClass) > rRank(v.ruggedness.acceptableMaximumClass)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ruggedness preferredMaximumClass must be <= acceptableMaximumClass',
        path: ['ruggedness'],
      });
    }
    const sRank = (c: string) => stoninessClassOrder.indexOf(c as never);
    if (
      !(
        sRank(v.surfaceStoninessTolerance.preferredMaximum) <=
          sRank(v.surfaceStoninessTolerance.acceptableMaximum) &&
        sRank(v.surfaceStoninessTolerance.acceptableMaximum) <=
          sRank(v.surfaceStoninessTolerance.maximum)
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'stoniness preferred <= acceptable <= maximum',
        path: ['surfaceStoninessTolerance'],
      });
    }
    const bRank = (c: string) => bedrockClassOrder.indexOf(c as never);
    if (
      !(
        bRank(v.bedrockOutcropTolerance.preferredMaximum) <=
          bRank(v.bedrockOutcropTolerance.acceptableMaximum) &&
        bRank(v.bedrockOutcropTolerance.acceptableMaximum) <=
          bRank(v.bedrockOutcropTolerance.maximum)
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'bedrock preferred <= acceptable <= maximum',
        path: ['bedrockOutcropTolerance'],
      });
    }
  });

export type PhysicalRequirements = z.infer<typeof physicalRequirementsSchema>;
export type ImportanceLevel = z.infer<typeof importanceLevelSchema>;

/** Soft parse: returns null + issues instead of throwing (startup-safe). */
export function tryParsePhysicalRequirements(
  value: unknown,
): { ok: true; value: PhysicalRequirements } | { ok: false; issues: string[] } {
  const parsed = physicalRequirementsSchema.safeParse(value);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  };
}

export { metaSchema };
