import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { ParcelQueryService } from '../src/modules/parcel/services/parcel-query.service.js';
import { MockParcelProvider } from '../src/modules/parcel/providers/mock-parcel.provider.js';
import { MockTerrainProvider } from '../src/modules/terrain/providers/mock-terrain.provider.js';
import { FallbackTerrainProvider } from '../src/modules/terrain/providers/fallback-terrain.provider.js';
import { TerrainProfileService } from '../src/modules/terrain/services/terrain-profile.service.js';
import { ElevationAnalysisService } from '../src/modules/terrain/services/elevation-analysis.service.js';
import {
  SlopeAnalysisService,
  classifySlopePercent,
} from '../src/modules/terrain/services/slope-analysis.service.js';
import {
  AspectAnalysisService,
  aspectFromDegrees,
} from '../src/modules/terrain/services/aspect-analysis.service.js';
import {
  classifyRuggedness,
} from '../src/modules/terrain/services/ruggedness-analysis.service.js';
import { MechanizationAssessmentService } from '../src/modules/terrain/services/mechanization-assessment.service.js';
import { TerrainConfidenceService } from '../src/modules/terrain/services/terrain-confidence.service.js';
import { buildTerrainValidationChecks } from '../src/modules/terrain/services/terrain-validation.service.js';
import {
  DEFAULT_TERRAIN_CALIBRATION,
  resolveTerrainCalibration,
} from '../src/modules/terrain/config/terrain-calibration.js';
import {
  median,
  percentile,
  filterValid,
} from '../src/modules/terrain/utils/terrain-stats.utils.js';
import type { DemSampleGrid } from '../src/modules/terrain/types/terrain.types.js';
import { normalizeGeoJsonGeometry } from '../src/utils/geometry.utils.js';
import {
  getSharedCalibrationRepository,
  resetSharedCalibrationRepository,
} from '../src/modules/crop-recommendation/calibration/calibration-profile.repository.js';
import { ApiError } from '../src/utils/api-error.js';
import type { TerrainProvider } from '../src/modules/terrain/providers/terrain-provider.interface.js';
import { resetEnvCache } from '../src/config/env.js';
import { CropRecommendationService } from '../src/modules/crop-recommendation/services/crop-recommendation.service.js';
import { CropKnowledgeService } from '../src/modules/crop-recommendation/services/crop-knowledge.service.js';
import { JsonCropRepository } from '../src/modules/crop-recommendation/repositories/json-crop.repository.js';
import { ClimateProfileService } from '../src/modules/environment/climate/services/climate-profile.service.js';
import { MockClimateProvider } from '../src/modules/environment/climate/providers/mock-climate.provider.js';
import { SoilProfileService } from '../src/modules/environment/soil/services/soil-profile.service.js';
import { MockSoilProvider } from '../src/modules/environment/soil/providers/mock-soil.provider.js';
import { CropSuitabilityService } from '../src/modules/crop-recommendation/services/crop-suitability.service.js';

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

const PARCEL_QUERY = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

function ensureEnv(): void {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET = process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.TERRAIN_PROVIDER = 'mock';
  process.env.CLIMATE_PROVIDER = 'mock';
  process.env.SOIL_PROVIDER = 'mock';
  process.env.PARCEL_PROVIDER = 'mock';
  resetEnvCache();
}

function makeGrid(elevations: Array<number | null>, width = 5, height = 5): DemSampleGrid {
  return {
    width,
    height,
    west: 37.47,
    south: 37.2,
    cellSizeDegreesX: 0.0003,
    cellSizeDegreesY: 0.0003,
    resolutionMeters: 30,
    elevations,
    provider: 'mock',
    isMock: true,
    isEstimated: true,
    fallbackUsed: false,
    limitations: [],
    metadata: {
      source: 'test',
      generatedAt: new Date().toISOString(),
      isMock: true,
    },
  };
}

