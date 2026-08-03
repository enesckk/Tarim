import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../../../app.js';
import { resetEnvCache } from '../../../../config/env.js';
import type { TimeSeriesPoint, TimeSeriesResponse } from '../../../../services/time-series.service.js';
import { computeTrend } from '../../../../utils/trend.utils.js';
import { SurfaceAnalysisOrchestratorService, clearSurfaceTimeSeriesCache } from '../surface-analysis-orchestrator.service.js';
import { surfaceAnalysisRequestSchema } from '../surface-analysis.schemas.js';
import { buildSurfaceValidationChecks } from '../surface-validation.service.js';
import { resolveSurfaceCalibration } from '../surface-calibration.js';
import {
  getSharedCalibrationRepository,
  resetSharedCalibrationRepository,
} from '../../../crop-recommendation/calibration/calibration-profile.repository.js';
import { CropRecommendationService } from '../../../crop-recommendation/services/crop-recommendation.service.js';
import { CropKnowledgeService } from '../../../crop-recommendation/services/crop-knowledge.service.js';
import { JsonCropRepository } from '../../../crop-recommendation/repositories/json-crop.repository.js';
import { CropSuitabilityService } from '../../../crop-recommendation/services/crop-suitability.service.js';
import { ParcelQueryService } from '../../../parcel/services/parcel-query.service.js';
import { MockParcelProvider } from '../../../parcel/providers/mock-parcel.provider.js';
import { ClimateProfileService } from '../../../environment/climate/services/climate-profile.service.js';
import { MockClimateProvider } from '../../../environment/climate/providers/mock-climate.provider.js';
import { SoilProfileService } from '../../../environment/soil/services/soil-profile.service.js';
import { MockSoilProvider } from '../../../environment/soil/providers/mock-soil.provider.js';
import { RecommendationValidationReportService } from '../../../crop-recommendation/validation/recommendation-validation-report.service.js';

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

function ensureEnv(): void {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET =
    process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.TERRAIN_PROVIDER = 'mock';
  process.env.CLIMATE_PROVIDER = 'mock';
  process.env.SOIL_PROVIDER = 'mock';
  process.env.PARCEL_PROVIDER = 'mock';
  resetEnvCache();
}

function emptyTrends(ndviValues: number[]): TimeSeriesResponse['trends'] {
  return {
    ndvi: computeTrend(ndviValues),
    ndmi: computeTrend(ndviValues.map(() => 0)),
    bsi: computeTrend(ndviValues.map(() => 0.2)),
  };
}

function point(
  datetime: string,
  ndviMean: number,
  ndmiMean: number,
  bsiMean: number,
): TimeSeriesPoint {
  return {
    productId: `P-${datetime}`,
    datetime,
    satellite: 'sentinel-2a',
    tile: 'T37SCB',
    cloudCoverage: 5,
    validPixelRatio: 0.8,
    indices: { ndviMean, ndmiMean, bsiMean },
    status: 'success',
  };
}

function buildSeries(
  observations: Array<{ datetime: string; ndvi: number; ndmi: number; bsi: number }>,
): TimeSeriesResponse {
  const series = observations.map((o) =>
    point(o.datetime, o.ndvi, o.ndmi, o.bsi),
  );
  const ndviValues = observations.map((o) => o.ndvi);
  return {
    period: { start: '2025-07-01T00:00:00Z', end: '2026-07-01T00:00:00Z', months: 12 },
    filters: { maxCloudCoverage: 20, sampling: 'weekly-best' },
    summary: {
      catalogProductCount: series.length,
      selectedAcquisitionCount: series.length,
      successfulAcquisitionCount: series.length,
      failedAcquisitionCount: 0,
    },
    series,
    trends: emptyTrends(ndviValues),
    interpretation: {
      vegetationTrend: 'stable',
      moistureTrend: 'stable',
      soilSurfaceTrend: 'stable',
      summary: 'test',
      confidence: 'medium',
    },
  };
}

