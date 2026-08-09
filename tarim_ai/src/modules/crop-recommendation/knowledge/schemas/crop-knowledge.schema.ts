import { z } from 'zod';

const riskToleranceSchema = z.enum(['low', 'medium', 'high']);
const textureSchema = z.enum([
  'clay',
  'clay_loam',
  'loam',
  'sandy_loam',
  'sand',
  'silt_loam',
  'unknown',
]);
const importanceSchema = z.enum(['low', 'medium', 'high']);
const categorySchema = z.enum(['field_crop', 'vegetable', 'perennial']);
const growingTypeSchema = z.enum(['annual', 'perennial']);
const carbonateToleranceSchema = z.enum(['low', 'medium', 'high']);
const severitySchema = z.enum(['critical', 'major', 'moderate']);
const operatorSchema = z.enum([
  'greater_than',
  'greater_than_or_equal',
  'less_than',
  'less_than_or_equal',
  'equal',
  'not_equal',
  'outside_range',
  'inside_range',
]);

function refineOrderedRange(
  value: {
    absoluteMin: number;
    optimalMin: number;
    optimalMax: number;
    absoluteMax: number;
  },
  ctx: z.RefinementCtx,
  keys: {
    absoluteMin: string;
    optimalMin: string;
    optimalMax: string;
    absoluteMax: string;
  },
): void {
  if (value.optimalMin > value.optimalMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'optimalMin must be <= optimalMax',
      path: [keys.optimalMin],
    });
  }
  if (value.absoluteMin > value.optimalMin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'absoluteMin must be <= optimalMin',
      path: [keys.absoluteMin],
    });
  }
  if (value.optimalMax > value.absoluteMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'optimalMax must be <= absoluteMax',
      path: [keys.optimalMax],
    });
  }
}

const numericRangeSchema = z
  .object({
    absoluteMin: z.number().finite(),
    optimalMin: z.number().finite(),
    optimalMax: z.number().finite(),
    absoluteMax: z.number().finite(),
  })
  .superRefine((value, ctx) =>
    refineOrderedRange(value, ctx, {
      absoluteMin: 'absoluteMin',
      optimalMin: 'optimalMin',
      optimalMax: 'optimalMax',
      absoluteMax: 'absoluteMax',
    }),
  );

const temperatureRangeSchema = z
  .object({
    absoluteMinC: z.number().finite(),
    optimalMinC: z.number().finite(),
    optimalMaxC: z.number().finite(),
    absoluteMaxC: z.number().finite(),
  })
  .superRefine((value, ctx) =>
    refineOrderedRange(
      {
        absoluteMin: value.absoluteMinC,
        optimalMin: value.optimalMinC,
        optimalMax: value.optimalMaxC,
        absoluteMax: value.absoluteMaxC,
      },
      ctx,
      {
        absoluteMin: 'absoluteMinC',
        optimalMin: 'optimalMinC',
        optimalMax: 'optimalMaxC',
        absoluteMax: 'absoluteMaxC',
      },
    ),
  );

const precipRangeSchema = z
  .object({
    minimum: z.number().finite().nonnegative(),
    optimalMin: z.number().finite().nonnegative(),
    optimalMax: z.number().finite().nonnegative(),
    maximum: z.number().finite().nonnegative(),
  })
  .superRefine((value, ctx) => {
    if (value.optimalMin > value.optimalMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'optimalMin must be <= optimalMax',
        path: ['optimalMin'],
      });
    }
    if (value.minimum > value.optimalMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minimum must be <= optimalMin',
        path: ['minimum'],
      });
    }
    if (value.optimalMax > value.maximum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'optimalMax must be <= maximum',
        path: ['optimalMax'],
      });
    }
  });

const remoteRangeSchema = z
  .object({
    minimum: z.number().finite(),
    optimalMin: z.number().finite(),
    optimalMax: z.number().finite(),
  })
  .superRefine((value, ctx) => {
    if (value.optimalMin > value.optimalMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'optimalMin must be <= optimalMax',
        path: ['optimalMin'],
      });
    }
    if (value.minimum > value.optimalMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minimum must be <= optimalMin',
        path: ['minimum'],
      });
    }
  });

const hardConstraintSchema = z.object({
  code: z.string().min(1).optional(),
  field: z.string().min(1),
  operator: operatorSchema,
  value: z.union([z.number().finite(), z.string(), z.boolean()]),
  valueMax: z.number().finite().optional(),
  severity: severitySchema,
  group: z.string().min(1).optional(),
  message: z.string().min(1),
});

const stageTemperatureSchema = z.object({
  absoluteMinC: z.number().finite(),
  optimalMinC: z.number().finite(),
  optimalMaxC: z.number().finite(),
  absoluteMaxC: z.number().finite(),
});

const growthStageSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  startOffsetDays: z.number().int().nonnegative(),
  endOffsetDays: z.number().int().positive(),
  temperature: stageTemperatureSchema,
  waterSensitivity: riskToleranceSchema,
  frostSensitivity: riskToleranceSchema.optional(),
  heatSensitivity: riskToleranceSchema.optional(),
  weight: z.number().finite().positive().max(1),
});

const plantingWindowSchema = z.object({
  startMonth: z.number().int().min(1).max(12),
  endMonth: z.number().int().min(1).max(12),
  label: z.string().min(1),
});