async function postJson(port: number, path: string, body: unknown) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: response.status, body: json as {
    terrain?: {
      elevation?: unknown;
      slope?: unknown;
      aspect?: unknown;
      ruggedness?: unknown;
      mechanization?: unknown;
    };
    metadata?: { provider?: string };
  } };
}

describe('terrain statistics utils', () => {
  it('computes median and p90', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(median(values)).toBe(5.5);
    expect(percentile(values, 90)).toBe(9.1);
  });

  it('filters NoData elevations', () => {
    expect(filterValid([1, null, Number.NaN, 3])).toEqual([1, 3]);
  });
});

describe('elevation analysis', () => {
  const service = new ElevationAnalysisService();

  it('computes elevation statistics and invariants', () => {
    const stats = service.analyze([800, 820, 840, 860, 880, null, Number.NaN]);
    expect(stats).not.toBeNull();
    expect(stats!.minimumMeters).toBeLessThanOrEqual(stats!.medianMeters);
    expect(stats!.medianMeters).toBeLessThanOrEqual(stats!.maximumMeters);
    expect(stats!.rangeMeters).toBeCloseTo(stats!.maximumMeters - stats!.minimumMeters, 1);
    expect(stats!.validSampleCount).toBe(5);
  });
});

describe('slope analysis', () => {
  const calibration = DEFAULT_TERRAIN_CALIBRATION;
  const service = new SlopeAnalysisService();

  it('classifies slope boundaries', () => {
    expect(classifySlopePercent(5, calibration)).toBe('flat');
    expect(classifySlopePercent(5.1, calibration)).toBe('gentle');
    expect(classifySlopePercent(12, calibration)).toBe('gentle');
    expect(classifySlopePercent(12.1, calibration)).toBe('moderate');
    expect(classifySlopePercent(20, calibration)).toBe('moderate');
    expect(classifySlopePercent(35, calibration)).toBe('steep');
    expect(classifySlopePercent(35.1, calibration)).toBe('very_steep');
  });

  it('produces non-negative slopes and distribution ~100', () => {
    const elevations: Array<number | null> = [];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        elevations.push(800 + row * 8 + col);
      }
    }
    const slope = service.analyze(makeGrid(elevations, 7, 7), calibration);
    expect(slope.meanPercent).toBeGreaterThanOrEqual(0);
    expect(slope.maximumPercent).toBeGreaterThanOrEqual(0);
    const sum =
      slope.distribution.zeroToFivePercent +
      slope.distribution.fiveToTwelvePercent +
      slope.distribution.twelveToTwentyPercent +
      slope.distribution.twentyToThirtyFivePercent +
      slope.distribution.aboveThirtyFivePercent;
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(1.5);
  });
});

describe('aspect analysis', () => {
  it('maps degrees to directions and handles flat', () => {
    expect(aspectFromDegrees(0)).toBe('north');
    expect(aspectFromDegrees(90)).toBe('east');
    expect(aspectFromDegrees(180)).toBe('south');
    expect(aspectFromDegrees(270)).toBe('west');
    const flatGrid = makeGrid(Array.from({ length: 25 }, () => 850), 5, 5);
    const aspect = new AspectAnalysisService().analyze(flatGrid);
    expect(aspect.flatPercent).toBeGreaterThan(50);
  });
});

