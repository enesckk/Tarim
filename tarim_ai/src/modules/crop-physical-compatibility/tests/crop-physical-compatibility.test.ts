import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../../app.js';
import { resetEnvCache } from '../../../config/env.js';
import { resetSharedCalibrationRepository } from '../../crop-recommendation/calibration/calibration-profile.repository.js';
import { getSharedCalibrationRepository } from '../../crop-recommendation/calibration/calibration-profile.repository.js';
import { getSharedCropRepository } from '../../crop-recommendation/repositories/json-crop.repository.js';
import {
  tryParsePhysicalRequirements,
  physicalRequirementsSchema,
} from '../schemas/physical-requirements.schema.js';
import { CropRequirementResolutionService } from '../services/crop-requirement-resolution.service.js';
import { DepthCompatibilityService } from '../services/depth-compatibility.service.js';
import { TerrainCompatibilityService } from '../services/terrain-compatibility.service.js';
import {
  BedrockCompatibilityService,
  DrainageCompatibilityService,
  MechanizationCompatibilityService,
  StoninessCompatibilityService,
} from '../services/stoniness-compatibility.service.js';
import { CropPhysicalCompatibilityEngine } from '../services/crop-physical-compatibility.engine.js';
import { resolveCropPhysicalCompatibilityCalibration } from '../constants/crop-physical-compatibility-calibration.js';
import type { ParcelPhysicalEvidence } from '../types/crop-physical-compatibility.types.js';
import type { CropKnowledge } from '../../crop-recommendation/knowledge/schemas/crop-knowledge.schema.js';

function ensureEnv(): void {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET =
    process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.CROP_PHYSICAL_COMPATIBILITY_ENABLED = 'true';
  process.env.TERRAIN_PROVIDER = 'mock';
  process.env.SOIL_PROVIDER = 'mock';
  process.env.PARCEL_PROVIDER = 'mock';
  process.env.LAND_USABILITY_ENABLED = 'true';
  resetEnvCache();
}

function baseRequirements() {
  return physicalRequirementsSchema.parse({
    rootableSoilDepth: {
      minimumCm: 30,
      preferredMinimumCm: 60,
      optimalMinimumCm: 90,
      importance: 'high',
    },
    slope: {
      preferredMaximumMeanPercent: 8,
      acceptableMaximumMeanPercent: 15,
      maximumMeanPercent: 25,
      maximumP90Percent: 35,
      importance: 'medium',
    },
    ruggedness: {
      preferredMaximumClass: 'low',
      acceptableMaximumClass: 'medium',
      importance: 'medium',
    },
    surfaceStoninessTolerance: {
      preferredMaximum: 'low',
      acceptableMaximum: 'medium',
      maximum: 'high',
      importance: 'high',
    },
    bedrockOutcropTolerance: {
      preferredMaximum: 'not_observed',
      acceptableMaximum: 'isolated',
      maximum: 'scattered',
      importance: 'high',
    },
    machineAccessRequirement: {
      minimum: 'accessible_with_limitations',
      importance: 'medium',
    },
    drainageRequirement: {
      preferred: ['adequate'],
      acceptable: ['moderately_limited'],
      notPreferred: ['poor', 'waterlogging_observed'],
      importance: 'high',
    },
    source: 'initial-agronomic-knowledge-base',
    validationStatus: 'unvalidated',
  });
}

function evidence(partial: Partial<ParcelPhysicalEvidence> = {}): ParcelPhysicalEvidence {
  return {
    terrainReal: true,
    terrainMock: false,
    terrain: {
      provider: 'copernicus-dem',
      dataset: 'COPERNICUS_30',
      meanSlopePercent: 5.7,
      p90SlopePercent: 6.4,
      maximumSlopePercent: 6.7,
      ruggednessClass: 'low',
      mechanization: 'suitable',
      coverageStatus: 'complete',
      spatialConfidence: 'high',
    },
    field: {
      surveyId: 's1',
      rootableSoilDepth: {
        verified: true,
        minimumCm: 28,
        meanCm: 34.2,
        medianCm: 35,
        maximumCm: 40,
        measurementCount: 5,
        confidence: 'medium',
      },
      surfaceStoniness: 'medium',
      bedrockOutcrop: 'not_observed',
      machineAccess: 'verified_accessible',
      drainage: 'adequate',
    },
    surface: {
      providerReal: true,
      probableRockClassification: 'low',
      probableRockScore: 5,
    },
    soilMock: false,
    soilProvider: 'soilgrids',
    ...partial,
  };
}