const phenologySchema = z
  .object({
    hemisphere: z.enum(['northern', 'southern']).default('northern'),
    plantingWindows: z.array(plantingWindowSchema).min(1),
    growthStages: z.array(growthStageSchema).min(1),
    cycleLengthDays: z.object({
      minimum: z.number().int().positive(),
      typical: z.number().int().positive(),
      maximum: z.number().int().positive(),
    }),
    perennial: z.object({
      isPerennial: z.boolean(),
      dormancyMonths: z.array(z.number().int().min(1).max(12)),
      chillingRequirementHours: z.number().finite().nonnegative().nullable(),
      establishmentYears: z.number().finite().nonnegative().nullable(),
      economicLifeYears: z.number().finite().nonnegative().nullable(),
    }),
  })
  .superRefine((value, ctx) => {
    const weightSum = value.growthStages.reduce((sum, stage) => sum + stage.weight, 0);
    if (Math.abs(weightSum - 1) > 0.02) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `growthStages weights must sum to 1 (got ${weightSum})`,
        path: ['growthStages'],
      });
    }
    for (const stage of value.growthStages) {
      if (stage.endOffsetDays <= stage.startOffsetDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `stage ${stage.id}: endOffsetDays must be > startOffsetDays`,
          path: ['growthStages'],
        });
      }
    }
  });

export const cropKnowledgeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  scientificName: z.string().min(1),
  category: categorySchema,
  growingType: growingTypeSchema,
  profileStatus: z.enum([
    'identity_only',
    'imported_unreviewed',
    'source_verified',
    'expert_reviewed',
    'approved_for_analysis',
    'incomplete',
    'rejected',
  ]).default('identity_only'),
  slug: z.string().optional(),
  internalCropCode: z.string().optional(),
  seasonalOrPerennial: z.enum(['seasonal', 'perennial']).optional(),
  climate: z.object({
    temperature: temperatureRangeSchema,
    annualPrecipitationMm: precipRangeSchema,
    growingSeasonPrecipitationMm: precipRangeSchema,
    frostTolerance: riskToleranceSchema,
    heatTolerance: riskToleranceSchema,
    droughtTolerance: riskToleranceSchema,
    irrigationDependency: riskToleranceSchema,
  }),
  soil: z.object({
    ph: numericRangeSchema,
    preferredTextures: z.array(textureSchema).min(1),
    acceptedTextures: z.array(textureSchema),
    minimumOrganicMatterPercent: z.number().finite().nonnegative(),
    preferredOrganicMatterPercent: z.number().finite().nonnegative(),
    maximumElectricalConductivityDsM: z.number().finite().nonnegative(),
    salinityTolerance: riskToleranceSchema,
    requiredDrainage: z.enum(['poor', 'moderate', 'good']),
    minimumSoilDepthCm: z.number().finite().positive(),
    calciumCarbonateTolerance: carbonateToleranceSchema,
  }),
  remoteSensing: z.object({
    activeVegetationNdvi: remoteRangeSchema,
    activeVegetationNdmi: remoteRangeSchema,
    maximumActiveSeasonBsi: z.number().finite(),
    seasonalInterpretation: z.object({
      requiresPersistentVegetation: z.boolean(),
      expectedCycle: growingTypeSchema,
      bareSoilBeforePlantingAcceptable: z.boolean(),
    }),
  }),
  management: z.object({
    irrigationRequired: z.boolean(),
    drainageImportance: importanceSchema,
    fertilityDemand: importanceSchema,
    mechanizationSuitability: importanceSchema,
  }),
  hardConstraints: z.array(hardConstraintSchema),
  phenology: phenologySchema,
  /** Additive physical suitability requirements (v1.7+). Soft-validated at analyze time. */
  physicalRequirements: z.unknown().optional(),
  sourceMetadata: z.object({
    version: z.string().min(1).optional(),
    reviewStatus: z.enum(['development', 'reviewed', 'approved']).optional(),
    sources: z.array(z.string()).optional(),
    notes: z.array(z.string()).optional(),
  }).optional(),
});

export type CropKnowledge = z.infer<typeof cropKnowledgeSchema>;
export type HardConstraintDef = z.infer<typeof hardConstraintSchema>;
export type NumericRange = z.infer<typeof numericRangeSchema>;
export type TemperatureRange = z.infer<typeof temperatureRangeSchema>;
export type PrecipitationRange = z.infer<typeof precipRangeSchema>;
export type CropPhenology = z.infer<typeof phenologySchema>;
export type GrowthStageDef = z.infer<typeof growthStageSchema>;
export type PlantingWindowDef = z.infer<typeof plantingWindowSchema>;

export const cropIdentitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  scientificName: z.string().min(1),
  category: categorySchema,
  growingType: growingTypeSchema,
  profileStatus: z.enum([
    'identity_only',
    'imported_unreviewed',
    'source_verified',
    'expert_reviewed',
    'approved_for_analysis',
    'incomplete',
    'rejected',
  ]).default('identity_only'),
  slug: z.string().optional(),
  internalCropCode: z.string().optional(),
  seasonalOrPerennial: z.enum(['seasonal', 'perennial']).optional(),
  sourceMetadata: z.object({
    version: z.string().min(1).optional(),
    reviewStatus: z.enum(['development', 'reviewed', 'approved']).optional(),
    sources: z.array(z.string()).optional(),
    notes: z.array(z.string()).optional(),
  }).optional(),
});
export type CropIdentity = z.infer<typeof cropIdentitySchema>;