describe('ruggedness + mechanization', () => {
  const calibration = DEFAULT_TERRAIN_CALIBRATION;

  it('classifies ruggedness thresholds', () => {
    expect(classifyRuggedness(2, calibration)).toBe('low');
    expect(classifyRuggedness(5, calibration)).toBe('medium');
    expect(classifyRuggedness(10, calibration)).toBe('high');
    expect(classifyRuggedness(20, calibration)).toBe('very_high');
  });

  it('marks suitable / limited / strongly_limited', () => {
    const mech = new MechanizationAssessmentService();
    const suitable = mech.assess({
      slope: {
        meanPercent: 3,
        medianPercent: 3,
        maximumPercent: 5,
        p90Percent: 4,
        standardDeviationPercent: 1,
        classification: 'flat',
        distribution: {
          zeroToFivePercent: 100,
          fiveToTwelvePercent: 0,
          twelveToTwentyPercent: 0,
          twentyToThirtyFivePercent: 0,
          aboveThirtyFivePercent: 0,
        },
      },
      ruggedness: {
        meanIndex: 1,
        medianIndex: 1,
        p90Index: 2,
        maximumIndex: 2,
        classification: 'low',
      },
      parcelAreaSquareMeters: 20000,
      spatialConfidence: 'medium',
      calibration,
    });
    expect(suitable.terrainSuitability).toBe('suitable');

    const strong = mech.assess({
      slope: {
        meanPercent: 40,
        medianPercent: 38,
        maximumPercent: 60,
        p90Percent: 55,
        standardDeviationPercent: 8,
        classification: 'very_steep',
        distribution: {
          zeroToFivePercent: 0,
          fiveToTwelvePercent: 0,
          twelveToTwentyPercent: 10,
          twentyToThirtyFivePercent: 20,
          aboveThirtyFivePercent: 70,
        },
      },
      ruggedness: {
        meanIndex: 20,
        medianIndex: 18,
        p90Index: 25,
        maximumIndex: 30,
        classification: 'very_high',
      },
      parcelAreaSquareMeters: 10000,
      spatialConfidence: 'medium',
      calibration,
    });
    expect(strong.terrainSuitability).toBe('strongly_limited');
  });
});

describe('terrain confidence', () => {
  const service = new TerrainConfidenceService();
  const calibration = DEFAULT_TERRAIN_CALIBRATION;

  it('resolves by pixel count and coverage; mock cannot be high', () => {
    expect(
      service.resolve({
        validPixelCount: 25,
        coverageRatio: 0.9,
        isMock: false,
        calibration,
      }),
    ).toBe('high');
    expect(
      service.resolve({
        validPixelCount: 25,
        coverageRatio: 0.9,
        isMock: true,
        calibration,
      }),
    ).toBe('medium');
    expect(
      service.resolve({
        validPixelCount: 2,
        coverageRatio: 0.1,
        isMock: false,
        calibration,
      }),
    ).toBe('insufficient');
  });
});

describe('mock terrain provider', () => {
  beforeEach(ensureEnv);

  it('is deterministic and marks mock metadata', async () => {
    const provider = new MockTerrainProvider({ profile: 'gentle' });
    const geometry = normalizeGeoJsonGeometry(SAMPLE_GEOMETRY);
    const input = {
      geometry,
      centroid: { longitude: 37.475, latitude: 37.207 },
      parcelAreaSquareMeters: 20000,
    };
    const a = await provider.getDemGrid(input);
    const b = await provider.getDemGrid(input);
    expect(a.elevations).toEqual(b.elevations);
    expect(a.isMock).toBe(true);
    expect(a.provider).toBe('mock');
  });

  it('supports flat, steep, sparse, low_coverage fixtures', async () => {
    const geometry = normalizeGeoJsonGeometry(SAMPLE_GEOMETRY);
    const base = {
      geometry,
      centroid: { longitude: 37.475, latitude: 37.207 },
      parcelAreaSquareMeters: 20000,
    };
    const flat = await new MockTerrainProvider({ profile: 'flat' }).getDemGrid(base);
    const steep = await new MockTerrainProvider({ profile: 'steep' }).getDemGrid(base);
    const sparse = await new MockTerrainProvider({ profile: 'sparse' }).getDemGrid(base);
    const low = await new MockTerrainProvider({ profile: 'low_coverage' }).getDemGrid(base);

    const flatValid = flat.elevations.filter((v) => v != null) as number[];
    const steepValid = steep.elevations.filter((v) => v != null) as number[];
    expect(Math.max(...steepValid) - Math.min(...steepValid)).toBeGreaterThan(
      Math.max(...flatValid) - Math.min(...flatValid),
    );
    expect(sparse.elevations.filter((v) => v != null).length).toBeLessThan(
      flat.elevations.filter((v) => v != null).length,
    );
    expect(low.elevations.filter((v) => v != null).length).toBeLessThan(
      flat.elevations.filter((v) => v != null).length,
    );
  });

  it('supports MultiPolygon', async () => {
    const multi = normalizeGeoJsonGeometry({
      type: 'MultiPolygon',
      coordinates: [
        SAMPLE_GEOMETRY.coordinates,
        [
          [
            [37.477, 37.206],
            [37.478, 37.206],
            [37.478, 37.207],
            [37.477, 37.207],
            [37.477, 37.206],
          ],
        ],
      ],
    });
    const grid = await new MockTerrainProvider({ profile: 'gentle' }).getDemGrid({
      geometry: multi,
      centroid: { longitude: 37.476, latitude: 37.2065 },
      parcelAreaSquareMeters: 25000,
    });
    expect(grid.elevations.some((v) => v != null)).toBe(true);
  });
});

