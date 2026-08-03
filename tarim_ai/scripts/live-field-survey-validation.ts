/**
 * Live end-to-end validation: Field Survey HTTP + real Sentinel LU.
 * Writes report to /tmp/field-survey-live-validation.json
 */
import { writeFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { resetEnvCache } from '../src/config/env.js';
import { createApp } from '../src/app.js';

process.env.PARCEL_PROVIDER = process.env.PARCEL_PROVIDER || 'mock';
process.env.SOIL_PROVIDER = process.env.SOIL_PROVIDER || 'soilgrids';
process.env.TERRAIN_PROVIDER = process.env.TERRAIN_PROVIDER || 'mock';
process.env.LAND_USABILITY_ENABLED = 'true';
resetEnvCache();

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
  id: 'live-rev-1',
  name: 'Live Agricultural Engineer',
  role: 'agricultural_engineer' as const,
};

async function jsonFetch(
  port: number,
  path: string,
  init?: RequestInit,
  timeoutMs = 1_800_000,
): Promise<{ status: number; body: any; elapsedMs: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      ...init,
      signal: controller.signal,
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
    return { status: res.status, body, elapsedMs: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

function pickLu(body: any) {
  return {
    status: body?.landUsability?.status,
    physicalSuitability: body?.landUsability?.physicalSuitability,
    confidence: body?.landUsability?.confidence,
    recommendationsArePreliminary:
      body?.landUsability?.recommendationsArePreliminary,
    rootableSoilDepth: body?.components?.rootableSoilDepth,
    terrain: body?.components?.terrain,
    soil: body?.components?.soil,
    surfaceActivity: body?.components?.surfaceActivity,
    probableRockSignal: body?.components?.probableRockSignal,
    supportingEvidence: (body?.supportingEvidence ?? []).map((e: any) => e.code),
    limitingFactors: (body?.limitingFactors ?? []).map((e: any) => e.code),
    unknownFactors: (body?.unknownFactors ?? []).map((e: any) => e.code),
    ignoredEvidence: (body?.ignoredEvidence ?? []).map((e: any) => e.code),
    requiredFieldChecks: (body?.requiredFieldChecks ?? []).map((c: any) => ({
      code: c.code,
      required: c.required,
      priority: c.priority,
    })),
    matchedRule: body?.audit?.matchedRules?.[0],
    audit: body?.audit,
    validation: body?.validation?.checks,
    sourceResolution: body?.sourceResolution,
  };
}

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  console.error(`Live validation server on :${port}`);

  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    providers: {
      parcel: process.env.PARCEL_PROVIDER,
      soil: process.env.SOIL_PROVIDER,
      terrain: process.env.TERRAIN_PROVIDER,
      surveyRepository: 'in_memory',
    },
    errors: [] as string[],
  };

  try {
    // --- Create survey via HTTP ---
    const created = await jsonFetch(port, '/api/field-surveys', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        surveyDate: '2026-07-29',
        surveyor: {
          id: 'live-surveyor',
          name: 'Saha Ekibi',
          organization: 'TarimAI',
        },
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
    if (created.status !== 201) {
      throw new Error(`create survey failed: ${created.status} ${JSON.stringify(created.body)}`);
    }
    const surveyId = created.body.id as string;
    report.surveyCreate = {
      status: created.status,
      id: surveyId,
      surveyStatus: created.body.status,
      revisionNumber: created.body.revisionNumber,
      parcelId: created.body.parcelId,
      parcelReference: created.body.parcelReference,
      auditEvents: created.body.audit?.events?.map((e: any) => e.type),
    };

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
      if (sampleRes.status !== 201) {
        throw new Error(`add sample ${i + 1} failed: ${JSON.stringify(sampleRes.body)}`);
      }
    }

    const submitted = await jsonFetch(port, `/api/field-surveys/${surveyId}/submit`, {
      method: 'POST',
      body: '{}',
    });
    const underReview = await jsonFetch(
      port,
      `/api/field-surveys/${surveyId}/start-review`,
      { method: 'POST', body: '{}' },
    );
    const approved = await jsonFetch(port, `/api/field-surveys/${surveyId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewer: REVIEWER, comments: 'Live validation approve' }),
    });
    if (approved.status !== 200) {
      throw new Error(`approve failed: ${JSON.stringify(approved.body)}`);
    }

    // immutability
    const immutable = await jsonFetch(port, `/api/field-surveys/${surveyId}/samples`, {
      method: 'POST',
      body: JSON.stringify({
        location: SAMPLE_POINTS[0],
        rootableSoilDepthCm: 33,
        samplingMethod: 'soil_auger',
      }),
    });

    const getSurvey = await jsonFetch(port, `/api/field-surveys/${surveyId}`);
    report.survey = {
      workflow: {
        draft: created.body.status,
        submitted: submitted.body.status,
        under_review: underReview.body.status,
        approved: approved.body.status,
      },
      id: surveyId,
      revisionNumber: getSurvey.body.survey?.revisionNumber,
      parcelId: getSurvey.body.survey?.parcelId,
      parcelReference: getSurvey.body.survey?.parcelReference,
      reviewer: getSurvey.body.survey?.review,
      approvedAt: getSurvey.body.survey?.approvedAt,
      auditEvents: (getSurvey.body.survey?.audit?.events ?? []).map((e: any) => ({
        type: e.type,
        timestamp: e.timestamp,
      })),
      immutableAddSampleStatus: immutable.status,
      immutableError: immutable.body?.error ?? immutable.body,
      aggregation: getSurvey.body.aggregation,
      validation: getSurvey.body.validation,
      samples: (getSurvey.body.survey?.samples ?? []).map((s: any) => ({
        sequence: s.sequence,
        latitude: s.location?.latitude,
        longitude: s.location?.longitude,
        accuracyMeters: s.location?.accuracyMeters,
        insideParcel: s.insideParcel,
        distanceToParcelMeters: s.distanceToParcelMeters,
        locationConfidence: s.locationConfidence,
        depth: s.rootableSoilDepthCm,
        stoniness: s.surfaceStoniness,
        bedrock: s.bedrockOutcrop,
        drainage: s.drainageObservation,
        acceptance: s.acceptance,
        valid: s.acceptance !== 'invalid',
      })),
      persistence: getSurvey.body.persistence,
      repositoryType: getSurvey.body.repositoryType,
    };

    // Error scenarios (quick)
    const errorCases: Record<string, unknown> = {};
    errorCases.approveFromDraft = (
      await jsonFetch(port, `/api/field-surveys/${(
        await jsonFetch(port, '/api/field-surveys', {
          method: 'POST',
          body: JSON.stringify({
            parcelQuery: GUNGURGE,
            surveyDate: '2026-07-29',
            surveyor: { id: 'x', name: 'x' },
          }),
        })
      ).body.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reviewer: REVIEWER }),
      })
    );
    errorCases.invalidDepth0 = await jsonFetch(port, `/api/field-surveys/${(
      await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        body: JSON.stringify({
          parcelQuery: GUNGURGE,
          surveyDate: '2026-07-29',
          surveyor: { id: 'x', name: 'x' },
        }),
      })
    ).body.id}/samples`, {
      method: 'POST',
      body: JSON.stringify({
        location: SAMPLE_POINTS[0],
        rootableSoilDepthCm: 0,
        samplingMethod: 'soil_auger',
      }),
    });
    errorCases.unknownSurvey = await jsonFetch(
      port,
      '/api/field-surveys/00000000-0000-4000-8000-000000000000',
    );
    report.errorScenarios = {
      approveFromDraft: {
        status: (errorCases.approveFromDraft as any).status,
        error: (errorCases.approveFromDraft as any).body?.error,
      },
      invalidDepth0: {
        status: (errorCases.invalidDepth0 as any).status,
        error: (errorCases.invalidDepth0 as any).body?.error,
      },
      unknownSurvey: {
        status: (errorCases.unknownSurvey as any).status,
        error: (errorCases.unknownSurvey as any).body?.error,
      },
      immutableApproved: {
        status: immutable.status,
        error: immutable.body?.error,
      },
    };

    // --- LU BEFORE (no survey, real surface) ---
    console.error('Running LU BEFORE (real surface 24mo)...');
    const before = await jsonFetch(
      port,
      '/api/land-usability/analyze',
      {
        method: 'POST',
        body: JSON.stringify({
          parcelQuery: GUNGURGE,
          includeSurfaceAnalysis: true,
          includeTerrain: true,
          includeSoil: true,
          surfaceAnalysisOptions: {
            analysisMonths: 24,
            maxCloudCoveragePercent: 30,
          },
        }),
      },
      1_800_000,
    );
    report.luBefore = {
      httpStatus: before.status,
      elapsedMs: before.elapsedMs,
      ...pickLu(before.body),
      rawError: before.status !== 200 ? before.body : undefined,
    };
    console.error('LU BEFORE done', before.status, before.elapsedMs);

    // --- LU AFTER (approved survey + real surface; should reuse cache) ---
    console.error('Running LU AFTER (approved survey + surface)...');
    const after = await jsonFetch(
      port,
      '/api/land-usability/analyze',
      {
        method: 'POST',
        body: JSON.stringify({
          parcelQuery: GUNGURGE,
          includeSurfaceAnalysis: true,
          includeTerrain: true,
          includeSoil: true,
          fieldSurveyId: surveyId,
          surfaceAnalysisOptions: {
            analysisMonths: 24,
            maxCloudCoveragePercent: 30,
          },
        }),
      },
      1_800_000,
    );
    report.luAfter = {
      httpStatus: after.status,
      elapsedMs: after.elapsedMs,
      ...pickLu(after.body),
      rawError: after.status !== 200 ? after.body : undefined,
    };
    console.error('LU AFTER done', after.status, after.elapsedMs);

    // Draft survey ignored
    const draft = await jsonFetch(port, '/api/field-surveys', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        surveyDate: '2026-07-29',
        surveyor: { id: 'draft', name: 'Draft' },
      }),
    });
    await jsonFetch(port, `/api/field-surveys/${draft.body.id}/samples`, {
      method: 'POST',
      body: JSON.stringify({
        location: SAMPLE_POINTS[0],
        rootableSoilDepthCm: 30,
        samplingMethod: 'soil_auger',
      }),
    });
    const luDraft = await jsonFetch(port, '/api/land-usability/analyze', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        includeSurfaceAnalysis: false,
        fieldSurveyId: draft.body.id,
      }),
    });
    report.draftSurveyLu = {
      httpStatus: luDraft.status,
      depthStatus: luDraft.body?.components?.rootableSoilDepth?.status,
      fieldSurveyAudit: luDraft.body?.audit?.fieldSurvey,
      ignored: (luDraft.body?.ignoredEvidence ?? []).map((e: any) => e.code),
    };

    // Latest approved selection
    const olderApproved = surveyId;
    // create newer approved quickly without surface
    const newerCreate = await jsonFetch(port, '/api/field-surveys', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        surveyDate: '2026-07-30',
        surveyor: { id: 'newer', name: 'Newer' },
        parcelObservations: { machineAccess: 'verified_accessible' },
      }),
    });
    const newerId = newerCreate.body.id as string;
    await jsonFetch(port, `/api/field-surveys/${newerId}/samples`, {
      method: 'POST',
      body: JSON.stringify({
        location: SAMPLE_POINTS[1],
        rootableSoilDepthCm: 36,
        surfaceStoniness: 'medium',
        samplingMethod: 'soil_auger',
        bedrockOutcrop: 'not_observed',
        drainageObservation: 'adequate',
      }),
    });
    await jsonFetch(port, `/api/field-surveys/${newerId}/submit`, {
      method: 'POST',
      body: '{}',
    });
    await jsonFetch(port, `/api/field-surveys/${newerId}/start-review`, {
      method: 'POST',
      body: '{}',
    });
    await jsonFetch(port, `/api/field-surveys/${newerId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewer: REVIEWER }),
    });
    const latestLu = await jsonFetch(port, '/api/land-usability/analyze', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        includeSurfaceAnalysis: false,
        useLatestApprovedFieldSurvey: true,
      }),
    });
    report.latestApproved = {
      olderSurveyId: olderApproved,
      newerSurveyId: newerId,
      selectedSurveyId: latestLu.body?.audit?.fieldSurvey?.surveyId,
      used: latestLu.body?.audit?.fieldSurvey?.used,
    };

    // Feature flag
    process.env.LAND_USABILITY_ENABLED = 'false';
    resetEnvCache();
    // Need new app for flag - recreate quickly
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    const app2 = createApp();
    const server2 = http.createServer(app2);
    await new Promise<void>((resolve) => server2.listen(0, '127.0.0.1', resolve));
    const port2 = (server2.address() as AddressInfo).port;
    const disabled = await jsonFetch(port2, '/api/land-usability/analyze', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        includeSurfaceAnalysis: false,
      }),
    });
    const fsStillWorks = await jsonFetch(port2, '/api/field-surveys', {
      method: 'POST',
      body: JSON.stringify({
        parcelQuery: GUNGURGE,
        surveyDate: '2026-07-29',
        surveyor: { id: 'flag', name: 'Flag' },
      }),
    });
    report.featureFlag = {
      landUsabilityDisabledStatus: disabled.status,
      landUsabilityDisabledCode: disabled.body?.code,
      fieldSurveyCreateStatus: fsStillWorks.status,
    };
    await new Promise<void>((resolve, reject) =>
      server2.close((err) => (err ? reject(err) : resolve())),
    );

    report.finishedAt = new Date().toISOString();
    writeFileSync(
      '/tmp/field-survey-live-validation.json',
      JSON.stringify(report, null, 2),
    );
    console.error('Wrote /tmp/field-survey-live-validation.json');
  } catch (err) {
    report.fatalError = err instanceof Error ? err.message : String(err);
    writeFileSync(
      '/tmp/field-survey-live-validation.json',
      JSON.stringify(report, null, 2),
    );
    console.error(err);
    process.exitCode = 1;
    try {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    } catch {
      /* ignore */
    }
  }
}

main();
