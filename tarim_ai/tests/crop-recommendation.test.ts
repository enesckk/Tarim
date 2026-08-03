import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cropKnowledgeSchema } from '../src/modules/crop-recommendation/knowledge/schemas/crop-knowledge.schema.js';
import { JsonCropRepository } from '../src/modules/crop-recommendation/repositories/json-crop.repository.js';
import { TOTAL_GROSS_SCORE, SCORING_WEIGHTS } from '../src/modules/crop-recommendation/rules/scoring-weights.js';
import {
  assertFiniteNumber,
  scoreNumericRange,
  scoreTemperatureRange,
  clampScore,
} from '../src/modules/crop-recommendation/rules/range-scoring.js';
import { ClimateSuitabilityService } from '../src/modules/crop-recommendation/services/climate-suitability.service.js';
import {
  SoilSuitabilityService,
  textureScoreRatio,
  combinedSalinityRatio,
  drainageScoreRatio,
} from '../src/modules/crop-recommendation/services/soil-suitability.service.js';
import {
  SentinelSuitabilityService,
  vegetationActivityRatio,
} from '../src/modules/crop-recommendation/services/sentinel-suitability.service.js';
import {
  ConstraintEvaluationService,
  dedupeByGroup,
  matchesConstraint,
} from '../src/modules/crop-recommendation/services/constraint-evaluation.service.js';
import { RecommendationConfidenceService } from '../src/modules/crop-recommendation/services/recommendation-confidence.service.js';
import { CropSuitabilityService } from '../src/modules/crop-recommendation/services/crop-suitability.service.js';
import { CropKnowledgeService } from '../src/modules/crop-recommendation/services/crop-knowledge.service.js';
import { CropRecommendationService } from '../src/modules/crop-recommendation/services/crop-recommendation.service.js';
import { RecommendationExplanationService } from '../src/modules/crop-recommendation/services/recommendation-explanation.service.js';
import { cropRecommendationResponseSchema } from '../src/modules/crop-recommendation/schemas/crop-recommendation-response.schema.js';
import { ParcelQueryService } from '../src/modules/parcel/services/parcel-query.service.js';
import { MockParcelProvider } from '../src/modules/parcel/providers/mock-parcel.provider.js';
import { ClimateProfileService } from '../src/modules/environment/climate/services/climate-profile.service.js';
import { MockClimateProvider } from '../src/modules/environment/climate/providers/mock-climate.provider.js';
import { SoilProfileService } from '../src/modules/environment/soil/services/soil-profile.service.js';
import { MockSoilProvider } from '../src/modules/environment/soil/providers/mock-soil.provider.js';
import type { ClimateProfile } from '../src/modules/environment/climate/types/climate.types.js';
import type { SoilProfile } from '../src/modules/environment/soil/types/soil.types.js';
import type { AnalysisSummaryResponse } from '../src/services/agricultural-analysis.service.js';
import type { TimeSeriesResponse } from '../src/services/time-series.service.js';
import type { RecommendationInputSnapshot } from '../src/modules/crop-recommendation/types/recommendation.types.js';
import type { CropKnowledge } from '../src/modules/crop-recommendation/types/crop.types.js';
import { CONSTRAINT_PENALTIES } from '../src/modules/crop-recommendation/rules/scoring-thresholds.js';

const SAMPLE_GEOMETRY = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [37.474, 37.206],
      [37.476, 37.206],
      [37.476, 37.208],
      [37.474, 37.208],
      [37.474, 37.206],
    ],
  ],
};

function baseClimate(overrides: Partial<ClimateProfile> = {}): ClimateProfile {
  return {
    provider: 'mock',
    location: { longitude: 37.47, latitude: 37.2 },
    period: { years: 10, type: 'climatology' },
    temperature: {
      annualMeanC: 18.4,
      growingSeasonMeanC: 24.1,
      summerMeanC: 30.6,
      winterMeanC: 7.2,
      annualMinC: -4.5,
      annualMaxC: 42,
      frostRisk: 'medium',
      extremeHeatRisk: 'high',
    },
    precipitation: {
      annualTotalMm: 540,
      growingSeasonTotalMm: 220,
      summerTotalMm: 35,
      seasonality: 'high',
    },
    water: {
      estimatedIrrigationNeed: 'high',
      droughtRisk: 'medium',
    },
    confidence: 'low',
    limitations: ['mock'],
    metadata: {
      source: 'mock',
      generatedAt: new Date().toISOString(),
      isMock: true,
    },
    ...overrides,
  };
}