describe('crop physical requirements', () => {
  beforeEach(() => {
    ensureEnv();
    resetSharedCalibrationRepository();
  });

  it('loads calibration v1.8 cropPhysicalCompatibility block', () => {
    const profile = getSharedCalibrationRepository().get();
    expect(profile.version).toBe('2.0');
    expect(profile.cropPhysicalCompatibility?.validationStatus).toBe('unvalidated');
    const resolved = resolveCropPhysicalCompatibilityCalibration(undefined);
    expect(resolved.confidence.highRequiresRealTerrain).toBe(true);
  });

  it('parses valid requirements and rejects inverted depth order', () => {
    expect(tryParsePhysicalRequirements(baseRequirements()).ok).toBe(true);
    const bad = tryParsePhysicalRequirements({
      ...baseRequirements(),
      rootableSoilDepth: {
        minimumCm: 90,
        preferredMinimumCm: 60,
        optimalMinimumCm: 30,
        importance: 'high',
      },
    });
    expect(bad.ok).toBe(false);
  });

  it('all 14 crops have complete physicalRequirements', () => {
    const crops = getSharedCropRepository().list();
    expect(crops).toHaveLength(14);
    const resolver = new CropRequirementResolutionService();
    for (const crop of crops) {
      const r = resolver.resolve(crop);
      expect(r.complete).toBe(true);
      expect(r.valid).toBe(true);
    }
  });
});

describe('component compatibility', () => {
  const req = baseRequirements();
  const cal = resolveCropPhysicalCompatibilityCalibration();

  it('depth: mean above minimum below preferred → caution', () => {
    const result = new DepthCompatibilityService().evaluate(req, evidence());
    expect(result.classification).toBe('caution');
    expect(result.matchedRule).toBe('MEAN_ABOVE_MINIMUM_BUT_BELOW_PREFERRED');
    expect(result.sourceType).toBe('field_measurement');
  });

  it('depth: mean and min above optimal → preferred', () => {
    const result = new DepthCompatibilityService().evaluate(
      req,
      evidence({
        field: {
          ...evidence().field!,
          rootableSoilDepth: {
            verified: true,
            minimumCm: 95,
            meanCm: 100,
            medianCm: 100,
            maximumCm: 110,
            measurementCount: 5,
            confidence: 'medium',
          },
        },
      }),
    );
    expect(result.classification).toBe('preferred');
  });

  it('depth: mean below minimum field verified → strongly_limited', () => {
    const result = new DepthCompatibilityService().evaluate(
      req,
      evidence({
        field: {
          ...evidence().field!,
          rootableSoilDepth: {
            verified: true,
            minimumCm: 20,
            meanCm: 22,
            medianCm: 22,
            maximumCm: 25,
            measurementCount: 5,
            confidence: 'medium',
          },
        },
      }),
    );
    expect(result.classification).toBe('strongly_limited');
  });

  it('depth unknown does not use numeric zero', () => {
    const result = new DepthCompatibilityService().evaluate(
      req,
      evidence({ field: null }),
    );
    expect(result.classification).toBe('unknown');
    expect(result.observedValue).toBeNull();
  });

  it('slope preferred and max alone does not strong-limit', () => {
    const terrain = new TerrainCompatibilityService();
    const preferred = terrain.evaluateSlope(req, evidence(), cal);
    expect(preferred.classification).toBe('preferred');

    const onlyMax = terrain.evaluateSlope(
      req,
      evidence({
        terrain: {
          ...evidence().terrain!,
          meanSlopePercent: 10,
          p90SlopePercent: 12,
          maximumSlopePercent: 80,
        },
      }),
      cal,
    );
    expect(onlyMax.classification).not.toBe('strongly_limited');
  });

  it('slope mean above maximum with confidence → strongly_limited', () => {
    const result = new TerrainCompatibilityService().evaluateSlope(
      req,
      evidence({
        terrain: {
          ...evidence().terrain!,
          meanSlopePercent: 30,
          p90SlopePercent: 40,
          maximumSlopePercent: 45,
        },
      }),
      cal,
    );
    expect(result.classification).toBe('strongly_limited');
  });

  it('ruggedness / stoniness / bedrock / drainage / mechanization', () => {
    expect(
      new TerrainCompatibilityService().evaluateRuggedness(req, evidence())
        .classification,
    ).toBe('preferred');
    expect(
      new StoninessCompatibilityService().evaluate(req, evidence()).classification,
    ).toBe('acceptable');
    expect(
      new BedrockCompatibilityService().evaluate(req, evidence()).message,
    ).toMatch(/kesin yok/i);
    expect(
      new DrainageCompatibilityService().evaluate(req, evidence()).classification,
    ).toBe('preferred');
    const mech = new MechanizationCompatibilityService().evaluate(req, evidence());
    expect(mech.combined).toBe('preferred');
    expect(mech.conflict).toBe(false);
  });

  it('terrain/field mechanization conflict is recorded without silent override', () => {
    const mech = new MechanizationCompatibilityService().evaluate(
      req,
      evidence({
        terrain: {
          ...evidence().terrain!,
          mechanization: 'limited',
        },
        field: {
          ...evidence().field!,
          machineAccess: 'verified_accessible',
        },
      }),
    );
    expect(mech.conflict).toBe(true);
    expect(mech.component.matchedRule).toBe('TERRAIN_FIELD_MECHANIZATION_CONFLICT');
  });

  it('mock terrain cannot produce slope limitation', () => {
    const result = new TerrainCompatibilityService().evaluateSlope(
      req,
      evidence({
        terrainReal: false,
        terrainMock: true,
        terrain: {
          ...evidence().terrain!,
          provider: 'mock',
          meanSlopePercent: 40,
          p90SlopePercent: 50,
        },
      }),
      cal,
    );
    expect(result.classification).toBe('unknown');
    expect(result.sourceType).toBe('mock');
  });
});

