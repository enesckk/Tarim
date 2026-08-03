import { describe, expect, it, beforeEach } from 'vitest';
import {
  CropCalendarService,
  isDateInWindow,
} from '../src/modules/crop-recommendation/phenology/crop-calendar.service.js';
import { PhenologyWindowService } from '../src/modules/crop-recommendation/phenology/phenology-window.service.js';
import { CropPhenologyService } from '../src/modules/crop-recommendation/phenology/crop-phenology.service.js';
import { AgronomicValidationService } from '../src/modules/crop-recommendation/validation/agronomic-validation.service.js';
import { ScoreCalibrationService } from '../src/modules/crop-recommendation/calibration/score-calibration.service.js';
import { getSharedCalibrationRepository } from '../src/modules/crop-recommendation/calibration/calibration-profile.repository.js';
import { ManagementScenarioService } from '../src/modules/crop-recommendation/scenarios/management-scenario.service.js';
import { ScenarioComparisonService } from '../src/modules/crop-recommendation/scenarios/scenario-comparison.service.js';
import { RecommendationValidationReportService } from '../src/modules/crop-recommendation/validation/recommendation-validation-report.service.js';
import { ClimateSuitabilityService } from '../src/modules/crop-recommendation/services/climate-suitability.service.js';
import { CropSuitabilityService } from '../src/modules/crop-recommendation/services/crop-suitability.service.js';
import { JsonCropRepository } from '../src/modules/crop-recommendation/repositories/json-crop.repository.js';
import { CropKnowledgeService } from '../src/modules/crop-recommendation/services/crop-knowledge.service.js';
import { CropRecommendationService } from '../src/modules/crop-recommendation/services/crop-recommendation.service.js';
import { ParcelQueryService } from '../src/modules/parcel/services/parcel-query.service.js';
import { MockParcelProvider } from '../src/modules/parcel/providers/mock-parcel.provider.js';
import { ClimateProfileService } from '../src/modules/environment/climate/services/climate-profile.service.js';
import { MockClimateProvider } from '../src/modules/environment/climate/providers/mock-climate.provider.js';
import { SoilProfileService } from '../src/modules/environment/soil/services/soil-profile.service.js';
import { MockSoilProvider } from '../src/modules/environment/soil/providers/mock-soil.provider.js';
import { ClimateAggregationService } from '../src/modules/environment/climate/services/climate-aggregation.service.js';
import { ClimateRiskClassificationService } from '../src/modules/environment/climate/services/climate-risk-classification.service.js';
import {
  drainageScoreRatio,
  combinedSalinityRatio,
} from '../src/modules/crop-recommendation/services/soil-suitability.service.js';
import { vegetationActivityRatio } from '../src/modules/crop-recommendation/services/sentinel-suitability.service.js';
import type {
  ClimateProfile,
  MonthlyClimateStats,
} from '../src/modules/environment/climate/types/climate.types.js';
import type { SoilProfile } from '../src/modules/environment/soil/types/soil.types.js';
import type { AnalysisSummaryResponse } from '../src/services/agricultural-analysis.service.js';
import type { TimeSeriesResponse } from '../src/services/time-series.service.js';
import type { RecommendationInputSnapshot } from '../src/modules/crop-recommendation/types/recommendation.types.js';
import type { SuitabilityScoreResult } from '../src/modules/crop-recommendation/types/suitability.types.js';

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

function mockMonthly(): MonthlyClimateStats[] {
  const means = [5.5, 7, 11, 16, 21.5, 27, 31, 30.5, 26, 19.5, 12, 7];
  const mins = [-4, -3, 0, 5, 10, 15, 20, 19, 14, 8, 2, -2];
  const maxs = [14, 16, 22, 28, 34, 38, 42, 41, 36, 30, 22, 15];
  const precip = [70, 60, 55, 45, 30, 10, 5, 5, 10, 35, 55, 60];
  const frost = [12, 8, 3, 0.5, 0, 0, 0, 0, 0, 0, 2, 8];
  const heat = [0, 0, 0, 1, 5, 15, 22, 20, 8, 1, 0, 0];
  const rainy = [10, 9, 9, 7, 5, 2, 1, 1, 2, 5, 8, 9];
  return means.map((temperatureMeanC, index) => ({
    month: index + 1,
    temperatureMeanC,
    temperatureMinC: mins[index],
    temperatureMaxC: maxs[index],
    precipitationMm: precip[index],
    frostDays: frost[index],
    extremeHeatDays: heat[index],
    rainyDays: rainy[index],
  }));
}