function baseSoil(overrides: Partial<SoilProfile> = {}): SoilProfile {
  return {
    provider: 'mock',
    location: { longitude: 37.47, latitude: 37.2 },
    soil: {
      ph: 7.8,
      texture: 'clay_loam',
      organicMatterPercent: 1.4,
      electricalConductivityDsM: 1.1,
      salinityRisk: 'medium',
      drainage: 'moderate',
      waterHoldingCapacity: 'medium',
      calciumCarbonatePercent: 12.5,
      depthCm: 90,
    },
    suitabilitySignals: {
      rootDevelopment: 'moderate',
      waterRetention: 'moderate',
      salinityConstraint: 'medium',
      generalSoilCondition: 'moderate',
    },
    confidence: 'low',
    limitations: ['mock'],
    metadata: {
      source: 'mock',
      generatedAt: new Date().toISOString(),
      isMock: true,
    },
    ...overrides,
  };
}

function baseAnalysis(ndviMean = 0.28, bsiMean = 0.22): AnalysisSummaryResponse {
  return {
    selectionType: 'best',
    selectionReason: 'test',
    product: {
      productId: 'TEST',
      datetime: '2026-07-01T00:00:00Z',
      satellite: 'sentinel-2a',
      tile: 'T37SCB',
      cloudCoverage: 5,
    },
    indices: {
      ndvi: {
        min: 0,
        max: 1,
        mean: ndviMean,
        median: ndviMean,
        standardDeviation: 0.1,
        validPixelCount: 80,
        noDataPixelCount: 20,
        totalPixelCount: 100,
        vegetatedPixelCount: 20,
        lowVegetationPixelCount: 30,
        bareOrWaterPixelCount: 30,
        vegetatedPixelRatio: 0.2,
        lowVegetationPixelRatio: 0.3,
        bareOrWaterPixelRatio: 0.3,
      },
      ndmi: {
        min: -0.2,
        max: 0.3,
        mean: 0.02,
        median: 0.02,
        standardDeviation: 0.05,
        validPixelCount: 80,
        noDataPixelCount: 20,
        totalPixelCount: 100,
        highMoisturePixelCount: 10,
        moderateMoisturePixelCount: 40,
        lowMoisturePixelCount: 30,
        highMoisturePixelRatio: 0.1,
        moderateMoisturePixelRatio: 0.4,
        lowMoisturePixelRatio: 0.3,
      },
      bsi: {
        min: 0,
        max: 0.5,
        mean: bsiMean,
        median: bsiMean,
        standardDeviation: 0.05,
        validPixelCount: 80,
        noDataPixelCount: 20,
        totalPixelCount: 100,
        highBareSoilPixelCount: 40,
        moderateBareSoilPixelCount: 30,
        lowBareSoilPixelCount: 10,
        highBareSoilPixelRatio: 0.4,
        moderateBareSoilPixelRatio: 0.3,
        lowBareSoilPixelRatio: 0.1,
      },
    },
    interpretation: {
      vegetationStatus: 'limited',
      moistureStatus: 'moderate',
      soilSurfaceStatus: 'bare',
      summary: 'test',
      confidence: 'high',
    },
  };
}

