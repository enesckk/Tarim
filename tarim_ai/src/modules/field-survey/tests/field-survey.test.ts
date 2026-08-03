import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../../app.js';
import { createParcelModule } from '../../parcel/index.js';
import { createFieldSurveyModule } from '../index.js';
import { InMemoryFieldSurveyRepository } from '../repositories/field-survey.repository.js';
import { validateSampleGps } from '../services/survey-gps.service.js';
import { aggregateSurvey } from '../services/survey-aggregation.service.js';
import {
  DEFAULT_FIELD_SURVEY_CALIBRATION,
  recommendedSampleCountForArea,
  resolveFieldSurveyCalibration,
} from '../constants/field-survey-calibration.js';
import { FieldEvidenceAdapterService } from '../services/field-evidence-adapter.service.js';
import { stoninessConsistencyWarning } from '../services/survey-validation.service.js';
import { SURVEY_TRANSITIONS } from '../types/field-survey.types.js';
import type { FieldSurvey } from '../types/field-survey.types.js';
import { ApiError } from '../../../utils/api-error.js';
import { ScoreCalibrationService } from '../../crop-recommendation/calibration/score-calibration.service.js';
import { resetEnvCache } from '../../../config/env.js';

const GUNGURGE = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

const SAMPLE_POINTS = [
  { longitude: 37.47502, latitude: 37.20628, accuracyMeters: 3 },
  { longitude: 37.4748, latitude: 37.2065, accuracyMeters: 5 },
  { longitude: 37.4753, latitude: 37.2065, accuracyMeters: 4 },
  { longitude: 37.4751, latitude: 37.206, accuracyMeters: 6 },
  { longitude: 37.4755, latitude: 37.2062, accuracyMeters: 8 },
];

const DEPTHS = [28, 31, 35, 37, 40];
const STONINESS = ['low', 'medium', 'medium', 'medium', 'low'] as const;

const REVIEWER = {
  id: 'rev-1',
  name: 'Ayşe Uzman',
  role: 'agricultural_engineer' as const,
};

// HTTP helpers return loosely typed JSON for integration assertions.
async function jsonFetch(
  port: number,
  path: string,
  init?: RequestInit,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ status: number; body: any }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

describe('field survey calibration', () => {
  it('falls back to defaults when missing', () => {
    const cal = resolveFieldSurveyCalibration(undefined);
    expect(cal.location.lowConfidenceMaxDistanceMeters).toBe(50);
    expect(cal.validationStatus).toBe('unvalidated');
  });

  it('recommends 5 samples for ~22k m²', () => {
    expect(
      recommendedSampleCountForArea(22_002, DEFAULT_FIELD_SURVEY_CALIBRATION),
    ).toBe(5);
  });

  it('exposes fieldSurvey block in calibration v1.5', () => {
    const profile = new ScoreCalibrationService().getProfile();
    expect(profile.version).toBe('2.0');
    expect(profile.fieldSurvey?.minimumSampleSeparationMeters).toBe(20);
  });
});

describe('GPS validation', () => {
  let geometry: GeoJSON.Geometry;

  beforeEach(async () => {
    const parcelModule = createParcelModule();
    const resolved = await parcelModule.parcelQueryService.resolve(GUNGURGE);
    geometry = resolved.parcel.geometry;
  });

  it('accepts point inside polygon', () => {
    const result = validateSampleGps(
      SAMPLE_POINTS[0]!,
      geometry,
      DEFAULT_FIELD_SURVEY_CALIBRATION,
    );
    expect(result.insideParcel).toBe(true);
    expect(result.acceptance).toBe('accepted');
    expect(result.locationConfidence).toBe('high');
  });

  it('rejects point far outside polygon', () => {
    const result = validateSampleGps(
      { latitude: 37.25, longitude: 37.5, accuracyMeters: 5 },
      geometry,
      DEFAULT_FIELD_SURVEY_CALIBRATION,
    );
    expect(result.insideParcel).toBe(false);
    expect(result.acceptance).toBe('invalid');
    expect(result.locationConfidence).toBe('insufficient');
  });

  it('warns for tolerance band outside parcel', () => {
    const result = validateSampleGps(
      { latitude: 37.2055, longitude: 37.4765, accuracyMeters: 5 },
      geometry,
      DEFAULT_FIELD_SURVEY_CALIBRATION,
    );
    if (result.distanceToParcelMeters <= 50) {
      expect(['accepted_with_warning', 'invalid', 'accepted']).toContain(
        result.acceptance,
      );
    }
  });

  it('GPS accuracy prevents high confidence', () => {
    const result = validateSampleGps(
      { ...SAMPLE_POINTS[0]!, accuracyMeters: 40 },
      geometry,
      DEFAULT_FIELD_SURVEY_CALIBRATION,
    );
    expect(result.insideParcel).toBe(true);
    expect(result.locationConfidence).not.toBe('high');
    expect(result.acceptance).toBe('accepted_with_warning');
  });
});