/** Winter low → spring/summer high → autumn drop (annual cycle). */
function annualCycleSeries(): TimeSeriesResponse {
  return buildSeries([
    { datetime: '2025-01-15T00:00:00Z', ndvi: 0.18, ndmi: -0.05, bsi: 0.22 },
    { datetime: '2025-02-10T00:00:00Z', ndvi: 0.2, ndmi: -0.02, bsi: 0.2 },
    { datetime: '2025-03-20T00:00:00Z', ndvi: 0.45, ndmi: 0.08, bsi: 0.1 },
    { datetime: '2025-04-15T00:00:00Z', ndvi: 0.55, ndmi: 0.12, bsi: 0.08 },
    { datetime: '2025-06-10T00:00:00Z', ndvi: 0.62, ndmi: 0.1, bsi: 0.05 },
    { datetime: '2025-07-20T00:00:00Z', ndvi: 0.5, ndmi: 0.05, bsi: 0.1 },
    { datetime: '2025-09-15T00:00:00Z', ndvi: 0.28, ndmi: 0.0, bsi: 0.18 },
    { datetime: '2025-10-20T00:00:00Z', ndvi: 0.22, ndmi: -0.02, bsi: 0.2 },
    { datetime: '2025-11-15T00:00:00Z', ndvi: 0.19, ndmi: -0.04, bsi: 0.21 },
    { datetime: '2025-12-10T00:00:00Z', ndvi: 0.17, ndmi: -0.05, bsi: 0.23 },
    { datetime: '2026-03-10T00:00:00Z', ndvi: 0.48, ndmi: 0.09, bsi: 0.09 },
    { datetime: '2026-06-05T00:00:00Z', ndvi: 0.58, ndmi: 0.11, bsi: 0.06 },
  ]);
}

/** Persistently vegetated with weak seasonal amplitude (perennial-like). */
function perennialSeries(): TimeSeriesResponse {
  return buildSeries([
    { datetime: '2025-01-15T00:00:00Z', ndvi: 0.52, ndmi: 0.1, bsi: 0.05 },
    { datetime: '2025-03-15T00:00:00Z', ndvi: 0.55, ndmi: 0.12, bsi: 0.04 },
    { datetime: '2025-05-15T00:00:00Z', ndvi: 0.58, ndmi: 0.14, bsi: 0.03 },
    { datetime: '2025-07-15T00:00:00Z', ndvi: 0.56, ndmi: 0.11, bsi: 0.04 },
    { datetime: '2025-09-15T00:00:00Z', ndvi: 0.54, ndmi: 0.1, bsi: 0.05 },
    { datetime: '2025-11-15T00:00:00Z', ndvi: 0.53, ndmi: 0.09, bsi: 0.05 },
    { datetime: '2026-01-15T00:00:00Z', ndvi: 0.51, ndmi: 0.08, bsi: 0.06 },
    { datetime: '2026-04-15T00:00:00Z', ndvi: 0.57, ndmi: 0.13, bsi: 0.04 },
    { datetime: '2026-06-15T00:00:00Z', ndvi: 0.55, ndmi: 0.12, bsi: 0.04 },
    { datetime: '2026-08-15T00:00:00Z', ndvi: 0.54, ndmi: 0.1, bsi: 0.05 },
  ]);
}

/** Persistently bare / dry / high BSI (rock-like informational signal). */
function bareRockLikeSeries(): TimeSeriesResponse {
  return buildSeries([
    { datetime: '2025-01-15T00:00:00Z', ndvi: 0.12, ndmi: -0.1, bsi: 0.28 },
    { datetime: '2025-02-15T00:00:00Z', ndvi: 0.1, ndmi: -0.12, bsi: 0.3 },
    { datetime: '2025-03-15T00:00:00Z', ndvi: 0.14, ndmi: -0.08, bsi: 0.27 },
    { datetime: '2025-04-15T00:00:00Z', ndvi: 0.13, ndmi: -0.09, bsi: 0.29 },
    { datetime: '2025-06-15T00:00:00Z', ndvi: 0.11, ndmi: -0.15, bsi: 0.32 },
    { datetime: '2025-07-15T00:00:00Z', ndvi: 0.09, ndmi: -0.18, bsi: 0.35 },
    { datetime: '2025-09-15T00:00:00Z', ndvi: 0.12, ndmi: -0.1, bsi: 0.28 },
    { datetime: '2025-10-15T00:00:00Z', ndvi: 0.1, ndmi: -0.11, bsi: 0.3 },
    { datetime: '2025-11-15T00:00:00Z', ndvi: 0.11, ndmi: -0.12, bsi: 0.31 },
    { datetime: '2025-12-15T00:00:00Z', ndvi: 0.1, ndmi: -0.1, bsi: 0.29 },
    { datetime: '2026-03-15T00:00:00Z', ndvi: 0.13, ndmi: -0.09, bsi: 0.27 },
    { datetime: '2026-06-15T00:00:00Z', ndvi: 0.1, ndmi: -0.14, bsi: 0.33 },
  ]);
}