function climateWithMonthly(overrides: Partial<ClimateProfile> = {}): ClimateProfile {
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
      isEstimated: true,
    },
    climatology: { monthly: mockMonthly() },
    ...overrides,
  };
}

function baseSoil(overrides: Partial<SoilProfile> = {}): SoilProfile {
  return {
    provider: 'mock',
    location: { longitude: 37.47, latitude: 37.2 },
    soil: {
      ph: 7.4,
      texture: 'clay_loam',
      organicMatterPercent: 1.6,
      calciumCarbonatePercent: null,
      electricalConductivityDsM: null,
      salinityRisk: 'unknown',
      drainage: 'unknown',
      depthCm: null,
      waterHoldingCapacity: 'medium',
    },
    suitabilitySignals: {
      rootDevelopment: 'moderate',
      waterRetention: 'moderate',
      salinityConstraint: 'unknown',
      generalSoilCondition: 'moderate',
    },
    confidence: 'low',
    limitations: ['mock'],
    metadata: {
      source: 'mock',
      generatedAt: new Date().toISOString(),
      isMock: true,
      isEstimated: true,
    },
    ...overrides,
  };
}

function analysisStub(): AnalysisSummaryResponse {
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
        mean: 0.22,
        median: 0.22,
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
        mean: 0.05,
        median: 0.05,
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
        mean: 0.18,
        median: 0.18,
        standardDeviation: 0.05,
        validPixelCount: 80,
        noDataPixelCount: 20,
        totalPixelCount: 100,
      },
    },
    interpretation: {
      confidence: 'medium',
      vegetationStatus: 'low',
      moistureStatus: 'moderate',
      bareSoilSignal: 'moderate',
      notes: [],
    },
  } as AnalysisSummaryResponse;
}

function timeSeriesStub(): TimeSeriesResponse {
  return {
    summary: {
      successfulAcquisitionCount: 4,
      requestedMonths: 6,
      failedAcquisitionCount: 0,
      periodStart: '2025-12-01',
      periodEnd: '2026-06-01',
    },
    trends: {
      ndvi: { direction: 'stable', slope: 0, description: 'stable' },
      ndmi: { direction: 'stable', slope: 0, description: 'stable' },
      bsi: { direction: 'stable', slope: 0, description: 'stable' },
    },
    series: [],
  } as TimeSeriesResponse;
}

function snapshotStub(): RecommendationInputSnapshot {
  return {
    parcel: null,
    geometryType: 'Polygon',
    climate: climateWithMonthly(),
    soil: baseSoil(),
    analysis: analysisStub(),
    timeSeries: timeSeriesStub(),
  };
}