describe('overall engine + invariants', () => {
  it('pistachio with Güngürge-like evidence is limited/caution and score unchanged', () => {
    const crop = getSharedCropRepository().getById('pistachio')!;
    const engine = new CropPhysicalCompatibilityEngine();
    const { result } = engine.evaluateCrop({
      crop,
      evidence: evidence(),
      calibration: resolveCropPhysicalCompatibilityCalibration(),
      calibrationVersion: '1.7',
      existingScore: 74.18,
    });
    expect(result.recommendationImpactApplied).toBe(false);
    expect(result.audit.scoreBefore).toBe(74.18);
    expect(result.audit.scoreAfter).toBe(74.18);
    expect(['physically_limited', 'compatible_with_caution', 'strongly_limited']).toContain(
      result.classification,
    );
    expect(result.confidence).not.toBe('high');
    const blob = JSON.stringify(result);
    expect(blob).not.toMatch(/yield|tonPer|economy|geology|erosion|percentScore|82\/100/i);
  });

  it('barley is more favorable than pistachio on same shallow parcel', () => {
    const engine = new CropPhysicalCompatibilityEngine();
    const cal = resolveCropPhysicalCompatibilityCalibration();
    const pistachio = engine.evaluateCrop({
      crop: getSharedCropRepository().getById('pistachio')!,
      evidence: evidence(),
      calibration: cal,
      calibrationVersion: '1.7',
      existingScore: 70,
    }).result.classification;
    const barley = engine.evaluateCrop({
      crop: getSharedCropRepository().getById('barley')!,
      evidence: evidence(),
      calibration: cal,
      calibrationVersion: '1.7',
      existingScore: 70,
    }).result.classification;
    const rank = (c: string) =>
      [
        'highly_compatible',
        'compatible',
        'compatible_with_caution',
        'physically_limited',
        'strongly_limited',
        'insufficient_data',
      ].indexOf(c);
    expect(rank(barley)).toBeLessThanOrEqual(rank(pistachio));
  });

  it('missing requirements → insufficient_data without crashing', () => {
    const crop = {
      ...getSharedCropRepository().getById('wheat')!,
      physicalRequirements: undefined,
    } as CropKnowledge;
    const { result } = new CropPhysicalCompatibilityEngine().evaluateCrop({
      crop,
      evidence: evidence(),
      calibration: resolveCropPhysicalCompatibilityCalibration(),
      calibrationVersion: '1.7',
      existingScore: 50,
    });
    expect(result.classification).toBe('insufficient_data');
  });
});