function insufficientSeries(): TimeSeriesResponse {
  return buildSeries([
    { datetime: '2026-06-01T00:00:00Z', ndvi: 0.3, ndmi: 0.0, bsi: 0.15 },
    { datetime: '2026-06-20T00:00:00Z', ndvi: 0.32, ndmi: 0.02, bsi: 0.14 },
  ]);
}

async function postJson(
  port: number,
  path: string,
  body: unknown,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body: json };
}

describe('surface analysis services', () => {
  beforeEach(() => {
    ensureEnv();
    resetSharedCalibrationRepository();
  });

  it('detects likely annual agricultural cycle', () => {
    const result = new SurfaceAnalysisOrchestratorService().analyzeFromTimeSeries(
      annualCycleSeries(),
    );
    expect(result.agriculturalCycle.signal).toBe('likely_annual_cycle');
    expect(result.seasonalVegetation.seasonalAmplitudeNdvi).toBeGreaterThan(0.12);
    expect(result.dataQuality.seasonsWithObservations).toBe(4);
    expect(result.audit.modelVersion).toBe('1.3');
    expect(result.probableRockOrShallowSoil).not.toHaveProperty('rockPercent');
    expect(result.limitations.some((m) => m.includes('ürün skorlarını'))).toBe(true);
  });

  it('detects likely perennial vegetation signal', () => {
    const result = new SurfaceAnalysisOrchestratorService().analyzeFromTimeSeries(
      perennialSeries(),
    );
    expect(result.agriculturalCycle.signal).toBe('likely_perennial');
    expect(result.surfacePersistence.persistentVegetationSignal).not.toBe('low');
  });

  it('detects continuous bare + elevated probable rock informational score', () => {
    const result = new SurfaceAnalysisOrchestratorService().analyzeFromTimeSeries(
      bareRockLikeSeries(),
    );
    expect(result.agriculturalCycle.signal).toBe('likely_fallow_or_bare');
    expect(result.continuousBareSurface.signal).toBe('high');
    expect(result.probableRockOrShallowSoil.informationalScore).toBeGreaterThanOrEqual(40);
    expect(result.probableRockOrShallowSoil.disclaimer).toMatch(/kesin kaya yüzdesi/i);
  });

  it('marks insufficient data when acquisitions are too few', () => {
    const result = new SurfaceAnalysisOrchestratorService().analyzeFromTimeSeries(
      insufficientSeries(),
    );
    expect(result.agriculturalCycle.signal).toBe('insufficient_data');
    expect(result.dataQuality.confidence).toBe('low');
  });

  it('classifies winter-cereal phenology as annual cycle (not fallow)', () => {
    // Winter/spring high, summer/autumn bare — common in SE Turkey.
    const series = buildSeries([
      { datetime: '2025-01-15T00:00:00Z', ndvi: 0.42, ndmi: 0.05, bsi: 0.05 },
      { datetime: '2025-02-15T00:00:00Z', ndvi: 0.48, ndmi: 0.08, bsi: 0.04 },
      { datetime: '2025-03-15T00:00:00Z', ndvi: 0.55, ndmi: 0.1, bsi: 0.02 },
      { datetime: '2025-04-15T00:00:00Z', ndvi: 0.5, ndmi: 0.08, bsi: 0.03 },
      { datetime: '2025-06-15T00:00:00Z', ndvi: 0.15, ndmi: -0.1, bsi: 0.25 },
      { datetime: '2025-07-15T00:00:00Z', ndvi: 0.12, ndmi: -0.12, bsi: 0.28 },
      { datetime: '2025-09-15T00:00:00Z', ndvi: 0.14, ndmi: -0.1, bsi: 0.26 },
      { datetime: '2025-10-15T00:00:00Z', ndvi: 0.16, ndmi: -0.08, bsi: 0.24 },
      { datetime: '2025-11-15T00:00:00Z', ndvi: 0.18, ndmi: -0.05, bsi: 0.22 },
      { datetime: '2025-12-15T00:00:00Z', ndvi: 0.35, ndmi: 0.02, bsi: 0.1 },
      { datetime: '2026-03-15T00:00:00Z', ndvi: 0.52, ndmi: 0.09, bsi: 0.03 },
      { datetime: '2026-07-15T00:00:00Z', ndvi: 0.13, ndmi: -0.11, bsi: 0.27 },
    ]);
    const result = new SurfaceAnalysisOrchestratorService().analyzeFromTimeSeries(series);
    expect(result.agriculturalCycle.signal).toBe('likely_annual_cycle');
    expect(result.probableRockOrShallowSoil.informationalScore).toBeLessThan(65);
    expect(
      result.probableRockOrShallowSoil.counterEvidence?.some(
        (e) => e.code === 'STRONG_SEASONAL_AMPLITUDE',
      ),
    ).toBe(true);
  });

  it('accepts analysisMonths / maxCloudCoveragePercent aliases', () => {
    const parsed = surfaceAnalysisRequestSchema.parse({
      geometry: SAMPLE_GEOMETRY,
      analysisMonths: 24,
      maxCloudCoveragePercent: 30,
    });
    expect(parsed.months).toBe(24);
    expect(parsed.maxCloudCoverage).toBe(30);
  });

  it('reuses cached time series for consecutive analyze calls', async () => {
    let calls = 0;
    const orchestrator = new SurfaceAnalysisOrchestratorService(undefined, {
      computeTimeSeries: async () => {
        calls += 1;
        return annualCycleSeries();
      },
    });
    clearSurfaceTimeSeriesCache();
    const a = await orchestrator.analyze({
      geometry: SAMPLE_GEOMETRY,
      months: 12,
      maxCloudCoverage: 30,
    });
    const b = await orchestrator.analyze({
      geometry: SAMPLE_GEOMETRY,
      months: 12,
      maxCloudCoverage: 30,
    });
    expect(calls).toBe(1);
    expect(a.surfacePersistence).toEqual(b.surfacePersistence);
    expect(a.probableRockOrShallowSoil.informationalScore).toBe(
      b.probableRockOrShallowSoil.informationalScore,
    );
  });

  it('builds surface validation checks', () => {
    const analysis = new SurfaceAnalysisOrchestratorService().analyzeFromTimeSeries(
      annualCycleSeries(),
    );
    const checks = buildSurfaceValidationChecks(
      analysis,
      getSharedCalibrationRepository().get(),
    );
    const codes = checks.map((c) => c.code);
    expect(codes).toContain('SURFACE_TIME_SERIES_SUFFICIENT');
    expect(codes).toContain('SURFACE_SEASON_COVERAGE');
    expect(codes).toContain('SURFACE_CALIBRATION_UNVALIDATED');
    expect(codes).toContain('PROBABLE_ROCK_SIGNAL_INFORMATIVE');
  });

  it('loads calibration v1.3 surface section', () => {
    const profile = getSharedCalibrationRepository().get();
    expect(profile.version).toBe('2.0');
    expect(profile.surface?.thresholds.ndviBareMax).toBe(0.25);
    const resolved = resolveSurfaceCalibration(undefined);
    expect(resolved.probableRock.highScoreMin).toBe(65);
  });
});

