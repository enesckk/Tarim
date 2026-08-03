import { z } from 'zod';

const riskLevelSchema = z.enum(['low', 'medium', 'high']);

const scoreFactorSchema = z.object({
  code: z.string(),
  score: z.number(),
  maxScore: z.number(),
  observed: z.union([z.number(), z.string(), z.null()]).optional(),
  message: z.string(),
});

const categoryBreakdownSchema = z.object({
  score: z.number(),
  maxScore: z.number(),
  factors: z.array(scoreFactorSchema),
});

export const cropRecommendationResponseSchema = z.object({
  parcel: z.object({
    title: z.string().nullable(),
    areaSquareMeters: z.number().nullable(),
    landType: z.string().nullable(),
    geometryType: z.string(),
  }),
  dataQuality: z.object({
    recommendationConfidence: riskLevelSchema,
    sentinelConfidence: riskLevelSchema,
    climateConfidence: riskLevelSchema,
    soilConfidence: riskLevelSchema,
    usesMockClimate: z.boolean(),
    usesMockSoil: z.boolean(),
    climateProvider: z.string(),
    soilProvider: z.string(),
    climateIsEstimated: z.boolean(),
    soilIsEstimated: z.boolean(),
    successfulTimeSeriesAcquisitions: z.number().int().nonnegative(),
    averageValidPixelRatio: z.number().nullable(),
  }),
  recommendations: z.array(
    z.object({
      crop: z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
      }),
      score: z.object({
        gross: z.number(),
        constraintPenalty: z.number(),
        final: z.number().min(0).max(100),
        classification: z.string(),
        label: z.string(),
      }),
      breakdown: z.object({
        climate: categoryBreakdownSchema,
        soil: categoryBreakdownSchema,
        sentinel: categoryBreakdownSchema,
        reliability: categoryBreakdownSchema,
      }),
      constraints: z.array(z.unknown()),
      strengths: z.array(z.unknown()),
      risks: z.array(z.unknown()),
      requiredVerifications: z.array(z.string()),
      explanation: z.object({
        summary: z.string(),
        whyRecommended: z.array(z.string()),
        whyNotHigher: z.array(z.string()),
      }),
      scenarios: z
        .object({
          current: z.object({
            score: z.number(),
            classification: z.string(),
          }),
          withSelectedManagement: z.object({
            score: z.number(),
            classification: z.string(),
            estimatedImprovement: z.number(),
          }),
        })
        .optional(),
      phenology: z
        .object({
          selectedPlantingDate: z.string(),
          selectedWindow: z.string(),
          stageResults: z.array(z.unknown()),
          criticalStageRisks: z.array(z.unknown()),
        })
        .passthrough()
        .optional(),
      managementNeeds: z
        .array(
          z.object({
            code: z.string(),
            priority: z.string(),
            message: z.string(),
          }),
        )
        .optional(),
      audit: z
        .object({
          modelVersion: z.string(),
          knowledgeVersion: z.string(),
          calibrationVersion: z.string(),
          inputsUsed: z.array(z.string()),
          missingInputs: z.array(z.string()),
          penaltiesApplied: z.array(z.unknown()),
          scoreBeforeClamp: z.number(),
          scoreAfterClamp: z.number(),
        })
        .optional(),
    }),
  ),
  notRecommended: z.array(
    z.object({
      cropId: z.string(),
      name: z.string(),
      score: z.number(),
      primaryConstraints: z.array(z.string()),
    }),
  ),
  evaluationErrors: z
    .array(
      z.object({
        cropId: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
  landUsability: z
    .object({
      status: z.string(),
      physicalSuitability: z.string().optional(),
      recommendationsArePreliminary: z.literal(true),
      confidence: z.string(),
    })
    .optional(),
  limitations: z.array(z.string()).min(1),
  metadata: z.object({
    knowledgeBaseVersion: z.string(),
    scoringModelVersion: z.string(),
    generatedAt: z.string(),
  }),
});