function baseTimeSeries(
  overrides: Partial<TimeSeriesResponse> = {},
): TimeSeriesResponse {
  return {
    period: { start: '2026-01-01', end: '2026-07-01', months: 6 },
    filters: { maxCloudCoverage: 20, sampling: 'weekly-best' },
    summary: {
      catalogProductCount: 40,
      selectedAcquisitionCount: 12,
      successfulAcquisitionCount: 10,
      failedAcquisitionCount: 2,
    },
    series: Array.from({ length: 10 }, (_, i) => ({
      productId: `P${i}`,
      datetime: `2026-0${(i % 9) + 1}-01T00:00:00Z`,
      satellite: 'sentinel-2a',
      tile: 'T37SCB',
      cloudCoverage: 5,
      validPixelRatio: 0.55,
      indices: { ndviMean: 0.4 - i * 0.02, ndmiMean: 0.05, bsiMean: 0.1 + i * 0.01 },
      status: 'success' as const,
    })),
    trends: {
      ndvi: {
        first: 0.4,
        last: 0.2,
        min: 0.2,
        max: 0.4,
        mean: 0.3,
        change: -0.2,
        direction: 'decreasing',
      },
      ndmi: {
        first: 0.05,
        last: 0.02,
        min: 0.02,
        max: 0.05,
        mean: 0.03,
        change: -0.03,
        direction: 'stable',
      },
      bsi: {
        first: 0.1,
        last: 0.25,
        min: 0.1,
        max: 0.25,
        mean: 0.18,
        change: 0.15,
        direction: 'increasing',
      },
    },
    interpretation: {
      vegetationTrend: 'decreasing',
      moistureTrend: 'stable',
      soilSurfaceTrend: 'increasing bare',
      summary: 'test',
      confidence: 'high',
    },
    ...overrides,
  };
}

function snapshot(partial: Partial<RecommendationInputSnapshot> = {}): RecommendationInputSnapshot {
  return {
    parcel: null,
    geometryType: 'Polygon',
    climate: baseClimate(),
    soil: baseSoil(),
    analysis: baseAnalysis(),
    timeSeries: baseTimeSeries(),
    ...partial,
  };
}

describe('Crop Knowledge Base', () => {
  const repo = new JsonCropRepository();

  it('validates all crop JSON files against schema', () => {
    const crops = repo.list();
    expect(crops.length).toBe(14);
    for (const crop of crops) {
      expect(() => cropKnowledgeSchema.parse(crop)).not.toThrow();
    }
  });

  it('ensures crop ids are unique', () => {
    const ids = repo.list().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has scoring weights totaling 100', () => {
    expect(TOTAL_GROSS_SCORE).toBe(100);
    expect(
      SCORING_WEIGHTS.climate.growingSeasonTemperature +
        SCORING_WEIGHTS.climate.precipitation +
        SCORING_WEIGHTS.climate.frostCompatibility +
        SCORING_WEIGHTS.climate.extremeHeatCompatibility +
        SCORING_WEIGHTS.climate.droughtCompatibility +
        SCORING_WEIGHTS.climate.irrigationCompatibility,
    ).toBe(SCORING_WEIGHTS.climate.total);
    expect(
      SCORING_WEIGHTS.soil.ph +
        SCORING_WEIGHTS.soil.texture +
        SCORING_WEIGHTS.soil.drainage +
        SCORING_WEIGHTS.soil.salinity +
        SCORING_WEIGHTS.soil.organicMatter +
        SCORING_WEIGHTS.soil.soilDepth +
        SCORING_WEIGHTS.soil.waterHoldingCapacity +
        SCORING_WEIGHTS.soil.calciumCarbonate,
    ).toBe(SCORING_WEIGHTS.soil.total);
  });

  it('rejects invalid ranges and optimalMin > optimalMax', () => {
    const wheat = structuredClone(repo.getById('wheat')!);
    wheat.soil.ph.optimalMin = 8;
    wheat.soil.ph.optimalMax = 6;
    expect(() => cropKnowledgeSchema.parse(wheat)).toThrow();

    wheat.soil.ph.optimalMin = 6;
    wheat.soil.ph.optimalMax = 7;
    wheat.soil.ph.absoluteMin = 7.5;
    expect(() => cropKnowledgeSchema.parse(wheat)).toThrow();
  });
});

