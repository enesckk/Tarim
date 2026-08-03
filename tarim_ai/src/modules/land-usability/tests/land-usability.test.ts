import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../../app.js';
import { resetEnvCache } from '../../../config/env.js';
import { resetSharedCalibrationRepository } from '../../crop-recommendation/calibration/calibration-profile.repository.js';
import { getSharedCalibrationRepository } from '../../crop-recommendation/calibration/calibration-profile.repository.js';
import { resolveLandUsabilityCalibration } from '../constants/land-usability-calibration.js';
import { normalizeSurfaceEvidence, rockClassMeetsMinimum } from '../services/surface-evidence-adapter.service.js';
import { resolveRootableSoilDepth } from '../services/rootable-soil-depth.service.js';
import { EvidenceResolutionService } from '../services/evidence-resolution.service.js';
import { PhysicalSuitabilityService } from '../services/physical-suitability.service.js';
import { FieldVerificationRequirementsService } from '../services/field-verification-requirements.service.js';
import type { NormalizedSurfaceEvidence } from '../types/land-usability.types.js';
import type { SurfaceAnalysisResponse } from '../../satellite/surface-analysis/surface-analysis.types.js';
import type { TerrainProfileResponse } from '../../terrain/types/terrain.types.js';
import type { SoilProfile } from '../../environment/soil/types/soil.types.js';
import { ApiError } from '../../../utils/api-error.js';

function ensureEnv(): void {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET =
    process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.LAND_USABILITY_ENABLED = 'true';
  resetEnvCache();
}

function surfaceLike(partial: Partial<NormalizedSurfaceEvidence>): NormalizedSurfaceEvidence {
  return {
    providerReal: true,
    usableObservationCount: 95,
    seasonsRepresented: 4,
    dataConfidence: 'high',
    persistentOpenSurfaceRatio: null,
    lowNdviShare: 0.547,
    highBsiShare: 0.505,
    vegetatedShare: 0.253,
    seasonalAmplitude: 0.2715,
    agriculturalCycleClassification: 'likely_annual_cycle',
    agriculturalCycleDetected: true,
    probableRockScore: 5,
    probableRockClassification: 'low',
    availableSignals: ['lowNdviShare'],
    missingCanonicalFields: ['persistentOpenSurfaceRatio'],
    ...partial,
  };
}

function mockTerrain(): TerrainProfileResponse {
  return {
    terrain: {
      elevation: { meanMeters: 800, minMeters: 790, maxMeters: 810, validSampleCount: 10 },
      slope: {
        meanPercent: 5,
        p90Percent: 8,
        classDistribution: {},
      },
      aspect: { dominant: 'south' },
      ruggedness: { classification: 'low', triMean: 1 },
      mechanization: { terrainSuitability: 'suitable', notes: [] },
    },
    metadata: {
      provider: 'mock',
      isMock: true,
      fallbackUsed: false,
      spatialConfidence: 'medium',
      isEstimated: true,
    },
  } as unknown as TerrainProfileResponse;
}

function realSteepTerrain(): TerrainProfileResponse {
  const t = mockTerrain();
  return {
    ...t,
    terrain: {
      ...t.terrain,
      slope: { meanPercent: 40, p90Percent: 50, classDistribution: {} },
      mechanization: { terrainSuitability: 'strongly_limited', notes: [] },
    },
    metadata: {
      ...t.metadata,
      provider: 'copernicus-dem',
      isMock: false,
      fallbackUsed: false,
      spatialConfidence: 'high',
    },
  } as unknown as TerrainProfileResponse;
}

function soilgridsSoil(): SoilProfile {
  return {
    provider: 'soilgrids',
    confidence: 'medium',
    soil: {
      ph: 7.5,
      sandPercent: 40,
      siltPercent: 30,
      clayPercent: 30,
      organicMatterPercent: 1.2,
      depthCm: null,
      electricalConductivityDsM: null,
      drainage: 'unknown',
      textureClass: 'loam',
    },
    metadata: {
      isMock: false,
      isEstimated: true,
      provider: 'soilgrids',
      sampledDepthCm: 60,
    },
  } as unknown as SoilProfile;
}