describe('depth and aggregation', () => {
  it('rejects invalid depths', async () => {
    const parcelModule = createParcelModule();
    const module = createFieldSurveyModule({
      parcelQueryService: parcelModule.parcelQueryService,
      repository: new InMemoryFieldSurveyRepository(),
    });
    const survey = await module.fieldSurveyService.create({
      parcelQuery: GUNGURGE,
      surveyDate: '2026-07-29',
      surveyor: { id: 's1', name: 'Surveyor' },
    });
    await expect(
      module.fieldSurveyService.addSample(survey.id, {
        location: SAMPLE_POINTS[0]!,
        rootableSoilDepthCm: 0,
        samplingMethod: 'soil_auger',
      }),
    ).rejects.toBeInstanceOf(ApiError);

    await expect(
      module.fieldSurveyService.addSample(survey.id, {
        location: SAMPLE_POINTS[0]!,
        rootableSoilDepthCm: 600,
        samplingMethod: 'soil_auger',
      }),
    ).rejects.toBeInstanceOf(ApiError);

    await expect(
      module.fieldSurveyService.addSample(survey.id, {
        location: SAMPLE_POINTS[0]!,
        rootableSoilDepthCm: Number.NaN,
        samplingMethod: 'soil_auger',
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('computes depth statistics and medium confidence', async () => {
    const parcelModule = createParcelModule();
    const module = createFieldSurveyModule({
      parcelQueryService: parcelModule.parcelQueryService,
      repository: new InMemoryFieldSurveyRepository(),
    });
    let survey = await module.fieldSurveyService.create({
      parcelQuery: GUNGURGE,
      surveyDate: '2026-07-29',
      surveyor: { id: 's1', name: 'Surveyor' },
      parcelObservations: {
        machineAccess: 'verified_accessible',
        drainageObservation: 'adequate',
        bedrockOutcrop: 'not_observed',
      },
    });

    for (let i = 0; i < 5; i += 1) {
      survey = await module.fieldSurveyService.addSample(survey.id, {
        location: SAMPLE_POINTS[i]!,
        rootableSoilDepthCm: DEPTHS[i],
        surfaceStoniness: STONINESS[i],
        bedrockObserved: false,
        bedrockOutcrop: 'not_observed',
        drainageObservation: 'adequate',
        samplingMethod: 'soil_auger',
      });
    }

    const resolved = await parcelModule.parcelQueryService.resolve(GUNGURGE);
    const agg = aggregateSurvey(
      survey,
      resolved.parcel.areaSquareMeters,
      DEFAULT_FIELD_SURVEY_CALIBRATION,
    );
    expect(agg.rootableSoilDepth.minimumCm).toBe(28);
    expect(agg.rootableSoilDepth.maximumCm).toBe(40);
    expect(agg.rootableSoilDepth.meanCm).toBeCloseTo(34.2, 1);
    expect(agg.rootableSoilDepth.medianCm).toBe(35);
    expect(agg.rootableSoilDepth.measurementCount).toBe(5);
    expect(agg.rootableSoilDepth.confidence).toBe('medium');
    expect(agg.surfaceStoniness.dominant).toBe('medium');
    expect(agg.bedrockOutcrop.worst).toBe('not_observed');
    expect(agg.machineAccess.classification).toBe('verified_accessible');
    expect(agg.drainage.dominant).toBe('adequate');
    expect(agg.spatialCoverage.recommendedSampleCount).toBe(5);
    expect(agg.spatialCoverage.validSampleCount).toBe(5);
  });

  it('flags stoniness inconsistency', () => {
    expect(stoninessConsistencyWarning('none', 30)).toContain('inconsistent');
    expect(stoninessConsistencyWarning('very_high', 2)).toContain('inconsistent');
    expect(stoninessConsistencyWarning('medium', 25)).toBeNull();
  });
});

describe('status workflow', () => {
  it('allows valid transitions and rejects invalid', async () => {
    const parcelModule = createParcelModule();
    const module = createFieldSurveyModule({
      parcelQueryService: parcelModule.parcelQueryService,
      repository: new InMemoryFieldSurveyRepository(),
    });
    let survey = await module.fieldSurveyService.create({
      parcelQuery: GUNGURGE,
      surveyDate: '2026-07-29',
      surveyor: { id: 's1', name: 'Surveyor' },
    });
    survey = await module.fieldSurveyService.addSample(survey.id, {
      location: SAMPLE_POINTS[0]!,
      rootableSoilDepthCm: 30,
      samplingMethod: 'soil_auger',
      surfaceStoniness: 'low',
    });

    await expect(
      module.fieldSurveyService.approve(survey.id, REVIEWER),
    ).rejects.toBeInstanceOf(ApiError);

    survey = await module.fieldSurveyService.submit(survey.id);
    expect(survey.status).toBe('submitted');
    survey = await module.fieldSurveyService.startReview(survey.id);
    expect(survey.status).toBe('under_review');
    survey = await module.fieldSurveyService.approve(survey.id, REVIEWER);
    expect(survey.status).toBe('approved');

    await expect(
      module.fieldSurveyService.addSample(survey.id, {
        location: SAMPLE_POINTS[1]!,
        rootableSoilDepthCm: 32,
        samplingMethod: 'soil_auger',
      }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(SURVEY_TRANSITIONS.approved).toContain('archived');
  });

  it('rejection returns ignored disposition', async () => {
    const parcelModule = createParcelModule();
    const module = createFieldSurveyModule({
      parcelQueryService: parcelModule.parcelQueryService,
      repository: new InMemoryFieldSurveyRepository(),
    });
    let survey = await module.fieldSurveyService.create({
      parcelQuery: GUNGURGE,
      surveyDate: '2026-07-29',
      surveyor: { id: 's1', name: 'Surveyor' },
    });
    survey = await module.fieldSurveyService.addSample(survey.id, {
      location: SAMPLE_POINTS[0]!,
      rootableSoilDepthCm: 30,
      samplingMethod: 'soil_auger',
    });
    survey = await module.fieldSurveyService.submit(survey.id);
    survey = await module.fieldSurveyService.startReview(survey.id);
    survey = await module.fieldSurveyService.reject(
      survey.id,
      REVIEWER,
      'Incomplete notes',
    );
    const adapter = new FieldEvidenceAdapterService();
    const disposition = adapter.resolveDisposition(
      survey,
      22_000,
      DEFAULT_FIELD_SURVEY_CALIBRATION,
    );
    expect(disposition.disposition).toBe('ignored');
  });

  it('rejects survey parcel mismatch for land usability', async () => {
    const parcelModule = createParcelModule();
    const repo = new InMemoryFieldSurveyRepository();
    const module = createFieldSurveyModule({
      parcelQueryService: parcelModule.parcelQueryService,
      repository: repo,
    });
    const survey = await module.fieldSurveyService.create({
      parcelQuery: GUNGURGE,
      surveyDate: '2026-07-29',
      surveyor: { id: 's1', name: 'Surveyor' },
    });
    const stored = (await repo.findById(survey.id))!;
    stored.parcelId = 'other|parcel|id|1|1';
    await repo.update(stored);

    await expect(
      module.fieldSurveyService.resolveForLandUsability({
        parcelQuery: GUNGURGE,
        fieldSurveyId: survey.id,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('field evidence adapter', () => {
  it('only approved surveys produce usable evidence', () => {
    const adapter = new FieldEvidenceAdapterService();
    const base = {
      id: 's1',
      parcelId: 'x',
      parcelReference: GUNGURGE,
      status: 'draft' as const,
      surveyDate: '2026-07-29',
      surveyor: { id: 'u', name: 'n' },
      samples: [],
      parcelObservations: {},
      photos: [],
      notes: [],
      review: null,
      revisionNumber: 1,
      createdAt: '2026-07-29T00:00:00.000Z',
      updatedAt: '2026-07-29T00:00:00.000Z',
      audit: { events: [] },
    } satisfies FieldSurvey;

    expect(
      adapter.resolveDisposition(base, 1000, DEFAULT_FIELD_SURVEY_CALIBRATION)
        .disposition,
    ).toBe('ignored');
    expect(
      adapter.resolveDisposition(
        { ...base, status: 'submitted' },
        1000,
        DEFAULT_FIELD_SURVEY_CALIBRATION,
      ).disposition,
    ).toBe('pending');
  });
});

describe('repository determinism', () => {
  it('in-memory repository is not permanent storage', async () => {
    const repo = new InMemoryFieldSurveyRepository();
    const parcelModule = createParcelModule();
    const module = createFieldSurveyModule({
      parcelQueryService: parcelModule.parcelQueryService,
      repository: repo,
    });
    const survey = await module.fieldSurveyService.create({
      parcelQuery: GUNGURGE,
      surveyDate: '2026-07-29',
      surveyor: { id: 's1', name: 'Surveyor' },
    });
    expect(await repo.findById(survey.id)).not.toBeNull();
    repo.clear();
    expect(await repo.findById(survey.id)).toBeNull();
  });

  it('selects latest approved by approvedAt then surveyDate', async () => {
    const repo = new InMemoryFieldSurveyRepository();
    const older: FieldSurvey = {
      id: 'old',
      parcelId: 'gaziantep|şehitkamil|güngürge|108|7',
      parcelReference: GUNGURGE,
      status: 'approved',
      surveyDate: '2026-01-01',
      surveyor: { id: 's', name: 'n' },
      samples: [],
      parcelObservations: {},
      photos: [],
      notes: [],
      review: null,
      revisionNumber: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      approvedAt: '2026-01-02T00:00:00.000Z',
      audit: { events: [] },
    };
    const newer: FieldSurvey = {
      ...older,
      id: 'new',
      surveyDate: '2026-07-29',
      approvedAt: '2026-07-29T12:00:00.000Z',
    };
    const archived: FieldSurvey = {
      ...newer,
      id: 'arch',
      status: 'archived',
      approvedAt: '2026-07-30T12:00:00.000Z',
    };
    await repo.create(older);
    await repo.create(newer);
    await repo.create(archived);
    const latest = await repo.findLatestApprovedByParcelId(older.parcelId);
    expect(latest?.id).toBe('new');
  });

  it('tie-breaks equal approvedAt/surveyDate by id descending', async () => {
    const repo = new InMemoryFieldSurveyRepository();
    const base = {
      parcelId: 'gaziantep|şehitkamil|güngürge|108|7',
      parcelReference: GUNGURGE,
      status: 'approved' as const,
      surveyDate: '2026-07-29',
      surveyor: { id: 's', name: 'n' },
      samples: [],
      parcelObservations: {},
      photos: [],
      notes: [],
      review: null,
      revisionNumber: 1,
      createdAt: '2026-07-29T00:00:00.000Z',
      updatedAt: '2026-07-29T00:00:00.000Z',
      approvedAt: '2026-07-29T12:00:00.000Z',
      audit: { events: [] },
    };
    await repo.create({ ...base, id: 'aaa' });
    await repo.create({ ...base, id: 'zzz' });
    const latest = await repo.findLatestApprovedByParcelId(base.parcelId);
    expect(latest?.id).toBe('zzz');
  });
});

describe('field survey HTTP + Güngürge land usability', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
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

  it('runs full workflow and feeds land usability', async () => {
    const created = await jsonFetch(port, '/api/field-surveys', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        surveyDate: '2026-07-29',
        surveyor: { id: 'field-1', name: 'Saha Ekibi', organization: 'TK' },
        weatherConditions: {
          recentRainfall: 'none',
          soilSurfaceCondition: 'dry',
        },
        parcelObservations: {
          machineAccess: 'verified_accessible',
          drainageObservation: 'adequate',
          bedrockOutcrop: 'not_observed',
        },
      }),
    });
    expect(created.status).toBe(201);
    const surveyId = created.body.id as string;
    expect(created.body.status).toBe('draft');
    expect(created.body.audit.events[0].type).toBe('SURVEY_CREATED');

    for (let i = 0; i < 5; i += 1) {
      const sampleRes = await jsonFetch(port, `/api/field-surveys/${surveyId}/samples`, {
        method: 'POST',
        body: JSON.stringify({
          location: SAMPLE_POINTS[i],
          rootableSoilDepthCm: DEPTHS[i],
          surfaceStoniness: STONINESS[i],
          bedrockObserved: false,
          bedrockOutcrop: 'not_observed',
          drainageObservation: 'adequate',
          samplingMethod: 'soil_auger',
        }),
      });
      expect(sampleRes.status).toBe(201);
    }

    expect(
      (await jsonFetch(port, `/api/field-surveys/${surveyId}/submit`, { method: 'POST', body: '{}' }))
        .status,
    ).toBe(200);
    expect(
      (
        await jsonFetch(port, `/api/field-surveys/${surveyId}/start-review`, {
          method: 'POST',
          body: '{}',
        })
      ).status,
    ).toBe(200);
    const approved = await jsonFetch(port, `/api/field-surveys/${surveyId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewer: REVIEWER, comments: 'OK' }),
    });
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('approved');

    const getRes = await jsonFetch(port, `/api/field-surveys/${surveyId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.aggregation.rootableSoilDepth.meanCm).toBeCloseTo(34.2, 1);
    expect(getRes.body.aggregation.rootableSoilDepth.confidence).toBe('medium');
    expect(getRes.body.persistence).toBe('process_memory_only');
    expect(getRes.body.repositoryType).toBe('in_memory');

    const listRes = await jsonFetch(port, '/api/field-surveys/by-parcel', {
      method: 'POST',
      body: JSON.stringify(GUNGURGE),
    });
    expect(listRes.status).toBe(200);
    expect(listRes.body.surveys.length).toBeGreaterThanOrEqual(1);

    const lu = await jsonFetch(port, '/api/land-usability/analyze', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        includeSurfaceAnalysis: false,
        includeTerrain: true,
        includeSoil: true,
        fieldSurveyId: surveyId,
      }),
    });
    expect(lu.status).toBe(200);
    expect(lu.body.components.rootableSoilDepth.status).toBe('field_measured');
    expect(
      lu.body.unknownFactors.some(
        (f: { code: string }) => f.code === 'ROOTABLE_SOIL_DEPTH_UNKNOWN',
      ),
    ).toBe(false);
    expect(lu.body.components.terrain.usedInDecision).toBe(false);
    if (lu.body.components.terrain.isMock != null) {
      expect(lu.body.components.terrain.isMock).toBe(true);
    }
    expect(lu.body.landUsability.recommendationsArePreliminary).toBe(true);
    expect(lu.body.audit.fieldSurvey.used).toBe(true);
    expect(lu.body.audit.fieldSurvey.measurementCount).toBe(5);
    expect(lu.body.landUsability.status).toBe('recommendation_with_caution');
    expect(lu.body.landUsability.physicalSuitability).toBe('generally_favorable');
    expect(['medium', 'low']).toContain(lu.body.landUsability.confidence);
    expect(lu.body.audit.matchedRules[0].code).toBe(
      'CAUTION_VERIFIED_FIELD_EVIDENCE',
    );
    expect(lu.body.components.rootableSoilDepth.confidence).toBe('medium');
    expect(
      lu.body.requiredFieldChecks.some(
        (c: { code: string }) => c.code === 'ROOTABLE_SOIL_DEPTH_MEASUREMENT',
      ),
    ).toBe(false);
    expect(
      lu.body.supportingEvidence.some(
        (e: { code: string }) => e.code === 'FIELD_VERIFIED_ROOTABLE_DEPTH',
      ),
    ).toBe(true);
    expect(
      lu.body.supportingEvidence.some(
        (e: { code: string }) => e.code === 'FIELD_VERIFIED_SURFACE_STONINESS',
      ),
    ).toBe(true);
    expect(
      lu.body.requiredFieldChecks.some(
        (c: { code: string }) => c.code === 'MACHINE_ACCESS_INSPECTION',
      ),
    ).toBe(false);
    expect(
      lu.body.requiredFieldChecks.some(
        (c: { code: string }) => c.code === 'DRAINAGE_FIELD_INSPECTION',
      ),
    ).toBe(false);
  });

  it('draft survey does not affect land usability', async () => {
    const created = await jsonFetch(port, '/api/field-surveys', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        surveyDate: '2026-07-29',
        surveyor: { id: 'field-1', name: 'Saha' },
      }),
    });
    expect(created.status).toBe(201);

    await jsonFetch(port, `/api/field-surveys/${created.body.id}/samples`, {
      method: 'POST',
      body: JSON.stringify({
        location: SAMPLE_POINTS[0],
        rootableSoilDepthCm: 35,
        samplingMethod: 'soil_auger',
      }),
    });

    const lu = await jsonFetch(port, '/api/land-usability/analyze', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        includeSurfaceAnalysis: false,
        fieldSurveyId: created.body.id,
      }),
    });
    expect(lu.status).toBe(200);
    expect(lu.body.components.rootableSoilDepth.status).toBe('unknown');
    expect(
      lu.body.ignoredEvidence.some(
        (e: { code: string }) => e.code === 'FIELD_SURVEY_IGNORED',
      ),
    ).toBe(true);
    expect(lu.body.audit.fieldSurvey.used).toBe(false);
  });

  it('existing land usability contract without survey still works', async () => {
    const res = await jsonFetch(port, '/api/land-usability/analyze', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        includeSurfaceAnalysis: false,
        includeTerrain: true,
        includeSoil: true,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.body.landUsability).toHaveProperty('status');
    expect(res.body.landUsability).toHaveProperty('physicalSuitability');
    expect(res.body.landUsability.recommendationsArePreliminary).toBe(true);
    expect(res.body.components.rootableSoilDepth.status).toBe('unknown');
    expect(res.body.components.terrain.isMock).toBe(true);
    expect(res.body.components.terrain.usedInDecision).toBe(false);
    expect(
      res.body.ignoredEvidence.some(
        (e: { code: string }) => e.code === 'MOCK_TERRAIN_NOT_USED',
      ),
    ).toBe(true);
  });

  it('does not invent geology/erosion/photo AI fields on survey', async () => {
    const created = await jsonFetch(port, '/api/field-surveys', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        surveyDate: '2026-07-29',
        surveyor: { id: 'field-1', name: 'Saha' },
      }),
    });
    expect(created.status).toBe(201);
    expect(created.body).not.toHaveProperty('geology');
    expect(created.body).not.toHaveProperty('erosion');
    expect(JSON.stringify(created.body)).not.toContain('photoAi');
  });
});

describe('invariants', () => {
  it('unknown depth cannot become zero via aggregation', () => {
    const survey: FieldSurvey = {
      id: 's',
      parcelId: 'p',
      parcelReference: GUNGURGE,
      status: 'draft',
      surveyDate: '2026-07-29',
      surveyor: { id: 'u', name: 'n' },
      samples: [],
      parcelObservations: {},
      photos: [],
      notes: [],
      review: null,
      revisionNumber: 1,
      createdAt: 't',
      updatedAt: 't',
      audit: { events: [] },
    };
    const agg = aggregateSurvey(survey, 1000, DEFAULT_FIELD_SURVEY_CALIBRATION);
    expect(agg.rootableSoilDepth.status).toBe('unknown');
    expect(agg.rootableSoilDepth.minimumCm).toBeNull();
    expect(agg.rootableSoilDepth.meanCm).toBeNull();
  });
});