describe('Range Scoring', () => {
  const range = { absoluteMin: 0, optimalMin: 10, optimalMax: 20, absoluteMax: 30 };

  it('scores optimum interior as full points', () => {
    expect(scoreNumericRange(15, range)).toBe(1);
  });

  it('applies linear drop outside optimum', () => {
    const mid = scoreNumericRange(5, range);
    expect(mid).toBeGreaterThan(0.25);
    expect(mid).toBeLessThan(1);
  });

  it('scores absolute boundary as 0.25', () => {
    expect(scoreNumericRange(0, range)).toBe(0.25);
    expect(scoreNumericRange(30, range)).toBe(0.25);
  });

  it('scores outside absolute as zero', () => {
    expect(scoreNumericRange(-1, range)).toBe(0);
    expect(scoreNumericRange(31, range)).toBe(0);
  });

  it('rejects NaN', () => {
    expect(() => assertFiniteNumber(Number.NaN)).toThrow();
    expect(() => scoreTemperatureRange(Number.NaN, {
      absoluteMinC: 0,
      optimalMinC: 10,
      optimalMaxC: 20,
      absoluteMaxC: 30,
    })).toThrow();
  });
});

describe('Climate suitability', () => {
  const service = new ClimateSuitabilityService();
  const crop = new JsonCropRepository().getById('tomato')!;

  it('scores temperature, precipitation, frost, irrigation and drought', () => {
    const result = service.score(crop, baseClimate());
    expect(result.maxScore).toBe(35);
    expect(result.factors.map((f) => f.code)).toEqual(
      expect.arrayContaining([
        'TEMPERATURE',
        'PRECIPITATION',
        'FROST_COMPATIBILITY',
        'EXTREME_HEAT_COMPATIBILITY',
        'DROUGHT_COMPATIBILITY',
        'IRRIGATION_COMPATIBILITY',
      ]),
    );
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(35);
  });
});

describe('Soil suitability', () => {
  const repo = new JsonCropRepository();
  const tomato = repo.getById('tomato')!;
  const service = new SoilSuitabilityService();

  it('scores pH and preferred/accepted/incompatible textures', () => {
    expect(textureScoreRatio(tomato, 'loam')).toBe(1);
    expect(textureScoreRatio(tomato, 'silt_loam')).toBe(0.65);
    expect(textureScoreRatio(tomato, 'unknown')).toBe(0.35);
    expect(textureScoreRatio(tomato, 'sand')).toBe(0);

    const result = service.score(tomato, baseSoil());
    expect(result.maxScore).toBe(40);
    expect(result.factors.some((f) => f.code === 'PH')).toBe(true);
  });

  it('deduplicates EC + salinity into combined score', () => {
    const ratio = combinedSalinityRatio(tomato, 1.0, 'low');
    expect(ratio).toBeGreaterThan(0.8);
    const high = combinedSalinityRatio(tomato, 4.0, 'high');
    expect(high).toBeLessThan(0.4);
  });

  it('scores drainage ordinal and soil depth', () => {
    expect(drainageScoreRatio('good', 'good')).toBe(1);
    expect(drainageScoreRatio('good', 'moderate')).toBe(0.55);
    expect(drainageScoreRatio('good', 'poor')).toBe(0.15);

    const shallow = service.score(
      tomato,
      baseSoil({ soil: { ...baseSoil().soil, depthCm: 30 } }),
    );
    const depthFactor = shallow.factors.find((f) => f.code === 'SOIL_DEPTH')!;
    expect(depthFactor.score).toBeLessThan(depthFactor.maxScore);
  });

  it('rejects conceptually via schema for negative organic matter in knowledge', () => {
    const clone = structuredClone(tomato);
    clone.soil.minimumOrganicMatterPercent = -1;
    expect(() => cropKnowledgeSchema.parse(clone)).toThrow();
  });
});