describe('land usability core', () => {
  beforeEach(() => {
    ensureEnv();
    resetSharedCalibrationRepository();
  });

  it('loads calibration v1.4 landUsability block with fallback', () => {
    const profile = getSharedCalibrationRepository().get();
    expect(profile.version).toBe('2.0');
    expect(profile.landUsability?.fieldDepth.maximumValidCm).toBe(500);
    const resolved = resolveLandUsabilityCalibration(undefined);
    expect(resolved.hardConstraints.veryShallowMeanDepthCm).toBe(20);
  });

  it('keeps persistentOpenSurfaceRatio null and does not alias lowNdviShare', () => {
    const analysis = {
      dataQuality: {
        successfulAcquisitionCount: 10,
        seasonsWithObservations: 4,
        confidence: 'high',
      },
      surfacePersistence: {
        lowNdviShare: 0.5,
        highBsiShare: 0.4,
        vegetatedShare: 0.3,
      },
      seasonalVegetation: { seasonalAmplitudeNdvi: 0.2 },
      agriculturalCycle: { signal: 'likely_annual_cycle' },
      probableRockOrShallowSoil: { informationalScore: 5, riskLevel: 'low' },
    } as unknown as SurfaceAnalysisResponse;
    const normalized = normalizeSurfaceEvidence(analysis)!;
    expect(normalized.persistentOpenSurfaceRatio).toBeNull();
    expect(normalized.lowNdviShare).toBe(0.5);
    expect(normalized.missingCanonicalFields).toContain('persistentOpenSurfaceRatio');
    expect(normalized.lowNdviShare).not.toBe(normalized.persistentOpenSurfaceRatio);
  });

  it('rejects invalid field depth measurements', () => {
    const cal = resolveLandUsabilityCalibration(undefined);
    expect(() =>
      resolveRootableSoilDepth(
        { rootableSoilDepthMeasurementsCm: [25, -1, 30] },
        cal,
      ),
    ).toThrow(ApiError);
    expect(() =>
      resolveRootableSoilDepth(
        { rootableSoilDepthMeasurementsCm: [Number.NaN] },
        cal,
      ),
    ).toThrow(ApiError);
  });

  it('computes field depth stats and confidence', () => {
    const cal = resolveLandUsabilityCalibration(undefined);
    const depth = resolveRootableSoilDepth(
      { rootableSoilDepthMeasurementsCm: [25, 32, 28, 40, 35] },
      cal,
    );
    expect(depth.status).toBe('field_measured');
    expect(depth.measurementCount).toBe(5);
    expect(depth.meanCm).toBeGreaterThan(20);
    expect(depth.confidence).toBe('medium');
    expect(depth.requiresFieldVerification).toBe(false);
  });

  it('unknown depth is not converted to numeric zero', () => {
    const depth = resolveRootableSoilDepth(undefined, resolveLandUsabilityCalibration());
    expect(depth.status).toBe('unknown');
    expect(depth.meanCm).toBeNull();
    expect(depth.measurementCount).toBe(0);
  });

  it('ignores mock terrain for decisions and records ignoredEvidence', () => {
    const cal = resolveLandUsabilityCalibration();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: mockTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    expect(bundle.terrainReal).toBe(false);
    expect(bundle.ignoredEvidence.some((e) => e.code === 'MOCK_TERRAIN_NOT_USED')).toBe(
      true,
    );
    expect(bundle.hardConstraints).toHaveLength(0);
  });

  it('treats SoilGrids as modeled and not verified depth', () => {
    const cal = resolveLandUsabilityCalibration();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: mockTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    expect(bundle.soilRealModeled).toBe(true);
    expect(bundle.modeledSoilDepth?.usableAsVerifiedRootableDepth).toBe(false);
    expect(bundle.rootableSoilDepth.status).toBe('unknown');
  });

  it('Güngürge-like path yields recommendation_with_caution', () => {
    const cal = resolveLandUsabilityCalibration();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: mockTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    const outcome = new PhysicalSuitabilityService().decide(bundle, cal);
    expect(outcome.decision.status).toBe('recommendation_with_caution');
    expect(outcome.decision.physicalSuitability.classification).toBe(
      'generally_favorable',
    );
    expect(outcome.decision.recommendationsArePreliminary).toBe(true);
    expect(outcome.decision.confidence).toBe('medium');
    expect(outcome.matchedRule.code).toBe(
      'CAUTION_REAL_SURFACE_LOW_ROCK_UNKNOWN_DEPTH',
    );
  });

  it('high probable rock alone cannot create strong constraints', () => {
    const cal = resolveLandUsabilityCalibration();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({
        probableRockScore: 100,
        probableRockClassification: 'high',
        agriculturalCycleDetected: false,
        agriculturalCycleClassification: 'likely_fallow_or_bare',
      }),
      terrain: mockTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    const outcome = new PhysicalSuitabilityService().decide(bundle, cal);
    expect(outcome.decision.status).not.toBe('strong_physical_constraints');
    expect(outcome.decision.status).toBe('field_verification_required');
  });

  it('verified shallow depth creates hard constraint / strong status', () => {
    const cal = resolveLandUsabilityCalibration();
    const depth = resolveRootableSoilDepth(
      { rootableSoilDepthMeasurementsCm: [8, 10, 12, 9, 11] },
      cal,
    );
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: mockTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: depth,
      fieldEvidence: { rootableSoilDepthMeasurementsCm: [8, 10, 12, 9, 11] },
      calibration: cal,
    });
    expect(bundle.hardConstraints.some((c) => c.code === 'VERIFIED_VERY_SHALLOW_ROOTABLE_DEPTH')).toBe(
      true,
    );
    const outcome = new PhysicalSuitabilityService().decide(bundle, cal);
    expect(outcome.decision.status).toBe('strong_physical_constraints');
  });

  it('real steep terrain can create limitation / hard constraint', () => {
    const cal = resolveLandUsabilityCalibration();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: realSteepTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    expect(bundle.terrainReal).toBe(true);
    expect(
      bundle.hardConstraints.some(
        (c) => c.code === 'REAL_TERRAIN_STRONG_SLOPE_OR_MECHANIZATION',
      ),
    ).toBe(true);
  });

  it('supporting and limiting evidence cannot share codes', () => {
    const cal = resolveLandUsabilityCalibration();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: realSteepTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    const support = new Set(bundle.supportingEvidence.map((e) => e.code));
    for (const lim of bundle.limitingFactors) {
      expect(support.has(lim.code)).toBe(false);
    }
  });

  it('high confidence cannot occur without real terrain and verified depth', () => {
    const cal = resolveLandUsabilityCalibration();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: mockTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    const outcome = new PhysicalSuitabilityService().decide(bundle, cal);
    expect(outcome.decision.confidence).not.toBe('high');
  });

  it('suitable_for_preliminary_recommendation cannot occur with critical unknowns', () => {
    const cal = resolveLandUsabilityCalibration();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: mockTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    const outcome = new PhysicalSuitabilityService().decide(bundle, cal);
    expect(outcome.decision.status).not.toBe('suitable_for_preliminary_recommendation');
  });

  it('requires rootable depth field check when unknown', () => {
    const cal = resolveLandUsabilityCalibration();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: mockTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    const checks = new FieldVerificationRequirementsService().build(bundle, cal);
    expect(checks.some((c) => c.code === 'ROOTABLE_SOIL_DEPTH_MEASUREMENT' && c.required)).toBe(
      true,
    );
  });

  it('rockClassMeetsMinimum maps medium_high threshold to high', () => {
    expect(rockClassMeetsMinimum('high', 'medium_high')).toBe(true);
    expect(rockClassMeetsMinimum('medium', 'medium_high')).toBe(false);
    expect(rockClassMeetsMinimum('low', 'medium')).toBe(false);
  });

  it('bedrock extensive field evidence creates hard constraint', () => {
    const cal = resolveLandUsabilityCalibration();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: mockTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      fieldEvidence: { bedrockOutcrop: 'extensive' },
      calibration: cal,
    });
    expect(bundle.hardConstraints.some((c) => c.code === 'HIGH_VERIFIED_ROCK_OUTCROP')).toBe(
      true,
    );
  });
});