describe('fallback terrain provider', () => {
  it('sets fallback metadata when primary fails', async () => {
    const failing: TerrainProvider = {
      name: 'copernicus-dem',
      getDemGrid: async () => {
        throw new ApiError(503, 'not configured', { providerStatus: 'not_configured' });
      },
    };
    const provider = new FallbackTerrainProvider(
      failing,
      new MockTerrainProvider({ profile: 'gentle' }),
    );
    const geometry = normalizeGeoJsonGeometry(SAMPLE_GEOMETRY);
    const grid = await provider.getDemGrid({
      geometry,
      centroid: { longitude: 37.475, latitude: 37.207 },
      parcelAreaSquareMeters: 20000,
    });
    expect(grid.provider).toBe('mock-fallback');
    expect(grid.fallbackUsed).toBe(true);
    expect(grid.isMock).toBe(true);
  });
});

describe('calibration terrain defaults', () => {
  it('loads v1.3 terrain and surface sections and falls back safely', () => {
    resetSharedCalibrationRepository();
    const profile = getSharedCalibrationRepository().get();
    expect(profile.version).toBe('2.0');
    expect(profile.terrain?.demResolutionMeters).toBe(30);
    expect(profile.surface?.defaultMonths).toBe(12);
    expect(profile.landUsability?.minimumRealEvidenceCount).toBe(1);
    const resolved = resolveTerrainCalibration(undefined);
    expect(resolved.slopeClassesPercent.flatMax).toBe(5);
  });
});

describe('terrain profile service + HTTP', () => {
  let service: TerrainProfileService;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    ensureEnv();
    service = new TerrainProfileService(
      new MockTerrainProvider({ profile: 'gentle' }),
      new ParcelQueryService(new MockParcelProvider()),
    );
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

  it('returns full terrain profile for parcelQuery', async () => {
    const profile = await service.getProfile({ parcelQuery: PARCEL_QUERY });
    expect(profile.terrain.elevation.validSampleCount).toBeGreaterThanOrEqual(3);
    expect(profile.metadata.isMock).toBe(true);
    expect(profile.metadata.coverageRatio).toBeGreaterThanOrEqual(0);
    expect(profile.metadata.coverageRatio).toBeLessThanOrEqual(1);
    expect(['low', 'medium', 'high', 'insufficient']).toContain(
      profile.metadata.spatialConfidence,
    );
    expect(profile.metadata.spatialConfidence).not.toBe('high');
    expect((profile.terrain as Record<string, unknown>).erosionRisk).toBeUndefined();
  });

  it('rejects invalid request combination via HTTP', async () => {
    const res = await postJson(port, '/api/terrain/profile', {
      geometry: SAMPLE_GEOMETRY,
      parcelQuery: PARCEL_QUERY,
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/terrain/profile succeeds', async () => {
    const res = await postJson(port, '/api/terrain/profile', {
      parcelQuery: PARCEL_QUERY,
    });
    expect(res.status).toBe(200);
    expect(res.body.terrain.elevation).toBeDefined();
    expect(res.body.terrain.slope).toBeDefined();
    expect(res.body.terrain.aspect).toBeDefined();
    expect(res.body.terrain.ruggedness).toBeDefined();
    expect(res.body.terrain.mechanization).toBeDefined();
    expect(res.body.metadata.provider).toBeDefined();
  });

  it('handles very small parcel geometry', async () => {
    const tiny = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [37.475, 37.206],
          [37.4752, 37.206],
          [37.4752, 37.2062],
          [37.475, 37.2062],
          [37.475, 37.206],
        ],
      ],
    };
    const profile = await service.getProfile({ geometry: tiny });
    expect(profile.metadata.validPixelCount).toBeGreaterThanOrEqual(1);
    expect(profile.metadata.parcelAreaSquareMeters).toBeLessThan(1000);
  });
});