describe('Sentinel suitability', () => {
  const repo = new JsonCropRepository();
  const wheat = repo.getById('wheat')!;
  const pistachio = repo.getById('pistachio')!;
  const service = new SentinelSuitabilityService();

  it('does not heavily penalize low NDVI for annual crops', () => {
    const annual = vegetationActivityRatio(wheat, 0.2, 'decreasing');
    const perennial = vegetationActivityRatio(pistachio, 0.2, 'decreasing');
    expect(annual).toBeGreaterThan(perennial);
    expect(annual).toBeGreaterThanOrEqual(0.7);
  });

  it('rewards persistent vegetation signal for perennials', () => {
    const high = vegetationActivityRatio(pistachio, 0.55, 'stable');
    expect(high).toBe(1);
  });

  it('applies low validPixelRatio quality penalty and interprets trends', () => {
    const lowQuality = service.score(
      wheat,
      baseAnalysis(0.25, 0.25),
      baseTimeSeries({
        series: [
          {
            productId: 'P',
            datetime: '2026-01-01T00:00:00Z',
            satellite: 's2',
            tile: null,
            cloudCoverage: 5,
            validPixelRatio: 0.2,
            indices: { ndviMean: 0.2, ndmiMean: -0.05, bsiMean: 0.3 },
            status: 'success',
          },
        ],
        summary: {
          catalogProductCount: 5,
          selectedAcquisitionCount: 1,
          successfulAcquisitionCount: 1,
          failedAcquisitionCount: 0,
        },
      }),
    );
    const quality = lowQuality.factors.find((f) => f.code === 'ACQUISITION_QUALITY')!;
    expect(quality.score).toBeLessThan(quality.maxScore);

    const normal = service.score(wheat, baseAnalysis(0.25, 0.25), baseTimeSeries());
    expect(normal.factors.find((f) => f.code === 'VEGETATION_ACTIVITY')!.message).toMatch(
      /sınırlı|azal/i,
    );
    expect(normal.factors.find((f) => f.code === 'BARE_SOIL_INTERPRETATION')!.message).toMatch(
      /hasat|sürüm|ekim/i,
    );
  });
});

describe('Constraints', () => {
  const service = new ConstraintEvaluationService();
  const tomato = new JsonCropRepository().getById('tomato')!;

  it('applies critical/major/moderate penalties and clamps final score', () => {
    expect(CONSTRAINT_PENALTIES.critical).toBe(25);
    expect(CONSTRAINT_PENALTIES.major).toBe(12);
    expect(CONSTRAINT_PENALTIES.moderate).toBe(5);

    expect(
      matchesConstraint(8.5, {
        field: 'soil.ph',
        operator: 'greater_than',
        value: 8.0,
        severity: 'critical',
        message: 'x',
      }),
    ).toBe(true);

    const result = service.evaluate(
      tomato,
      snapshot({
        soil: baseSoil({
          soil: { ...baseSoil().soil, ph: 8.2, electricalConductivityDsM: 4.0 },
        }),
      }),
    );
    expect(result.totalPenalty).toBeGreaterThan(0);

    const suitability = new CropSuitabilityService().evaluate(
      tomato,
      snapshot({
        soil: baseSoil({
          soil: { ...baseSoil().soil, ph: 8.2, electricalConductivityDsM: 5 },
        }),
      }),
    );
    expect(suitability.final).toBeGreaterThanOrEqual(0);
    expect(suitability.final).toBeLessThanOrEqual(100);
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(120)).toBe(100);
  });

  it('deduplicates constraints in the same group', () => {
    const deduped = dedupeByGroup([
      {
        code: 'A',
        severity: 'moderate',
        penalty: 5,
        group: 'SALINITY',
        observedValue: 1,
        message: 'a',
      },
      {
        code: 'B',
        severity: 'major',
        penalty: 12,
        group: 'SALINITY',
        observedValue: 2,
        message: 'b',
      },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].code).toBe('B');
  });
});

