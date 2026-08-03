import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { CalibrationProfile } from './calibration.types.js';

const calibrationSchema = z
  .object({
    version: z.string().min(1),
    climateWeight: z.number().finite().positive(),
    soilWeight: z.number().finite().positive(),
    sentinelWeight: z.number().finite().positive(),
    reliabilityWeight: z.number().finite().positive(),
    climateSubWeights: z.object({
      growingSeasonTemperature: z.number().finite().positive(),
      precipitation: z.number().finite().positive(),
      frostCompatibility: z.number().finite().positive(),
      extremeHeatCompatibility: z.number().finite().positive(),
      droughtCompatibility: z.number().finite().positive(),
      irrigationCompatibility: z.number().finite().positive(),
    }),
    constraintPenalties: z.object({
      critical: z.number().finite().nonnegative(),
      major: z.number().finite().nonnegative(),
      moderate: z.number().finite().nonnegative(),
    }),
    classificationThresholds: z.object({
      veryHigh: z.number().finite(),
      high: z.number().finite(),
      moderate: z.number().finite(),
      low: z.number().finite(),
    }),
    scenarioLimits: z.object({
      maximumManagementImprovement: z.number().finite().positive(),
    }),
    terrain: z
      .object({
        demResolutionMeters: z.number().finite().positive(),
        slopeClassesPercent: z.object({
          flatMax: z.number().finite().nonnegative(),
          gentleMax: z.number().finite().positive(),
          moderateMax: z.number().finite().positive(),
          steepMax: z.number().finite().positive(),
        }),
        minimumDemPixels: z.object({
          highConfidence: z.number().int().positive(),
          mediumConfidence: z.number().int().positive(),
          lowConfidence: z.number().int().positive(),
        }),
        minimumCoverageRatio: z.object({
          highConfidence: z.number().min(0).max(1),
          mediumConfidence: z.number().min(0).max(1),
          lowConfidence: z.number().min(0).max(1),
        }),
        dem: z
          .object({
            preferredDataset: z.string().min(1).optional(),
            requestedResolutionMeters: z.number().finite().positive().optional(),
            minimumRasterWidth: z.number().int().positive().optional(),
            minimumRasterHeight: z.number().int().positive().optional(),
            minimumValidPixelRatio: z.number().min(0).max(1).optional(),
            adequateValidPixelRatio: z.number().min(0).max(1).optional(),
            completeValidPixelRatio: z.number().min(0).max(1).optional(),
          })
          .optional(),
        ruggednessThresholds: z.object({
          veryLowMax: z.number().finite().nonnegative().optional(),
          lowMax: z.number().finite().nonnegative(),
          mediumMax: z.number().finite().positive(),
          highMax: z.number().finite().positive(),
        }),
        mechanization: z.object({
          steepAreaWarningPercent: z.number().finite().nonnegative(),
          verySteepAreaWarningPercent: z.number().finite().nonnegative(),
          strongLimitationMeanSlopePercent: z.number().finite().positive(),
          suitableMaximumMeanSlopePercent: z.number().finite().positive().optional(),
          generallySuitableMaximumMeanSlopePercent: z
            .number()
            .finite()
            .positive()
            .optional(),
          limitedMaximumMeanSlopePercent: z.number().finite().positive().optional(),
        }),
        cache: z
          .object({
            ttlSeconds: z.number().int().positive().optional(),
          })
          .optional(),
        validationStatus: z.string().min(1),
        source: z.string().min(1),
      })
      .optional(),
    surface: z
      .object({
        defaultMonths: z.number().int().positive(),
        minimumSuccessfulAcquisitions: z.object({
          highConfidence: z.number().int().positive(),
          mediumConfidence: z.number().int().positive(),
          lowConfidence: z.number().int().positive(),
        }),
        minimumSeasonCoverageRatio: z.object({
          highConfidence: z.number().min(0).max(1),
          mediumConfidence: z.number().min(0).max(1),
          lowConfidence: z.number().min(0).max(1),
        }),
        thresholds: z.object({
          ndviBareMax: z.number().finite(),
          ndviVegetatedMin: z.number().finite(),
          bsiBareMin: z.number().finite(),
          ndmiDryMax: z.number().finite(),
          seasonalAmplitudeMin: z.number().finite().nonnegative(),
        }),
        probableRock: z.object({
          bareShareMin: z.number().min(0).max(1),
          highBsiShareMin: z.number().min(0).max(1),
          lowNdmiShareMin: z.number().min(0).max(1),
          weakCycleAmplitudeMax: z.number().finite().nonnegative(),
          mediumScoreMin: z.number().min(0).max(100),
          highScoreMin: z.number().min(0).max(100),
        }),
        validationStatus: z.string().min(1),
        source: z.string().min(1),
      })
      .optional(),
    landUsability: z
      .object({
        minimumRealEvidenceCount: z.number().int().positive(),
        fieldDepth: z.object({
          minimumValidCm: z.number().finite().positive(),
          maximumValidCm: z.number().finite().positive(),
          recommendedSampleCount: z.number().int().positive(),
          highConfidenceSampleCount: z.number().int().positive(),
          mediumConfidenceSampleCount: z.number().int().positive(),
          lowConfidenceSampleCount: z.number().int().positive(),
        }),
        hardConstraints: z.object({
          veryShallowMeanDepthCm: z.number().finite().positive(),
          strongSlopeMeanPercent: z.number().finite().positive(),
          strongSlopeP90Percent: z.number().finite().positive(),
        }),
        rockSignal: z.object({
          fieldVerificationMinimumClass: z.string().min(1),
          routineCheckMaximumClass: z.string().min(1),
        }),
        confidence: z.object({
          highRequiresRealTerrain: z.boolean(),
          highRequiresVerifiedDepth: z.boolean(),
          mediumMinimumRealSources: z.number().int().positive(),
          lowMinimumRealSources: z.number().int().positive(),
        }),
        validationStatus: z.string().min(1),
        source: z.string().min(1),
      })
      .optional(),
    fieldSurvey: z
      .object({
        location: z.object({
          highConfidenceMaxDistanceMeters: z.number().finite().nonnegative(),
          mediumConfidenceMaxDistanceMeters: z.number().finite().nonnegative(),
          lowConfidenceMaxDistanceMeters: z.number().finite().nonnegative(),
          maximumAcceptedGpsAccuracyMeters: z.number().finite().nonnegative(),
        }),
        depth: z.object({
          minimumValidCm: z.number().finite().positive(),
          maximumValidCm: z.number().finite().positive(),
        }),
        sampleCountByArea: z
          .array(
            z.object({
              maximumAreaSquareMeters: z.number().finite().positive().nullable(),
              recommendedSamples: z.number().int().positive(),
            }),
          )
          .min(1),
        minimumSampleSeparationMeters: z.number().finite().nonnegative(),
        depthConfidence: z.object({
          highMinimumSamples: z.number().int().positive(),
          mediumMinimumSamples: z.number().int().positive(),
          lowMinimumSamples: z.number().int().positive(),
        }),
        hardConstraints: z.object({
          veryShallowMeanDepthCm: z.number().finite().positive(),
          bedrockOutcropClass: z.string().min(1),
          machineAccessClass: z.string().min(1),
        }),
        validationStatus: z.string().min(1),
        source: z.string().min(1),
      })
      .optional(),
    cropPhysicalCompatibility: z
      .object({
        classification: z.object({
          stronglyLimitedMinimumHighComponents: z.number().int().positive(),
          physicallyLimitedMinimumMediumComponents: z.number().int().positive(),
          criticalUnknownProducesCaution: z.boolean(),
        }),
        confidence: z.object({
          highRequiresVerifiedFieldDepth: z.boolean(),
          highRequiresRealTerrain: z.boolean(),
          highRequiresCompleteCriticalRequirements: z.boolean(),
          mediumMinimumReliableComponents: z.number().int().positive(),
          lowMinimumReliableComponents: z.number().int().positive(),
        }),
        depth: z.object({
          minimumSpatialCoverage: z.string().min(1),
          minimumMeasurementCountForMedium: z.number().int().positive(),
        }),
        terrain: z.object({
          minimumCoverageStatus: z.string().min(1),
          minimumConfidenceForLimitation: z.string().min(1),
        }),
        validationStatus: z.string().min(1),
        source: z.string().min(1),
      })
      .optional(),
    calibrationManagement: z
      .object({
        publication: z.object({
          minimumReviewCount: z.number().int().positive(),
          requireAuthorizedReviewer: z.boolean(),
          requireImpactAnalysis: z.boolean(),
          requireValidSchema: z.boolean(),
          allowDisputedCriticalFields: z.boolean(),
        }),
        impactAnalysis: z.object({
          requireScoreInvariant: z.boolean(),
          requireRankInvariant: z.boolean(),
          maximumFixtureCount: z.number().int().positive(),
        }),
        validationResolution: z.object({
          fieldValidatedMinimumFieldCount: z.number().int().positive(),
          expertReviewedMinimumFieldCount: z.number().int().positive(),
          partiallyValidatedMinimumFieldCount: z.number().int().positive(),
        }),
        cache: z.object({
          activeProfileTtlSeconds: z.number().int().positive(),
        }),
        validationStatus: z.string().min(1),
        source: z.string().min(1),
      })
      .optional(),
    persistence: z
      .object({
        provider: z.object({
          default: z.string().min(1),
          supported: z.array(z.string().min(1)).min(1),
        }),
        database: z.object({
          connectionTimeoutMs: z.number().int().positive(),
          statementTimeoutMs: z.number().int().positive(),
          poolMax: z.number().int().positive(),
          autoMigrate: z.boolean(),
        }),
        optimisticConcurrency: z.object({
          enabled: z.boolean(),
          requiredForPublishedResources: z.boolean(),
        }),
        idempotency: z.object({
          enabled: z.boolean(),
          ttlSeconds: z.number().int().positive(),
        }),
        audit: z.object({
          useSequenceNumbers: z.boolean(),
        }),
        validationStatus: z.string().min(1),
        source: z.string().min(1),
      })
      .optional(),
    operations: z
      .object({
        idempotency: z.object({
          enabled: z.boolean(),
          requiredForCriticalWrites: z.boolean(),
          ttlSeconds: z.number().int().positive(),
          replayClientErrors: z.boolean(),
          inProgressStatusCode: z.number().int(),
          maximumKeyLength: z.number().int().positive(),
        }),
        correlation: z.object({
          enabled: z.boolean(),
          headerName: z.string().min(1),
          generateWhenMissing: z.boolean(),
        }),
        logging: z.object({
          structured: z.boolean(),
          slowRequestThresholdMs: z.number().int().positive(),
          redactSensitiveFields: z.boolean(),
        }),
        metrics: z.object({
          enabled: z.boolean(),
          provider: z.string().min(1),
        }),
        validationStatus: z.string().min(1),
        source: z.string().min(1),
      })
      .optional(),
    notes: z.array(z.string()).min(1),
  })
  .superRefine((value, ctx) => {
    const total =
      value.climateWeight +
      value.soilWeight +
      value.sentinelWeight +
      value.reliabilityWeight;
    if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `weights must total 100 (got ${total})`,
      });
    }
    const sub =
      value.climateSubWeights.growingSeasonTemperature +
      value.climateSubWeights.precipitation +
      value.climateSubWeights.frostCompatibility +
      value.climateSubWeights.extremeHeatCompatibility +
      value.climateSubWeights.droughtCompatibility +
      value.climateSubWeights.irrigationCompatibility;
    if (Math.abs(sub - value.climateWeight) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `climate sub-weights must equal climateWeight (got ${sub})`,
      });
    }
    const t = value.classificationThresholds;
    if (!(t.veryHigh > t.high && t.high > t.moderate && t.moderate > t.low && t.low > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'classification thresholds must be strictly descending',
      });
    }
  });

function resolveDefaultPath(): string {
  const beside = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../knowledge/calibration/default-calibration.json',
  );
  if (existsSync(beside)) {
    return beside;
  }
  return path.join(
    process.cwd(),
    'src/modules/crop-recommendation/knowledge/calibration/default-calibration.json',
  );
}

export class CalibrationProfileRepository {
  private readonly profile: CalibrationProfile;

  constructor(filePath = resolveDefaultPath()) {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    this.profile = calibrationSchema.parse(raw);
  }

  get(): CalibrationProfile {
    return this.profile;
  }
}

let shared: CalibrationProfileRepository | null = null;

export function getSharedCalibrationRepository(): CalibrationProfileRepository {
  if (!shared) {
    shared = new CalibrationProfileRepository();
  }
  return shared;
}

export function resetSharedCalibrationRepository(): void {
  shared = null;
}