describe('terrain validation checks', () => {
  beforeEach(ensureEnv);

  it('builds expected check codes', async () => {
    const service = new TerrainProfileService(
      new MockTerrainProvider({ profile: 'gentle' }),
      new ParcelQueryService(new MockParcelProvider()),
    );
    const profile = await service.getProfile({ geometry: SAMPLE_GEOMETRY });
    const checks = buildTerrainValidationChecks(
      profile,
      getSharedCalibrationRepository().get(),
    );
    const codes = checks.map((c) => c.code);
    expect(codes).toContain('TERRAIN_PROVIDER_AVAILABLE');
    expect(codes).toContain('DEM_COVERAGE_SUFFICIENT');
    expect(codes).toContain('DEM_SAMPLE_COUNT_SUFFICIENT');
    expect(codes).toContain('ELEVATION_VALUES_VALID');
    expect(codes).toContain('SLOPE_DISTRIBUTION_VALID');
    expect(codes).toContain('TERRAIN_CALIBRATION_UNVALIDATED');
    expect(codes).toContain('MECHANIZATION_ACCESS_UNKNOWN');
  });
});

describe('regression: terrain does not alter crop scores', () => {
  beforeEach(ensureEnv);

  it('evaluate scores are independent of terrain profile service', async () => {
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
      computeTimeSeries: async () =>
        ({
          summary: { successfulAcquisitionCount: 3, requestedMonths: 6 },
          trends: {
            ndvi: { direction: 'stable' },
            ndmi: { direction: 'stable' },
            bsi: { direction: 'stable' },
          },
          series: [],
        }) as never,
    };

    const withoutTerrain = new CropRecommendationService(
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
    const withTerrain = new CropRecommendationService(
      parcelQueryService,
      climate,
      soil,
      knowledge,
      new CropSuitabilityService(),
      undefined,
      undefined,
      analysis,
      series,
      undefined,
      undefined,
      undefined,
      undefined,
      new TerrainProfileService(
        new MockTerrainProvider({ profile: 'steep' }),
        parcelQueryService,
      ),
    );

    const options = {
      timeSeriesMonths: 6,
      topN: 5,
      climateYears: 10,
      analysisDays: 30,
      maxCloudCoverage: 20,
    };
    const a = await withoutTerrain.evaluate({ geometry: SAMPLE_GEOMETRY, options });
    const b = await withTerrain.evaluate({ geometry: SAMPLE_GEOMETRY, options });
    expect(a.recommendations.map((r) => [r.crop.id, r.score.final])).toEqual(
      b.recommendations.map((r) => [r.crop.id, r.score.final]),
    );
  });
});