describe('Reliability / confidence', () => {
  const service = new RecommendationConfidenceService();

  it('forces low confidence when climate/soil are mock', () => {
    expect(service.resolveRecommendationConfidence(snapshot())).toBe('low');
  });

  it('returns medium for estimated grid providers with strong time-series', () => {
    const estimated = snapshot({
      climate: baseClimate({
        confidence: 'high',
        metadata: {
          source: 'NASA POWER',
          generatedAt: 'x',
          isMock: false,
          isEstimated: true,
          provider: 'nasa-power',
        },
      }),
      soil: baseSoil({
        confidence: 'low',
        metadata: {
          source: 'ISRIC SoilGrids',
          generatedAt: 'x',
          isMock: false,
          isEstimated: true,
          provider: 'soilgrids',
        },
      }),
      analysis: {
        ...baseAnalysis(),
        interpretation: { ...baseAnalysis().interpretation, confidence: 'high' },
      },
      timeSeries: baseTimeSeries({
        summary: {
          catalogProductCount: 40,
          selectedAcquisitionCount: 12,
          successfulAcquisitionCount: 10,
          failedAcquisitionCount: 2,
        },
      }),
    });
    expect(service.resolveRecommendationConfidence(estimated)).toBe('medium');
  });

  it('can return high only with non-estimated climate+soil and strong time-series', () => {
    const real = snapshot({
      climate: baseClimate({
        confidence: 'high',
        metadata: {
          source: 'station',
          generatedAt: 'x',
          isMock: false,
          isEstimated: false,
          provider: 'station',
        },
      }),
      soil: baseSoil({
        confidence: 'high',
        metadata: {
          source: 'lab',
          generatedAt: 'x',
          isMock: false,
          isEstimated: false,
          provider: 'lab',
        },
      }),
      analysis: {
        ...baseAnalysis(),
        interpretation: { ...baseAnalysis().interpretation, confidence: 'high' },
      },
      timeSeries: baseTimeSeries({
        summary: {
          catalogProductCount: 40,
          selectedAcquisitionCount: 12,
          successfulAcquisitionCount: 10,
          failedAcquisitionCount: 2,
        },
      }),
    });
    expect(service.resolveRecommendationConfidence(real)).toBe('high');
  });

  it('allows high score with low confidence together', () => {
    const wheat = new JsonCropRepository().getById('wheat')!;
    const result = new CropSuitabilityService().evaluate(wheat, snapshot());
    expect(result.final).toBeGreaterThan(40);
    expect(service.resolveRecommendationConfidence(snapshot())).toBe('low');
  });
});