describe('phenology calendar', () => {
  const calendar = new CropCalendarService();

  it('parses planting windows and earliest/latest', () => {
    const windows = [{ startMonth: 10, endMonth: 11, label: 'Kışlık ekim' }];
    const earliest = calendar.resolvePlantingDate({
      windows,
      scenario: 'earliest',
      referenceYear: 2026,
    });
    const latest = calendar.resolvePlantingDate({
      windows,
      scenario: 'latest',
      referenceYear: 2026,
    });
    expect(earliest.selectedDate.startsWith('2026-10')).toBe(true);
    expect(latest.selectedDate.startsWith('2026-11')).toBe(true);
  });

  it('supports cross-year windows', () => {
    const window = { startMonth: 11, endMonth: 2, label: 'Kış tesis' };
    expect(isDateInWindow(new Date(Date.UTC(2026, 11, 15)), window, 2026)).toBe(true);
    expect(isDateInWindow(new Date(Date.UTC(2026, 0, 15)), window, 2026)).toBe(true);
    expect(isDateInWindow(new Date(Date.UTC(2026, 5, 15)), window, 2026)).toBe(false);
  });

  it('warns on custom planting outside window', () => {
    const result = calendar.resolvePlantingDate({
      windows: [{ startMonth: 10, endMonth: 11, label: 'Kışlık' }],
      scenario: 'custom',
      customPlantingDate: '2026-05-01',
      referenceYear: 2026,
    });
    expect(result.withinRecommendedWindow).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('phenology stages', () => {
  const knowledge = new CropKnowledgeService(new JsonCropRepository());
  const phenology = new CropPhenologyService();
  const windows = new PhenologyWindowService();

  it('produces winter wheat stage dates across seasons', () => {
    const wheat = knowledge.getById('wheat');
    const result = phenology.evaluate({
      crop: wheat,
      climate: climateWithMonthly(),
      plantingScenario: 'earliest',
      referenceYear: 2026,
    });
    expect(result.stageResults.length).toBe(wheat.phenology.growthStages.length);
    expect(result.selectedPlantingDate.startsWith('2026-10')).toBe(true);
    const flowering = result.stageResults.find((s) => s.stage === 'flowering');
    expect(flowering).toBeDefined();
    expect(flowering!.period.start < flowering!.period.end).toBe(true);
  });

  it('keeps perennial dormancy stage without annual harvest cycle assumption', () => {
    const pistachio = knowledge.getById('pistachio');
    expect(pistachio.phenology.perennial.isPerennial).toBe(true);
    expect(pistachio.phenology.perennial.dormancyMonths.length).toBeGreaterThan(0);
    const result = phenology.evaluate({
      crop: pistachio,
      climate: climateWithMonthly(),
      plantingScenario: 'automatic',
      referenceYear: 2026,
    });
    expect(result.stageResults.some((s) => s.stage === 'dormancy')).toBe(true);
    expect(result.stageResults.some((s) => s.stage === 'harvest')).toBe(false);
  });

  it('requires stage weights to total ~1', () => {
    const validator = new AgronomicValidationService();
    for (const crop of knowledge.listAll()) {
      expect(
        validator.assertStageWeights(crop.phenology.growthStages.map((s) => s.weight)),
      ).toBe(true);
    }
  });

  it('generates critical stage risks for high-risk stages', () => {
    const tomato = knowledge.getById('tomato');
    const dryHot: MonthlyClimateStats[] = mockMonthly().map((row) =>
      row.month >= 5 && row.month <= 8
        ? {
            ...row,
            precipitationMm: 1,
            extremeHeatDays: 28,
            temperatureMeanC: 34,
          }
        : row,
    );
    const stage = tomato.phenology.growthStages.find((s) => s.id === 'flowering')!;
    const evaluated = windows.evaluateStage({
      stage,
      plantingDate: new Date(Date.UTC(2026, 3, 15)),
      monthly: dryHot,
    });
    expect(['medium', 'high']).toContain(evaluated.riskLevel);
  });
});

describe('monthly climate aggregation', () => {
  it('builds monthly climatology including Dec-Jan transition months', () => {
    const aggregation = new ClimateAggregationService(
      new ClimateRiskClassificationService(),
    );
    const t2m: Record<string, number> = {};
    const t2mMin: Record<string, number> = {};
    const t2mMax: Record<string, number> = {};
    const precip: Record<string, number> = {};

    for (let year = 2020; year <= 2022; year += 1) {
      for (let month = 0; month < 12; month += 1) {
        for (let day = 1; day <= 5; day += 1) {
          const key = `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
          t2m[key] = 10 + month;
          t2mMin[key] = month === 0 || month === 11 ? -2 : 5;
          t2mMax[key] = month >= 6 ? 38 : 25;
          precip[key] = month === 11 || month === 0 ? 8 : 1;
        }
      }
    }

    const metrics = aggregation.aggregate(
      {
        T2M: t2m,
        T2M_MIN: t2mMin,
        T2M_MAX: t2mMax,
        PRECTOTCORR: precip,
      },
      ['T2M', 'T2M_MIN', 'T2M_MAX', 'PRECTOTCORR'],
      3,
    );
    expect(metrics.monthly).toHaveLength(12);
    expect(metrics.monthly[0].frostDays).toBeGreaterThan(0);
    expect(metrics.monthly[6].extremeHeatDays).toBeGreaterThan(0);
    expect(metrics.monthly[11].precipitationMm).toBeGreaterThan(0);
  });
});

describe('irrigation scenarios', () => {
  const knowledge = new CropKnowledgeService(new JsonCropRepository());
  const climateService = new ClimateSuitabilityService();

  it('penalizes high irrigation dependency under rainfed', () => {
    const cotton = knowledge.getById('cotton');
    const climate = climateWithMonthly();
    const rainfed = climateService.score(cotton, climate, { irrigationScenario: 'rainfed' });
    const full = climateService.score(cotton, climate, { irrigationScenario: 'full' });
    expect(full.score).toBeGreaterThanOrEqual(rainfed.score);
  });

  it('partially recovers under limited irrigation', () => {
    const tomato = knowledge.getById('tomato');
    const climate = climateWithMonthly();
    const rainfed = climateService.score(tomato, climate, { irrigationScenario: 'rainfed' });
    const limited = climateService.score(tomato, climate, { irrigationScenario: 'limited' });
    const full = climateService.score(tomato, climate, { irrigationScenario: 'full' });
    expect(limited.score).toBeGreaterThanOrEqual(rainfed.score);
    expect(full.score).toBeGreaterThanOrEqual(limited.score);
  });

  it('drought tolerant crops fare better under rainfed than irrigation-hungry crops', () => {
    const barley = knowledge.getById('barley');
    const cotton = knowledge.getById('cotton');
    const climate = climateWithMonthly();
    const barleyRainfed = climateService.score(barley, climate, {
      irrigationScenario: 'rainfed',
    });
    const cottonRainfed = climateService.score(cotton, climate, {
      irrigationScenario: 'rainfed',
    });
    expect(barleyRainfed.score).toBeGreaterThan(cottonRainfed.score);
  });

  it('full irrigation does not erase drought/heat context factors', () => {
    const cotton = knowledge.getById('cotton');
    const full = climateService.score(cotton, climateWithMonthly(), {
      irrigationScenario: 'full',
    });
    const drought = full.factors.find((f) => f.code === 'DROUGHT_COMPATIBILITY');
    const heat = full.factors.find((f) => f.code === 'EXTREME_HEAT_COMPATIBILITY');
    expect(drought).toBeDefined();
    expect(heat).toBeDefined();
    expect(drought!.score).toBeLessThanOrEqual(drought!.maxScore);
  });
});

describe('soil management scenarios', () => {
  const management = new ManagementScenarioService();

  function currentScore(final: number): SuitabilityScoreResult {
    return {
      gross: final,
      constraintPenalty: 0,
      final,
      classification: 'moderate',
      label: 'test',
      breakdown: {
        climate: { score: 20, maxScore: 35, factors: [] },
        soil: { score: 25, maxScore: 40, factors: [] },
        sentinel: { score: 10, maxScore: 15, factors: [] },
        reliability: { score: 5, maxScore: 10, factors: [] },
      },
      constraints: [],
    };
  }

  it('potential >= current and improvement capped at 15', () => {
    const result = management.estimatePotential(
      currentScore(60),
      {
        drainageImprovement: true,
        organicMatterImprovement: true,
        phCorrection: true,
      },
      {
        drainage: 'poor',
        ph: 5.2,
        organicMatterPercent: 0.8,
        hasCriticalConstraint: false,
      },
    );
    expect(result.withSelectedManagement.score).toBeGreaterThanOrEqual(result.current.score);
    expect(result.withSelectedManagement.estimatedImprovement).toBeLessThanOrEqual(15);
  });

  it('unknown drainage does not get full drainage uplift', () => {
    const unknown = management.estimatePotential(
      currentScore(60),
      {
        drainageImprovement: true,
        organicMatterImprovement: false,
        phCorrection: false,
      },
      {
        drainage: 'unknown',
        ph: 7,
        organicMatterPercent: 2,
        hasCriticalConstraint: false,
      },
    );
    const poor = management.estimatePotential(
      currentScore(60),
      {
        drainageImprovement: true,
        organicMatterImprovement: false,
        phCorrection: false,
      },
      {
        drainage: 'poor',
        ph: 7,
        organicMatterPercent: 2,
        hasCriticalConstraint: false,
      },
    );
    expect(unknown.withSelectedManagement.estimatedImprovement).toBeLessThan(
      poor.withSelectedManagement.estimatedImprovement,
    );
  });
});

describe('calibration profile', () => {
  it('validates weights total 100 and threshold ordering', () => {
    const profile = getSharedCalibrationRepository().get();
    expect(
      profile.climateWeight +
        profile.soilWeight +
        profile.sentinelWeight +
        profile.reliabilityWeight,
    ).toBe(100);
    expect(profile.classificationThresholds.veryHigh).toBeGreaterThan(
      profile.classificationThresholds.high,
    );
    expect(profile.version).toBe('2.0');
  });

  it('looks up penalties and classifies via service', () => {
    const calibration = new ScoreCalibrationService();
    expect(calibration.penalty('critical')).toBe(25);
    expect(calibration.classify(90).classification).toBe('very_high');
    expect(calibration.classify(72).classification).toBe('high');
  });
});

describe('soil and sentinel invariants', () => {
  it('missing EC does not produce optimistic salinity score', () => {
    const knowledge = new CropKnowledgeService(new JsonCropRepository());
    const wheat = knowledge.getById('wheat');
    expect(combinedSalinityRatio(wheat, null, 'unknown')).toBeLessThan(0.5);
  });

  it('unknown drainage is not full score', () => {
    expect(drainageScoreRatio('good', 'unknown')).toBeLessThan(1);
  });

  it('annual crop low NDVI is not eliminated', () => {
    const knowledge = new CropKnowledgeService(new JsonCropRepository());
    const wheat = knowledge.getById('wheat');
    expect(vegetationActivityRatio(wheat, 0.15, 'stable')).toBeGreaterThan(0.4);
  });
});

describe('scenario comparison + validation report', () => {
  let recommendationService: CropRecommendationService;
  let knowledge: CropKnowledgeService;

  beforeEach(() => {
    knowledge = new CropKnowledgeService(new JsonCropRepository());
    recommendationService = new CropRecommendationService(
      new ParcelQueryService(new MockParcelProvider()),
      new ClimateProfileService(new MockClimateProvider()),
      new SoilProfileService(new MockSoilProvider()),
      knowledge,
      new CropSuitabilityService(),
      undefined,
      undefined,
      {
        computeBestAnalysisSummary: async () => analysisStub(),
      },
      {
        computeTimeSeries: async () => timeSeriesStub(),
      },
    );
  });

  it('validates max crops/scenarios and is deterministic', async () => {
    const comparison = new ScenarioComparisonService(recommendationService, knowledge);
    const request = {
      geometry: SAMPLE_GEOMETRY,
      cropIds: ['pistachio', 'barley', 'wheat', 'cotton'],
      scenarios: [
        { id: 'rainfed', label: 'Sulamasız', irrigationScenario: 'rainfed' as const },
        { id: 'limited', label: 'Sınırlı', irrigationScenario: 'limited' as const },
        { id: 'full', label: 'Düzenli', irrigationScenario: 'full' as const },
      ],
    };
    const a = await comparison.compare(request);
    const b = await comparison.compare(request);
    expect(a.crops).toHaveLength(4);
    expect(a.bestByScenario).toHaveLength(3);
    expect(JSON.stringify(a.crops)).toBe(JSON.stringify(b.crops));

    await expect(
      comparison.compare({
        ...request,
        cropIds: Array.from({ length: 11 }, (_, i) => `c${i}`),
      }),
    ).rejects.toThrow(/1 and 10/);
  });

  it('marks SoilGrids/mock stacks as needs_review or insufficient_data', () => {
    const snapshot = snapshotStub();
    const report = new RecommendationValidationReportService(knowledge).build(snapshot);
    expect(['needs_review', 'insufficient_data']).toContain(report.overallStatus);
    expect(report.criticalGaps.some((g) => g.code === 'LAB_SOIL_ANALYSIS_MISSING')).toBe(
      true,
    );
    const codes = report.criticalGaps.map((g) => g.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('same evaluate input yields same output', async () => {
    const options = {
      timeSeriesMonths: 6,
      topN: 5,
      climateYears: 10,
      analysisDays: 30,
      maxCloudCoverage: 20,
      irrigationScenario: 'rainfed' as const,
      plantingScenario: 'automatic' as const,
    };
    const a = await recommendationService.evaluate({
      geometry: SAMPLE_GEOMETRY,
      options,
    });
    const b = await recommendationService.evaluate({
      geometry: SAMPLE_GEOMETRY,
      options,
    });
    expect(a.recommendations.map((r) => r.score.final)).toEqual(
      b.recommendations.map((r) => r.score.final),
    );
    expect(a.recommendations[0].phenology).toBeDefined();
    expect(a.recommendations[0].audit).toBeDefined();
    expect(a.recommendations[0].scenarios).toBeDefined();
  });

  it('full irrigation score is not unreasonably below rainfed for same crop', async () => {
    const rainfed = await recommendationService.evaluate({
      geometry: SAMPLE_GEOMETRY,
      options: {
        timeSeriesMonths: 6,
        topN: 14,
        climateYears: 10,
        analysisDays: 30,
        maxCloudCoverage: 20,
        irrigationScenario: 'rainfed',
      },
    });
    const full = await recommendationService.evaluate({
      geometry: SAMPLE_GEOMETRY,
      options: {
        timeSeriesMonths: 6,
        topN: 14,
        climateYears: 10,
        analysisDays: 30,
        maxCloudCoverage: 20,
        irrigationScenario: 'full',
      },
    });
    for (const cropId of ['cotton', 'tomato', 'barley', 'chickpea']) {
      const r = rainfed.recommendations.find((item) => item.crop.id === cropId)!;
      const f = full.recommendations.find((item) => item.crop.id === cropId)!;
      expect(f.score.final + 0.01).toBeGreaterThanOrEqual(r.score.final);
    }
  });
});