describe('surface analysis HTTP', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    ensureEnv();
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('rejects geometry + parcelQuery together', async () => {
    const res = await postJson(port, '/api/satellite/surface-analysis', {
      geometry: SAMPLE_GEOMETRY,
      parcelQuery: {
        province: 'Gaziantep',
        district: 'Şehitkamil',
        neighborhood: 'Güngürge',
        block: '108',
        parcel: '7',
      },
    });
    expect(res.status).toBe(400);
  });

  it('accepts request schema defaults via zod path (mocked series)', async () => {
    const orchestrator = new SurfaceAnalysisOrchestratorService(undefined, {
      computeTimeSeries: async () => annualCycleSeries(),
    });
    const result = await orchestrator.analyze({
      geometry: SAMPLE_GEOMETRY,
      months: 12,
      maxCloudCoverage: 20,
    });
    expect(result.surfacePersistence).toBeDefined();
    expect(result.sourceTimeSeries.successfulAcquisitionCount).toBeGreaterThan(0);
  });
});

describe('validation report surface integration', () => {
  beforeEach(ensureEnv);

  it('adds optional surfaceChecks without breaking existing fields', () => {
    const knowledge = new CropKnowledgeService(new JsonCropRepository());
    const analysis = new SurfaceAnalysisOrchestratorService().analyzeFromTimeSeries(
      annualCycleSeries(),
    );
    const report = new RecommendationValidationReportService(knowledge).build(
      {
        parcel: null,
        geometryType: 'Polygon',
        climate: {
          metadata: { isMock: true, provider: 'mock' },
          confidence: 'medium',
        } as never,
        soil: {
          metadata: { isMock: true, provider: 'mock' },
          provider: 'mock',
          soil: { electricalConductivityDsM: null, drainage: 'unknown' },
        } as never,
        analysis: {
          interpretation: { confidence: 'medium' },
        } as never,
        timeSeries: annualCycleSeries(),
      },
      null,
      analysis,
    );
    expect(report.surfaceChecks?.length).toBeGreaterThan(0);
    expect(report.dataReadiness.surface).toBeDefined();
    expect(report.dataReadiness.parcel).toBeDefined();
    expect(report.disclaimer).toBeTruthy();
  });
});