describe('Recommendation orchestration', () => {
  let recommendationService: CropRecommendationService;
  let analysisSpy: { computeBestAnalysisSummary: ReturnType<typeof vi.fn> };
  let seriesSpy: { computeTimeSeries: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const parcelQueryService = new ParcelQueryService(new MockParcelProvider());
    const climateProfileService = new ClimateProfileService(
      new MockClimateProvider(),
      parcelQueryService,
    );
    const soilProfileService = new SoilProfileService(
      new MockSoilProvider(),
      parcelQueryService,
    );
    const cropKnowledgeService = new CropKnowledgeService(new JsonCropRepository());

    analysisSpy = {
      computeBestAnalysisSummary: vi.fn().mockResolvedValue(baseAnalysis()),
    };
    seriesSpy = {
      computeTimeSeries: vi.fn().mockResolvedValue(baseTimeSeries()),
    };

    recommendationService = new CropRecommendationService(
      parcelQueryService,
      climateProfileService,
      soilProfileService,
      cropKnowledgeService,
      new CropSuitabilityService(),
      new RecommendationExplanationService(),
      new RecommendationConfidenceService(),
      analysisSpy,
      seriesSpy,
    );
  });

  it('sorts by final score, applies topN, builds strengths/risks/whyNotHigher', async () => {
    const result = await recommendationService.evaluate({
      parcelQuery: {
        province: 'Gaziantep',
        district: 'Şehitkamil',
        neighborhood: 'Güngürge',
        block: '108',
        parcel: '7',
      },
      options: {
        timeSeriesMonths: 6,
        topN: 5,
        climateYears: 10,
        analysisDays: 30,
        maxCloudCoverage: 20,
      },
    });

    expect(analysisSpy.computeBestAnalysisSummary).toHaveBeenCalledTimes(1);
    expect(seriesSpy.computeTimeSeries).toHaveBeenCalledTimes(1);
    expect(result.recommendations).toHaveLength(5);
    for (let i = 1; i < result.recommendations.length; i++) {
      expect(result.recommendations[i - 1].score.final).toBeGreaterThanOrEqual(
        result.recommendations[i].score.final,
      );
    }
    expect(result.recommendations[0].strengths.length).toBeGreaterThan(0);
    expect(result.recommendations[0].explanation.whyNotHigher.length).toBeGreaterThan(0);
    expect(result.notRecommended.length).toBeLessThanOrEqual(3);
    expect(result.dataQuality.recommendationConfidence).toBe('low');
    expect(result.dataQuality.usesMockClimate).toBe(true);
    expect(result.dataQuality.usesMockSoil).toBe(true);
    expect(cropRecommendationResponseSchema.parse(result)).toBeTruthy();
    const text = JSON.stringify(result.recommendations);
    expect(text).not.toMatch(/kesin yetişir|kesinlikle uygundur|verim garanti(?:si)?(?!\s+olarak)/i);
    expect(
      result.limitations.some((item) =>
        item.includes('kesin tarımsal karar veya verim garantisi olarak yorumlanmamalıdır'),
      ),
    ).toBe(true);
  });

  it('rejects geometry + parcelQuery together', async () => {
    await expect(
      recommendationService.evaluate({
        geometry: SAMPLE_GEOMETRY,
        parcelQuery: {
          province: 'Gaziantep',
          district: 'Şehitkamil',
          neighborhood: 'Güngürge',
          block: '108',
          parcel: '7',
        },
        options: {
          timeSeriesMonths: 6,
          topN: 5,
          climateYears: 10,
          analysisDays: 30,
          maxCloudCoverage: 20,
        },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('evaluates via geometry input', async () => {
    const result = await recommendationService.evaluate({
      geometry: SAMPLE_GEOMETRY,
      options: {
        timeSeriesMonths: 6,
        topN: 3,
        climateYears: 10,
        analysisDays: 30,
        maxCloudCoverage: 20,
      },
    });
    expect(result.recommendations).toHaveLength(3);
    expect(result.parcel.geometryType).toBe('Polygon');
  });

  it('tolerates single crop evaluation failure', async () => {
    const failingSuitability = {
      evaluate: (crop: CropKnowledge) => {
        if (crop.id === 'tomato') {
          throw new Error('boom');
        }
        return new CropSuitabilityService().evaluate(crop, snapshot());
      },
    };

    const parcelQueryService = new ParcelQueryService(new MockParcelProvider());
    const service = new CropRecommendationService(
      parcelQueryService,
      new ClimateProfileService(new MockClimateProvider(), parcelQueryService),
      new SoilProfileService(new MockSoilProvider(), parcelQueryService),
      new CropKnowledgeService(new JsonCropRepository()),
      failingSuitability as never,
      new RecommendationExplanationService(),
      new RecommendationConfidenceService(),
      analysisSpy,
      seriesSpy,
    );

    const result = await service.evaluate({
      parcelQuery: {
        province: 'Gaziantep',
        district: 'Şehitkamil',
        neighborhood: 'Güngürge',
        block: '108',
        parcel: '7',
      },
      options: {
        timeSeriesMonths: 6,
        topN: 5,
        climateYears: 10,
        analysisDays: 30,
        maxCloudCoverage: 20,
      },
    });

    expect(result.evaluationErrors?.some((e) => e.cropId === 'tomato')).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

describe('Crop knowledge endpoints helpers', () => {
  it('lists and fetches crops', () => {
    const knowledge = new CropKnowledgeService(new JsonCropRepository());
    const list = knowledge.listSummaries();
    expect(list.count).toBe(14);
    expect(knowledge.getById('wheat').name).toBe('Buğday');
    expect(() => knowledge.getById('missing')).toThrowError(
      expect.objectContaining({ statusCode: 404 }),
    );
  });
});