describe('HTTP crop-physical-compatibility', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    ensureEnv();
    resetSharedCalibrationRepository();
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  async function post(path: string, body: unknown) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return {
      status: res.status,
      body: (await res.json()) as {
        code?: string;
        crops?: Array<{
          physicalCompatibility: {
            recommendationImpactApplied: boolean;
            classification?: string;
            components?: unknown;
            audit?: { scoreBefore: number | null; scoreAfter: number | null };
          };
        }>;
      },
    };
  }

  it(
    'POST /analyze returns additive compatibility for selected crops',
    async () => {
      const res = await post('/api/crop-physical-compatibility/analyze', {
        parcelQuery: {
          province: 'Gaziantep',
          district: 'Şehitkamil',
          neighborhood: 'Güngürge',
          block: '108',
          parcel: '7',
        },
        cropIds: ['pistachio', 'wheat', 'barley'],
        includeDetails: true,
        includeExistingScores: false,
        includeLandUsability: false,
        fieldEvidence: {
          rootableSoilDepthMeasurementsCm: [28, 31, 35, 37, 40],
          surfaceStoniness: 'medium',
          bedrockOutcrop: 'not_observed',
          machineAccess: 'verified',
          drainageObservation: 'adequate',
        },
      });
      expect(res.status).toBe(200);
      expect(res.body.crops).toHaveLength(3);
      for (const crop of res.body.crops ?? []) {
        expect(crop.physicalCompatibility.recommendationImpactApplied).toBe(false);
        expect(crop.physicalCompatibility.classification).toBeTruthy();
        expect(crop.physicalCompatibility.audit?.scoreBefore).toBe(
          crop.physicalCompatibility.audit?.scoreAfter,
        );
      }
    },
    20_000,
  );

  it('feature flag disabled returns 503', async () => {
    process.env.CROP_PHYSICAL_COMPATIBILITY_ENABLED = 'false';
    resetEnvCache();
    const res = await post('/api/crop-physical-compatibility/analyze', {
      parcelQuery: {
        province: 'Gaziantep',
        district: 'Şehitkamil',
        neighborhood: 'Güngürge',
        block: '108',
        parcel: '7',
      },
      includeExistingScores: false,
    });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('CROP_PHYSICAL_COMPATIBILITY_DISABLED');
  });

  it('invalid crop id returns 404', async () => {
    const res = await post('/api/crop-physical-compatibility/analyze', {
      parcelQuery: {
        province: 'Gaziantep',
        district: 'Şehitkamil',
        neighborhood: 'Güngürge',
        block: '108',
        parcel: '7',
      },
      cropIds: ['not-a-crop'],
      includeExistingScores: false,
      includeLandUsability: false,
    });
    expect(res.status).toBe(404);
  });

  it('includeDetails false returns summary only', async () => {
    const res = await post('/api/crop-physical-compatibility/analyze', {
      parcelQuery: {
        province: 'Gaziantep',
        district: 'Şehitkamil',
        neighborhood: 'Güngürge',
        block: '108',
        parcel: '7',
      },
      cropIds: ['wheat'],
      includeDetails: false,
      includeExistingScores: false,
      fieldEvidence: {
        rootableSoilDepthMeasurementsCm: [28, 31, 35, 37, 40],
        surfaceStoniness: 'medium',
        bedrockOutcrop: 'not_observed',
        machineAccess: 'verified',
        drainageObservation: 'adequate',
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.crops?.[0]?.physicalCompatibility.classification).toBeTruthy();
    expect(res.body.crops?.[0]?.physicalCompatibility.components).toBeUndefined();
    expect(res.body.crops?.[0]?.physicalCompatibility.recommendationImpactApplied).toBe(
      false,
    );
  });
});