describe('regression: surface does not alter crop scores', () => {
  beforeEach(ensureEnv);

  it('evaluate scores remain deterministic with stubbed sentinel inputs', async () => {
    const parcelQueryService = new ParcelQueryService(new MockParcelProvider());
    const climate = new ClimateProfileService(new MockClimateProvider(), parcelQueryService);
    const soil = new SoilProfileService(new MockSoilProvider(), parcelQueryService);
    const knowledge = new CropKnowledgeService(new JsonCropRepository());
    const analysis = {
      computeBestAnalysisSummary: async () =>
        ({
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
            ndvi: { mean: 0.25, validPixelCount: 80, totalPixelCount: 100 },
            ndmi: { mean: 0.05, validPixelCount: 80, totalPixelCount: 100 },
            bsi: { mean: 0.18, validPixelCount: 80, totalPixelCount: 100 },
          },
          interpretation: { confidence: 'medium' },
        }) as never,
    };
    const series = {
      computeTimeSeries: async () => annualCycleSeries(),
    };

    const service = new CropRecommendationService(
      parcelQueryService,
      climate,
      soil,
      knowledge,
      new CropSuitabilityService(),
      undefined,
      undefined,
      analysis,
      series,
    );

    const options = {
      timeSeriesMonths: 6,
      topN: 5,
      climateYears: 10,
      analysisDays: 30,
      maxCloudCoverage: 20,
      irrigationScenario: 'rainfed' as const,
      plantingScenario: 'automatic' as const,
    };

    const a = await service.evaluate({ geometry: SAMPLE_GEOMETRY, options });
    const b = await service.evaluate({ geometry: SAMPLE_GEOMETRY, options });
    expect(JSON.stringify(a.recommendations.map((r) => [r.crop.id, r.score.final]))).toBe(
      JSON.stringify(b.recommendations.map((r) => [r.crop.id, r.score.final])),
    );
    expect(a.recommendations[0]).toBeDefined();
  });
});