describe('land usability HTTP', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    ensureEnv();
    process.env.LAND_USABILITY_ENABLED = 'true';
    process.env.TERRAIN_PROVIDER = 'mock';
    process.env.SOIL_PROVIDER = 'mock';
    process.env.PARCEL_PROVIDER = 'mock';
    resetEnvCache();
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

  it('POST /api/land-usability/analyze rejects geometry+parcelQuery', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/land-usability/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [37.474, 37.206],
              [37.476, 37.206],
              [37.476, 37.208],
              [37.474, 37.208],
              [37.474, 37.206],
            ],
          ],
        },
        parcelQuery: {
          province: 'Gaziantep',
          district: 'Şehitkamil',
          neighborhood: 'Güngürge',
          block: '108',
          parcel: '7',
        },
      }),
    });
    expect(res.status).toBe(400);
  });

  it('returns LAND_USABILITY_DISABLED when feature flag is off', async () => {
    process.env.LAND_USABILITY_ENABLED = 'false';
    resetEnvCache();
    // recreate server with flag off
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;

    const res = await fetch(`http://127.0.0.1:${port}/api/land-usability/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parcelQuery: {
          province: 'Gaziantep',
          district: 'Şehitkamil',
          neighborhood: 'Güngürge',
          block: '108',
          parcel: '7',
        },
        includeSurfaceAnalysis: false,
      }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('LAND_USABILITY_DISABLED');
  });
});

function realGentleTerrain(): TerrainProfileResponse {
  const t = mockTerrain();
  return {
    ...t,
    terrain: {
      ...t.terrain,
      elevation: {
        minimumMeters: 840,
        maximumMeters: 860,
        meanMeters: 850,
        medianMeters: 850,
        rangeMeters: 20,
        standardDeviationMeters: 4,
        validSampleCount: 40,
      },
      slope: {
        meanPercent: 8,
        medianPercent: 7,
        maximumPercent: 18,
        p90Percent: 12,
        standardDeviationPercent: 3,
        classification: 'gentle',
        distribution: {
          zeroToFivePercent: 40,
          fiveToTwelvePercent: 50,
          twelveToTwentyPercent: 10,
          twentyToThirtyFivePercent: 0,
          aboveThirtyFivePercent: 0,
        },
      },
      ruggedness: {
        meanIndex: 2,
        medianIndex: 2,
        p90Index: 3,
        maximumIndex: 4,
        classification: 'low',
        method: 'terrain_ruggedness_index',
      },
      mechanization: {
        terrainSuitability: 'partially_suitable',
        confidence: 'medium',
        limitingFactors: [],
        limitations: [],
      },
      coverage: {
        parcelAreaSquareMeters: 22000,
        rasterCoveredAreaSquareMeters: 21000,
        validAreaSquareMeters: 20000,
        validPixelRatio: 0.95,
        insideParcelPixelCount: 40,
        validPixelCount: 38,
        noDataPixelCount: 2,
        rasterWidth: 8,
        rasterHeight: 8,
        coverageStatus: 'complete',
      },
    },
    metadata: {
      provider: 'copernicus-dem',
      providerMode: 'copernicus-dem',
      resolutionMeters: 30,
      parcelAreaSquareMeters: 22000,
      validPixelCount: 38,
      coverageRatio: 0.95,
      spatialConfidence: 'medium',
      isEstimated: false,
      isMock: false,
      fallbackUsed: false,
      generatedAt: new Date().toISOString(),
      dataset: 'COPERNICUS_30',
      usedInDecision: true,
    },
  } as TerrainProfileResponse;
}

describe('land usability real terrain rules v1.6', () => {
  beforeEach(() => {
    ensureEnv();
    resetSharedCalibrationRepository();
  });

  it('uses verified-field-no-real-terrain rule when depth verified and terrain mock', () => {
    const cal = resolveLandUsabilityCalibration();
    const depth = resolveRootableSoilDepth(
      { rootableSoilDepthMeasurementsCm: [30, 32, 35, 34, 36] },
      cal,
    );
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: mockTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: depth,
      fieldEvidence: {
        rootableSoilDepthMeasurementsCm: [30, 32, 35, 34, 36],
        surfaceStoniness: 'medium',
        bedrockOutcrop: 'not_observed',
        machineAccess: 'verified',
      },
      calibration: cal,
    });
    const outcome = new PhysicalSuitabilityService().decide(bundle, cal);
    expect(outcome.matchedRule.code).toBe(
      'CAUTION_REAL_SURFACE_LOW_ROCK_VERIFIED_FIELD_EVIDENCE_NO_REAL_TERRAIN',
    );
    expect(bundle.ignoredEvidence.some((e) => e.code === 'MOCK_TERRAIN_NOT_USED')).toBe(true);
  });

  it('uses verified-field-and-real-terrain rule when real DEM present', () => {
    const cal = resolveLandUsabilityCalibration();
    const depth = resolveRootableSoilDepth(
      { rootableSoilDepthMeasurementsCm: [30, 32, 35, 34, 36] },
      cal,
    );
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: realGentleTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: depth,
      fieldEvidence: {
        rootableSoilDepthMeasurementsCm: [30, 32, 35, 34, 36],
        surfaceStoniness: 'medium',
        bedrockOutcrop: 'not_observed',
        machineAccess: 'verified',
      },
      calibration: cal,
    });
    expect(bundle.terrainReal).toBe(true);
    expect(
      bundle.supportingEvidence.some((e) => e.code === 'REAL_TERRAIN_PROFILE_AVAILABLE'),
    ).toBe(true);
    expect(
      bundle.unknownFactors.some((e) => e.code === 'REAL_TERRAIN_PROFILE_UNAVAILABLE'),
    ).toBe(false);
    expect(bundle.ignoredEvidence.some((e) => e.code === 'MOCK_TERRAIN_NOT_USED')).toBe(false);
    const outcome = new PhysicalSuitabilityService().decide(bundle, cal);
    expect(outcome.matchedRule.code).toBe(
      'CAUTION_REAL_SURFACE_LOW_ROCK_VERIFIED_FIELD_AND_REAL_TERRAIN',
    );
    expect(outcome.decision.recommendationsArePreliminary).toBe(true);
    expect(outcome.decision.confidence).not.toBe('high');
  });

  it('records contradiction without overriding field machine access', () => {
    const cal = resolveLandUsabilityCalibration();
    const depth = resolveRootableSoilDepth(
      { rootableSoilDepthMeasurementsCm: [30, 32, 35, 34, 36] },
      cal,
    );
    const steep = realSteepTerrain();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: steep,
      soil: soilgridsSoil(),
      rootableSoilDepth: depth,
      fieldEvidence: {
        rootableSoilDepthMeasurementsCm: [30, 32, 35, 34, 36],
        machineAccess: 'verified',
        surfaceStoniness: 'medium',
        bedrockOutcrop: 'not_observed',
      },
      calibration: cal,
    });
    expect(
      bundle.unknownFactors.some(
        (e) => e.code === 'TERRAIN_FIELD_MECHANIZATION_CONTRADICTION',
      ),
    ).toBe(true);
    expect(
      bundle.supportingEvidence.some((e) => e.code === 'FIELD_VERIFIED_MACHINE_ACCESS'),
    ).toBe(true);
  });

  it('mock terrain cannot create limiting factors or raise confidence', () => {
    const cal = resolveLandUsabilityCalibration();
    const mock = mockTerrain();
    mock.terrain.slope = {
      meanPercent: 50,
      medianPercent: 48,
      maximumPercent: 70,
      p90Percent: 60,
      standardDeviationPercent: 10,
      classification: 'very_steep',
      distribution: {
        zeroToFivePercent: 0,
        fiveToTwelvePercent: 0,
        twelveToTwentyPercent: 0,
        twentyToThirtyFivePercent: 20,
        aboveThirtyFivePercent: 80,
      },
    };
    mock.terrain.mechanization = {
      terrainSuitability: 'strongly_limited',
      confidence: 'medium',
      limitingFactors: [],
      limitations: [],
    };
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: mock,
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    expect(bundle.terrainReal).toBe(false);
    expect(
      bundle.limitingFactors.some((e) => e.code.includes('TERRAIN')),
    ).toBe(false);
    const outcome = new PhysicalSuitabilityService().decide(bundle, cal);
    expect(outcome.decision.confidence).not.toBe('high');
  });

  it('maximum slope alone cannot create hard constraint', () => {
    const cal = resolveLandUsabilityCalibration();
    const t = realGentleTerrain();
    t.terrain.slope = {
      ...t.terrain.slope,
      meanPercent: 10,
      p90Percent: 14,
      maximumPercent: 80,
    };
    t.terrain.mechanization = {
      terrainSuitability: 'partially_suitable',
      confidence: 'medium',
      limitingFactors: [],
      limitations: [],
    };
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: t,
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    expect(bundle.hardConstraints).toHaveLength(0);
  });

  it('real terrain cannot invent rock percentage / soil depth / geology codes', () => {
    const cal = resolveLandUsabilityCalibration();
    const bundle = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: realGentleTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    const all = [
      ...bundle.supportingEvidence,
      ...bundle.limitingFactors,
      ...bundle.unknownFactors,
    ].map((e) => e.code);
    expect(all.some((c) => /GEOLOGY|EROSION|ROCK_PERCENT|SOIL_DEPTH_FROM_DEM/i.test(c))).toBe(
      false,
    );
  });

  it('lowers TERRAIN_VISUAL_CONFIRMATION priority when real terrain available', () => {
    const cal = resolveLandUsabilityCalibration();
    const withReal = new EvidenceResolutionService().resolve({
      surface: surfaceLike({}),
      terrain: realGentleTerrain(),
      soil: soilgridsSoil(),
      rootableSoilDepth: resolveRootableSoilDepth(undefined, cal),
      calibration: cal,
    });
    const checks = new FieldVerificationRequirementsService().build(withReal, cal);
    const terrainCheck = checks.find((c) => c.code === 'TERRAIN_VISUAL_CONFIRMATION');
    expect(terrainCheck?.priority).toBe('routine');
  });
});