describe('terrain v1.6 additive coverage + derivatives', () => {
  beforeEach(ensureEnv);

  it('treats NoData as null and never as zero elevation', () => {
    const elev = new ElevationAnalysisService().analyze([100, null, Number.NaN, 110, undefined]);
    expect(elev?.validSampleCount).toBe(2);
    expect(elev?.minimumMeters).toBe(100);
    expect(elev?.meanMeters).not.toBe(0);
  });

  it('Horn slope is ~0 on flat grid and positive on known gradient', () => {
    const flat = makeGrid(Array(25).fill(800));
    const slopeSvc = new SlopeAnalysisService();
    const flatStats = slopeSvc.analyze(flat, DEFAULT_TERRAIN_CALIBRATION);
    expect(flatStats.meanPercent).toBeLessThan(0.5);

    const gradient: Array<number | null> = [];
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        gradient.push(800 + c * 10);
      }
    }
    const gradStats = slopeSvc.analyze(makeGrid(gradient), DEFAULT_TERRAIN_CALIBRATION);
    expect(gradStats.meanPercent).toBeGreaterThan(5);
    expect(gradStats.unit).toBe('percent');
    expect(gradStats.meanDegrees).toBeDefined();
  });

  it('aspect directions and circular mean near 0 for 359/1', () => {
    expect(aspectFromDegrees(0)).toBe('north');
    expect(aspectFromDegrees(90)).toBe('east');
    expect(aspectFromDegrees(180)).toBe('south');
    expect(aspectFromDegrees(270)).toBe('west');

    const sin = Math.sin((359 * Math.PI) / 180) + Math.sin((1 * Math.PI) / 180);
    const cos = Math.cos((359 * Math.PI) / 180) + Math.cos((1 * Math.PI) / 180);
    let deg = (Math.atan2(sin / 2, cos / 2) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    const nearNorth = deg < 5 || deg > 355;
    expect(nearNorth).toBe(true);
    expect(Math.abs(deg - 180)).toBeGreaterThan(90);
  });

  it('builds coverage ratio in 0–1 and variability classification', async () => {
    const service = new TerrainProfileService(
      new MockTerrainProvider({ profile: 'gentle' }),
      new ParcelQueryService(new MockParcelProvider()),
    );
    const profile = await service.getProfile({ geometry: SAMPLE_GEOMETRY });
    expect(profile.terrain.coverage).toBeDefined();
    expect(profile.terrain.coverage!.validPixelRatio).toBeGreaterThanOrEqual(0);
    expect(profile.terrain.coverage!.validPixelRatio).toBeLessThanOrEqual(1);
    expect(profile.terrain.terrainVariability).toBeDefined();
    expect(profile.terrain.terrainMechanizationSuitability).toBeDefined();
    expect(profile.terrain.provider?.isMock).toBe(true);
    expect(profile.metadata.usedInDecision).toBe(false);
    expect(profile.metadata.cacheHit).toBe(false);

    const again = await service.getProfile({ geometry: SAMPLE_GEOMETRY });
    expect(again.metadata.cacheHit).toBe(true);
  });

  it('mock fallback metadata excludes decision use', async () => {
    const failing: TerrainProvider = {
      name: 'copernicus-dem',
      async getDemGrid() {
        throw new ApiError(503, 'not configured');
      },
    };
    const service = new TerrainProfileService(
      new FallbackTerrainProvider(failing, new MockTerrainProvider({ profile: 'gentle' })),
      new ParcelQueryService(new MockParcelProvider()),
    );
    const profile = await service.getProfile({ geometry: SAMPLE_GEOMETRY });
    expect(profile.metadata.isMock).toBe(true);
    expect(profile.metadata.fallbackUsed).toBe(true);
    expect(profile.metadata.usedInDecision).toBe(false);
    const codes = buildTerrainValidationChecks(profile).map((c) => c.code);
    expect(codes).toContain('MOCK_TERRAIN_EXCLUDED_FROM_DECISION');
    expect(codes).toContain('TERRAIN_PROVIDER_REAL');
  });

  it('classifies very_low ruggedness when below veryLowMax', () => {
    expect(classifyRuggedness(1, DEFAULT_TERRAIN_CALIBRATION)).toBe('very_low');
  });
});
