import { randomUUID, createHash } from 'node:crypto';
import type { ParcelQueryService } from '../../parcel/services/parcel-query.service.js';
import type { TerrainProfileService } from '../../terrain/services/terrain-profile.service.js';
import type { ClimateProfileService } from '../../environment/climate/services/climate-profile.service.js';
import type { SoilProfileService } from '../../environment/soil/services/soil-profile.service.js';
import type { FieldSurveyService } from '../../field-survey/services/field-survey.service.js';
import type { LandUsabilityService } from '../../land-usability/services/land-usability.service.js';
import type { CropRecommendationService } from '../../crop-recommendation/services/crop-recommendation.service.js';
import type { CropPhysicalCompatibilityService } from '../../crop-physical-compatibility/services/crop-physical-compatibility.service.js';
import type {
  AnalysisRequest,
  AnalysisCreatedResponse,
  AnalysisStatusResponse,
  AnalysisResultResponse,
  AnalysisStep,
  AnalysisStepKey,
  AnalysisStepStatus,
  ParcelInfo,
  DataSourceInfo,
  SatelliteInfo,
  TerrainInfo,
  ClimateInfo,
  SoilInfo,
  FieldSurveyInfo,
  LandUsabilityInfo,
  CropRecommendationItemDTO,
  ConfidenceInfo,
} from '../types/analysis.types.js';
import { ALL_STEP_KEYS, STEP_LABELS } from '../types/analysis.types.js';
import {
  buildInitialRecord,
  type AnalysisRecord,
  type AnalysisRepository,
} from '../repositories/analysis.repository.js';
import {
  isSentinelConfigured,
  runSatellitePipeline,
  hashSafeSummary,
} from './satellite-pipeline.service.js';
import { getEnv } from '../../../config/env.js';
import { saveLandAnalysisCache, listLandAnalysisCaches } from './land-analysis-cache.service.js';
import {
  readAnalysisAttachmentMeta,
  saveAnalysisPdfAttachment,
} from './analysis-input-attachment.service.js';

function scoreFromLandUsabilityStatus(
  status: string,
  physical: string,
): number {
  switch (status) {
    case 'suitable_for_preliminary_recommendation':
      return 85;
    case 'recommendation_with_caution':
      if (physical === 'generally_favorable' || physical === 'favorable') return 70;
      if (physical === 'limited') return 45;
      return 55;
    case 'field_verification_required':
      return 40;
    case 'strong_physical_constraints':
      return 15;
    case 'insufficient_data':
      return 20;
    default:
      return 50;
  }
}
import {
  ensureAnalysisPdf,
  reportPdfPath,
  writeAnalysisPdf,
} from '../reporting/analysis-pdf-report.js';
import { existsSync } from 'node:fs';

export class AnalysisOrchestratorService {
  constructor(
    private readonly repository: AnalysisRepository,
    private readonly parcelQueryService: ParcelQueryService,
    private readonly terrainProfileService: TerrainProfileService | null,
    private readonly climateProfileService: ClimateProfileService | null,
    private readonly soilProfileService: SoilProfileService | null,
    private readonly fieldSurveyService: FieldSurveyService | null,
    private readonly landUsabilityService: LandUsabilityService | null,
    private readonly cropRecommendationService: CropRecommendationService | null,
    private readonly cropPhysicalCompatibilityService: CropPhysicalCompatibilityService | null = null,
  ) {}

  async createAnalysis(
    request: AnalysisRequest,
    correlationId: string | null,
  ): Promise<AnalysisCreatedResponse> {
    const dataMode = getEnv().ANALYSIS_DATA_MODE;
    if (dataMode === 'golden') {
      return this.createGoldenAnalysis(request, correlationId);
    }

    const id = randomUUID();
    const steps = this.initializeSteps();

    // Persist PDFs before queueing pipeline; strip base64 from stored request options.
    const soilOpt = request.options?.soil ?? null;
    const irrigationOpt = request.options?.irrigation ?? null;
    if (soilOpt?.mode === 'pdf') {
      if (!soilOpt.attachment?.dataBase64) {
        throw new Error('Toprak PDF dosyası gerekli.');
      }
      saveAnalysisPdfAttachment({
        analysisId: id,
        kind: 'soil',
        fileName: soilOpt.attachment.fileName,
        contentType: soilOpt.attachment.contentType,
        dataBase64: soilOpt.attachment.dataBase64,
      });
    }
    if (irrigationOpt?.mode === 'pdf') {
      if (!irrigationOpt.attachment?.dataBase64) {
        throw new Error('Sulama suyu PDF dosyası gerekli.');
      }
      saveAnalysisPdfAttachment({
        analysisId: id,
        kind: 'irrigation',
        fileName: irrigationOpt.attachment.fileName,
        contentType: irrigationOpt.attachment.contentType,
        dataBase64: irrigationOpt.attachment.dataBase64,
      });
    }

    const sanitizedRequest: AnalysisRequest = {
      ...request,
      options: {
        soil: soilOpt
          ? {
              mode: soilOpt.mode,
              ph: soilOpt.ph ?? null,
              ecDsM: soilOpt.ecDsM ?? null,
              organicMatterPercent: soilOpt.organicMatterPercent ?? null,
              clayPercent: soilOpt.clayPercent ?? null,
              sandPercent: soilOpt.sandPercent ?? null,
              siltPercent: soilOpt.siltPercent ?? null,
              attachment: null,
            }
          : null,
        irrigation: irrigationOpt
          ? {
              mode: irrigationOpt.mode,
              availability: irrigationOpt.availability ?? null,
              qualityEntered: irrigationOpt.qualityEntered ?? false,
              ecDsM: irrigationOpt.ecDsM ?? null,
              sar: irrigationOpt.sar ?? null,
              ph: irrigationOpt.ph ?? null,
              attachment: null,
            }
          : null,
      },
    };

    const record = buildInitialRecord(id, sanitizedRequest, steps, correlationId, 'live');
    await this.repository.create(record);

    this.runAnalysis(id).catch(async (err) => {
      const msg = err instanceof Error ? err.message : 'Unexpected analysis failure';
      try {
        await this.repository.update(id, {
          status: 'failed',
          failedAt: new Date().toISOString(),
          errorCode: 'INTERNAL_ERROR',
          errorSummary: msg,
        });
      } catch {
        /* best-effort */
      }
    });

    return {
      analysisId: id,
      parcelId: null,
      status: 'queued',
      createdAt: record.createdAt,
    };
  }

  async getStatus(analysisId: string): Promise<AnalysisStatusResponse | null> {
    const record = await this.repository.findById(analysisId);
    if (!record) return null;
    const steps =
      record.steps.length > 0
        ? record.steps
        : await this.repository.listSteps(analysisId);
    return {
      analysisId: record.id,
      status: record.status,
      progress: record.progress,
      currentStep: record.currentStep,
      steps,
    };
  }

  async getResult(analysisId: string): Promise<AnalysisResultResponse | null> {
    const record = await this.repository.findById(analysisId);
    if (!record?.result) return null;
    const result = { ...record.result };
    if (existsSync(reportPdfPath(analysisId))) {
      result.limitations = (result.limitations ?? []).filter(
        (item) => item !== 'report_generation_missing',
      );
    }
    return result;
  }

  async getOrCreateReportPdf(analysisId: string): Promise<string | null> {
    const result = await this.getResult(analysisId);
    if (!result) return null;
    const { path } = await ensureAnalysisPdf(result);
    return path;
  }

  async getRecord(analysisId: string): Promise<AnalysisRecord | null> {
    return this.repository.findById(analysisId);
  }

  /** File cache + in-memory/DB completed analyses for Reports (past tests). */
  async listLandAnalysisReports(limit = 100) {
    const byAnalysisId = new Map<
      string,
      ReturnType<typeof listLandAnalysisCaches>[number]
    >();

    for (const entry of listLandAnalysisCaches(limit * 2)) {
      byAnalysisId.set(entry.analysisId, entry);
    }

    if (typeof this.repository.listRecent === 'function') {
      const recent = await this.repository.listRecent(limit * 2);
      for (const record of recent) {
        if (!record.result) continue;
        if (
          record.status !== 'completed' &&
          record.status !== 'partial_completed'
        ) {
          continue;
        }
        try {
          const entry = saveLandAnalysisCache({
            landId: record.landId,
            analysisId: record.id,
            status: record.status,
            completedAt: record.completedAt,
            parcel: {
              province: record.province,
              district: record.district,
              neighborhood: record.neighborhood,
              block: record.block,
              parcel: record.parcel,
            },
            result: record.result,
          });
          const prev = byAnalysisId.get(entry.analysisId);
          if (!prev || String(entry.updatedAt) > String(prev.updatedAt)) {
            byAnalysisId.set(entry.analysisId, entry);
          }
        } catch {
          /* best-effort */
        }
      }
    }

    return [...byAnalysisId.values()]
      .sort((a, b) =>
        String(b.completedAt ?? b.updatedAt).localeCompare(
          String(a.completedAt ?? a.updatedAt),
        ),
      )
      .slice(0, limit);
  }

  private initializeSteps(): AnalysisStep[] {
    return ALL_STEP_KEYS.map((key) => ({
      key,
      label: STEP_LABELS[key],
      status: 'pending' as AnalysisStepStatus,
    }));
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    label: string,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                Object.assign(new Error(`${label} timed out after ${timeoutMs}ms`), {
                  code: 'PROVIDER_TIMEOUT',
                }),
              ),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async setStep(
    analysisId: string,
    key: AnalysisStepKey,
    status: AnalysisStepStatus,
    extra?: { error?: string | null; durationMs?: number },
  ): Promise<void> {
    const record = await this.repository.findById(analysisId);
    if (!record) return;
    const existing = record.steps.find((s) => s.key === key);
    const step: AnalysisStep = {
      key,
      label: STEP_LABELS[key],
      status,
      startedAt:
        status === 'processing'
          ? new Date().toISOString()
          : existing?.startedAt,
      completedAt:
        status === 'completed' ||
        status === 'failed' ||
        status === 'partial' ||
        status === 'missing' ||
        status === 'skipped'
          ? new Date().toISOString()
          : existing?.completedAt,
      error: extra?.error !== undefined ? extra.error : existing?.error ?? null,
      durationMs: extra?.durationMs ?? existing?.durationMs,
    };
    await this.repository.upsertStep(analysisId, step);

    const steps = await this.repository.listSteps(analysisId);
    const done = steps.filter(
      (s) => s.status !== 'pending' && s.status !== 'processing',
    ).length;
    const progress = Math.round((done / ALL_STEP_KEYS.length) * 100);
    await this.repository.update(analysisId, {
      progress,
      currentStep: key,
    });
  }

  private async runAnalysis(analysisId: string): Promise<void> {
    try {
      await this.executeAnalysisPipeline(analysisId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected analysis failure';
      await this.repository.update(analysisId, {
        status: 'failed',
        failedAt: new Date().toISOString(),
        errorCode: 'INTERNAL_ERROR',
        errorSummary: msg,
        result: {
          analysisId,
          status: 'failed',
          parcel: null,
          dataSources: [],
          satellite: null,
          terrain: null,
          climate: null,
          soil: null,
          fieldSurvey: null,
          landUsability: null,
          cropRecommendations: [],
          confidence: null,
          limitations: [msg],
          recommendedNextActions: [],
          recommendationsArePreliminary: true,
          generatedAt: new Date().toISOString(),
        },
      });
    }
  }

  private async executeAnalysisPipeline(analysisId: string): Promise<void> {
    const record = await this.repository.findById(analysisId);
    if (!record) return;

    await this.repository.update(analysisId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
    });

    const request: AnalysisRequest = {
      province: record.province,
      district: record.district,
      neighborhood: record.neighborhood,
      block: record.block,
      parcel: record.parcel,
      landId: record.landId,
      options: record.requestOptions ?? null,
    };

    const soilMode = request.options?.soil?.mode ?? 'skip';
    const irrigationMode = request.options?.irrigation?.mode ?? 'skip';
    const irrigationAvailability =
      request.options?.irrigation?.availability ?? 'unknown';
    const manualSoil = request.options?.soil?.mode === 'enter' ? request.options.soil : null;
    const manualIrrigation =
      request.options?.irrigation?.mode === 'enter' ? request.options.irrigation : null;
    const irrigationQualityEntered = Boolean(
      manualIrrigation?.qualityEntered &&
        (manualIrrigation.ecDsM != null ||
          manualIrrigation.sar != null ||
          manualIrrigation.ph != null),
    );

    const limitations: string[] = [];
    const dataSources: DataSourceInfo[] = [];
    let parcelInfo: ParcelInfo | null = null;
    let satelliteInfo: SatelliteInfo | null = null;
    let terrainInfo: TerrainInfo | null = null;
    let climateInfo: ClimateInfo | null = null;
    let soilInfo: SoilInfo | null = null;
    let fieldSurveyInfo: FieldSurveyInfo | null = null;
    let landUsabilityInfo: LandUsabilityInfo | null = null;
    let cropRecommendations: CropRecommendationItemDTO[] = [];
    let hasOptionalFailure = false;
    let geometry: import('../../../types/geojson.types.js').NormalizedGeometry | null =
      null;

    // 1. Parcel (required)
    try {
      await this.setStep(analysisId, 'parcel', 'processing');
      const t0 = Date.now();
      const resolved = await this.withTimeout(
        this.parcelQueryService.resolve(request),
        15_000,
        'parcel',
      );
      await this.setStep(analysisId, 'parcel', 'completed', {
        durationMs: Date.now() - t0,
      });

      geometry = resolved.parcel.geometry;
      const coords = geometry?.coordinates;
      let centroid: { latitude: number; longitude: number } | null = null;
      if (
        geometry?.type === 'Polygon' &&
        Array.isArray(coords) &&
        Array.isArray(coords[0])
      ) {
        const ring = coords[0] as number[][];
        centroid = {
          longitude: ring.reduce((s, c) => s + c[0], 0) / ring.length,
          latitude: ring.reduce((s, c) => s + c[1], 0) / ring.length,
        };
      }

      parcelInfo = {
        province: request.province,
        district: request.district,
        neighborhood: request.neighborhood,
        block: request.block,
        parcel: request.parcel,
        areaSquareMeters: resolved.parcel.areaSquareMeters,
        geometry: geometry
          ? { type: geometry.type, coordinates: geometry.coordinates }
          : null,
        centroid: resolved.parcel.centroid ?? centroid,
        provider: resolved.parcel.provider ?? getEnv().PARCEL_PROVIDER,
        sourceType: resolved.parcel.sourceType,
        verified: resolved.parcel.verified,
        fallbackUsed: resolved.parcel.fallbackUsed,
        fallbackReason: resolved.parcel.fallbackReason,
        sourceMetadata: resolved.parcel.sourceMetadata,
        retrievedAt: new Date().toISOString(),
      };

      if (resolved.parcel.fallbackReason === 'PARCEL_PROVIDER_FORBIDDEN') {
        limitations.push('official_parcel_service_unavailable');
      }
      if (resolved.parcel.provider === 'verified_geojson' && resolved.parcel.fallbackUsed) {
        limitations.push('verified_geometry_fallback_used');
      }

      await this.repository.update(analysisId, {
        parcelId: `${request.province}|${request.district}|${request.neighborhood}|${request.block}|${request.parcel}`,
      });

      dataSources.push({
        key: 'parcel_provider',
        label: 'Parsel Sağlayıcı',
        status: 'completed',
        dataType: 'cadastral',
        quality: 'good',
        isEstimated: false,
        isMeasured: true,
        isApproved: false,
        observationCount: 1,
        dateRange: null,
        lastUpdatedAt: new Date().toISOString(),
        warning: null,
      });

      await this.repository.addProviderSnapshot({
        analysisId,
        providerName: 'parcel',
        stepKey: 'parcel',
        requestMetadata: { ...request },
        responseHash: hashSafeSummary({
          area: resolved.parcel.areaSquareMeters,
          title: resolved.parcel.title,
        }),
        responseSummary: {
          areaSquareMeters: resolved.parcel.areaSquareMeters,
          geometryType: geometry?.type,
        },
        status: 'completed',
        durationMs: Date.now() - t0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Parcel resolution failed';
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : 'PARCEL_NOT_FOUND';
      await this.setStep(analysisId, 'parcel', 'failed', { error: msg });
      for (const key of ALL_STEP_KEYS) {
        if (key === 'parcel') continue;
        await this.setStep(analysisId, key, 'skipped');
      }
      await this.repository.update(analysisId, {
        status: 'failed',
        failedAt: new Date().toISOString(),
        errorCode: code,
        errorSummary: 'Parsel bulunamadı veya alınamadı.',
        result: this.buildResult(
          analysisId,
          'failed',
          parcelInfo,
          dataSources,
          null,
          null,
          null,
          null,
          null,
          null,
          [],
          ['parcel_resolution_failed'],
          null,
        ),
      });
      return;
    }

    // 2-5. Sentinel pipeline
    if (!isSentinelConfigured()) {
      for (const key of [
        'satellite_catalog',
        'satellite_imagery',
        'satellite_statistics',
        'satellite_time_series',
      ] as AnalysisStepKey[]) {
        await this.setStep(analysisId, key, 'missing', {
          error: 'Sentinel credentials not configured',
        });
      }
      hasOptionalFailure = true;
      limitations.push('sentinel_credentials_missing');
      dataSources.push({
        key: 'sentinel_2',
        label: 'Sentinel-2 Uydu Verisi',
        status: 'missing',
        dataType: 'remote_sensing',
        quality: 'unavailable',
        isEstimated: false,
        isMeasured: false,
        isApproved: false,
        observationCount: 0,
        dateRange: null,
        lastUpdatedAt: null,
        warning: 'COPERNICUS_CLIENT_ID/SECRET missing',
      });
      await this.repository.addProviderSnapshot({
        analysisId,
        providerName: 'sentinel',
        stepKey: 'satellite_catalog',
        status: 'failed',
        responseSummary: { reason: 'credentials_missing' },
      });
    } else if (geometry) {
      try {
        await this.setStep(analysisId, 'satellite_catalog', 'processing');
        const t0 = Date.now();
        const pipeline = await this.withTimeout(
          runSatellitePipeline({
            geometry,
            analysisId,
            months: 6,
            days: 90,
            maxCloudCoverage: 30,
          }),
          180_000,
          'sentinel_pipeline',
        );
        const dur = Date.now() - t0;

        await this.setStep(analysisId, 'satellite_catalog', 'completed', {
          durationMs: dur,
        });

        const imageCount = [
          pipeline.images.trueColor,
          pipeline.images.ndvi,
          pipeline.images.ndmi,
          pipeline.images.bsi,
        ].filter(Boolean).length;

        await this.setStep(
          analysisId,
          'satellite_imagery',
          imageCount === 4 ? 'completed' : imageCount > 0 ? 'partial' : 'failed',
          {
            error:
              imageCount === 4
                ? null
                : `Only ${imageCount}/4 imagery layers available`,
          },
        );

        await this.setStep(
          analysisId,
          'satellite_statistics',
          pipeline.summary ? 'completed' : 'failed',
          { error: pipeline.summary ? null : 'Statistics unavailable' },
        );

        await this.setStep(
          analysisId,
          'satellite_time_series',
          pipeline.timeSeries ? 'completed' : 'failed',
          { error: pipeline.timeSeries ? null : 'Time series unavailable' },
        );

        if (imageCount < 4 || !pipeline.summary || !pipeline.timeSeries) {
          hasOptionalFailure = true;
        }

        const stats = pipeline.summary?.indices;
        satelliteInfo = {
          dateRange: pipeline.dateRange,
          candidateObservationCount: pipeline.candidateObservationCount,
          usableObservationCount: pipeline.usableObservationCount,
          rejectedObservationCount: pipeline.rejectedObservationCount,
          latestObservationDate: pipeline.selected?.datetime ?? null,
          selectedObservation: pipeline.selected
            ? {
                date: pipeline.selected.datetime,
                cloudCoverage: pipeline.selected.cloudCoverage ?? 0,
                resolutionMeters: 10,
                trueColor: pipeline.images.trueColor
                  ? {
                      imageUrl: pipeline.images.trueColor.url,
                      mimeType: pipeline.images.trueColor.mimeType,
                    }
                  : null,
                ndvi: pipeline.images.ndvi
                  ? {
                      imageUrl: pipeline.images.ndvi.url,
                      statistics: stats?.ndvi
                        ? {
                            min: stats.ndvi.min,
                            max: stats.ndvi.max,
                            mean: stats.ndvi.mean,
                            median: stats.ndvi.median,
                          }
                        : null,
                    }
                  : null,
                ndmi: pipeline.images.ndmi
                  ? {
                      imageUrl: pipeline.images.ndmi.url,
                      statistics: stats?.ndmi
                        ? {
                            min: stats.ndmi.min,
                            max: stats.ndmi.max,
                            mean: stats.ndmi.mean,
                            median: stats.ndmi.median,
                          }
                        : null,
                    }
                  : null,
                bsi: pipeline.images.bsi
                  ? {
                      imageUrl: pipeline.images.bsi.url,
                      statistics: stats?.bsi
                        ? {
                            min: stats.bsi.min,
                            max: stats.bsi.max,
                            mean: stats.bsi.mean,
                            median: stats.bsi.median,
                          }
                        : null,
                    }
                  : null,
              }
            : null,
          timeSeries: pipeline.timeSeries
            ? {
                ndvi: pipeline.timeSeries.series
                  .filter((p) => p.status === 'success' && p.indices)
                  .map((p) => ({ date: p.datetime, mean: p.indices!.ndviMean })),
                ndmi: pipeline.timeSeries.series
                  .filter((p) => p.status === 'success' && p.indices)
                  .map((p) => ({ date: p.datetime, mean: p.indices!.ndmiMean })),
                bsi: pipeline.timeSeries.series
                  .filter((p) => p.status === 'success' && p.indices)
                  .map((p) => ({ date: p.datetime, mean: p.indices!.bsiMean })),
              }
            : null,
          trend: pipeline.timeSeries
            ? (pipeline.timeSeries.trends as unknown as Record<string, unknown>)
            : null,
          warnings: pipeline.warnings,
        };

        dataSources.push({
          key: 'sentinel_2',
          label: 'Sentinel-2 Uydu Verisi',
          status: imageCount === 4 ? 'completed' : 'partial',
          dataType: 'remote_sensing',
          quality: pipeline.usableObservationCount > 0 ? 'good' : 'poor',
          isEstimated: false,
          isMeasured: false,
          isApproved: false,
          observationCount: pipeline.usableObservationCount,
          dateRange: pipeline.dateRange,
          lastUpdatedAt: new Date().toISOString(),
          warning: pipeline.warnings[0] ?? null,
        });

        await this.repository.addProviderSnapshot({
          analysisId,
          providerName: 'sentinel',
          stepKey: 'satellite_catalog',
          requestMetadata: { months: 6, maxCloudCoverage: 30 },
          responseHash: hashSafeSummary({
            candidate: pipeline.candidateObservationCount,
            usable: pipeline.usableObservationCount,
          }),
          responseSummary: {
            candidateObservationCount: pipeline.candidateObservationCount,
            usableObservationCount: pipeline.usableObservationCount,
            rejectedObservationCount: pipeline.rejectedObservationCount,
            selectedDate: pipeline.selected?.datetime ?? null,
            imageLayers: imageCount,
          },
          sourceDate: pipeline.selected?.datetime ?? null,
          status: 'completed',
          durationMs: dur,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sentinel failed';
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: unknown }).code)
            : 'PROVIDER_UNAVAILABLE';
        for (const key of [
          'satellite_catalog',
          'satellite_imagery',
          'satellite_statistics',
          'satellite_time_series',
        ] as AnalysisStepKey[]) {
          await this.setStep(analysisId, key, 'failed', { error: msg });
        }
        hasOptionalFailure = true;
        limitations.push('sentinel_pipeline_failed');
        dataSources.push({
          key: 'sentinel_2',
          label: 'Sentinel-2 Uydu Verisi',
          status: 'failed',
          dataType: 'remote_sensing',
          quality: 'unavailable',
          isEstimated: false,
          isMeasured: false,
          isApproved: false,
          observationCount: 0,
          dateRange: null,
          lastUpdatedAt: null,
          warning: null,
        });
        await this.repository.addProviderSnapshot({
          analysisId,
          providerName: 'sentinel',
          stepKey: 'satellite_catalog',
          status: 'failed',
          responseSummary: { errorCode: code },
        });
      }
    }

    // 6. Terrain
    if (this.terrainProfileService) {
      try {
        await this.setStep(analysisId, 'terrain', 'processing');
        const t0 = Date.now();
        const terrainResult = await this.withTimeout(
          this.terrainProfileService.getProfile({ parcelQuery: request }),
          30_000,
          'terrain',
        );
        await this.setStep(analysisId, 'terrain', 'completed', {
          durationMs: Date.now() - t0,
        });
        const elev = terrainResult.terrain?.elevation;
        const slope = terrainResult.terrain?.slope;
        terrainInfo = {
          source: terrainResult.metadata?.provider ?? 'copernicus_dem',
          resolutionMeters: terrainResult.metadata?.resolutionMeters ?? 30,
          coverage:
            (terrainResult.terrain?.coverage as unknown as Record<string, unknown>) ??
            {},
          elevation: {
            minMeters: elev?.minimumMeters ?? 0,
            maxMeters: elev?.maximumMeters ?? 0,
            meanMeters: elev?.meanMeters ?? 0,
          },
          slope: {
            meanDegrees: slope?.meanPercent ?? 0,
            maxDegrees: slope?.maximumPercent ?? 0,
            class: slope?.classification ?? 'unknown',
          },
          aspect:
            (terrainResult.terrain?.aspect as unknown as Record<string, unknown>) ??
            {},
          ruggedness:
            (terrainResult.terrain?.ruggedness as unknown as Record<
              string,
              unknown
            >) ?? {},
          terrainVariability:
            (terrainResult.terrain?.terrainVariability as unknown as Record<
              string,
              unknown
            >) ?? {},
          mechanizationSuitability:
            ((terrainResult.terrain?.terrainMechanizationSuitability ??
              terrainResult.terrain?.mechanization) as unknown as Record<
              string,
              unknown
            >) ?? {},
          warnings: terrainResult.limitations ?? [],
        };
        dataSources.push({
          key: 'copernicus_dem',
          label: 'Copernicus DEM',
          status: terrainResult.metadata?.isMock ? 'partial' : 'completed',
          dataType: 'elevation_model',
          quality: terrainResult.metadata?.isMock ? 'mock' : 'good',
          isEstimated: true,
          isMeasured: false,
          isApproved: false,
          observationCount: terrainResult.metadata?.validPixelCount ?? 1,
          dateRange: null,
          lastUpdatedAt: new Date().toISOString(),
          warning: terrainResult.metadata?.isMock ? 'Mock terrain data used' : null,
        });
        if (terrainResult.metadata?.isMock) {
          // Mock DEM is a data-quality limitation, not a pipeline failure.
          limitations.push('terrain_is_mock');
        }
        await this.repository.addProviderSnapshot({
          analysisId,
          providerName: 'copernicus_dem',
          stepKey: 'terrain',
          responseHash: hashSafeSummary({
            mean: elev?.meanMeters,
            pixels: terrainResult.metadata?.validPixelCount,
          }),
          responseSummary: {
            meanElevation: elev?.meanMeters,
            meanSlope: slope?.meanPercent,
            validPixelCount: terrainResult.metadata?.validPixelCount,
            isMock: terrainResult.metadata?.isMock,
          },
          status: terrainResult.metadata?.isMock ? 'partial' : 'completed',
          durationMs: Date.now() - t0,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Terrain failed';
        await this.setStep(analysisId, 'terrain', 'failed', { error: msg });
        hasOptionalFailure = true;
        limitations.push('terrain_data_unavailable');
      }
    } else {
      await this.setStep(analysisId, 'terrain', 'missing');
      hasOptionalFailure = true;
      limitations.push('terrain_service_not_configured');
    }

    // 7. Climate
    if (this.climateProfileService) {
      try {
        await this.setStep(analysisId, 'climate', 'processing');
        const t0 = Date.now();
        const climateResult = await this.withTimeout(
          this.climateProfileService.getProfile({ parcelQuery: request, years: 10 }),
          30_000,
          'climate',
        );
        await this.setStep(analysisId, 'climate', 'completed', {
          durationMs: Date.now() - t0,
        });
        climateInfo = {
          source: climateResult.provider ?? 'nasa_power',
          dataNature: 'regional_gridded_estimate',
          dateRange: (climateResult.period as unknown as Record<string, unknown>) ?? {},
          temperature:
            (climateResult.temperature as unknown as Record<string, unknown>) ?? {},
          precipitation:
            (climateResult.precipitation as unknown as Record<string, unknown>) ?? {},
          humidity: {},
          solarRadiation: {},
          wind: {},
          warnings: climateResult.limitations ?? [],
        };
        dataSources.push({
          key: 'nasa_power',
          label: 'NASA POWER İklim Verisi',
          status: climateResult.metadata?.isMock ? 'partial' : 'completed',
          dataType: 'climate',
          quality: climateResult.metadata?.isMock ? 'mock' : 'good',
          isEstimated: true,
          isMeasured: false,
          isApproved: false,
          observationCount: 1,
          dateRange: null,
          lastUpdatedAt: new Date().toISOString(),
          warning: climateResult.metadata?.isMock ? 'Mock climate data used' : null,
        });
        limitations.push('nasa_power_is_regional');
        if (climateResult.metadata?.isMock) {
          // Mock climate is a data-quality limitation, not a pipeline failure.
          limitations.push('climate_is_mock');
        }
        await this.repository.addProviderSnapshot({
          analysisId,
          providerName: 'nasa_power',
          stepKey: 'climate',
          responseHash: hashSafeSummary(climateResult.temperature),
          responseSummary: {
            provider: climateResult.provider,
            annualMeanC: climateResult.temperature?.annualMeanC,
            isMock: climateResult.metadata?.isMock,
          },
          status: 'completed',
          durationMs: Date.now() - t0,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Climate failed';
        await this.setStep(analysisId, 'climate', 'failed', { error: msg });
        hasOptionalFailure = true;
        limitations.push('climate_data_unavailable');
      }
    } else {
      await this.setStep(analysisId, 'climate', 'missing');
      hasOptionalFailure = true;
      limitations.push('climate_service_not_configured');
    }

    // 8. Soil — SoilGrids by default; optional manual lab-style overlay.
    if (this.soilProfileService || manualSoil) {
      try {
        await this.setStep(analysisId, 'soil', 'processing');
        const t0 = Date.now();
        let soilResult: Awaited<
          ReturnType<NonNullable<typeof this.soilProfileService>['getProfile']>
        > | null = null;
        if (this.soilProfileService) {
          soilResult = await this.withTimeout(
            this.soilProfileService.getProfile({ parcelQuery: request }),
            30_000,
            'soil',
          );
        }

        const usedManual =
          manualSoil != null &&
          (manualSoil.ph != null ||
            manualSoil.ecDsM != null ||
            manualSoil.organicMatterPercent != null ||
            manualSoil.clayPercent != null ||
            manualSoil.sandPercent != null ||
            manualSoil.siltPercent != null);

        await this.setStep(analysisId, 'soil', 'completed', {
          durationMs: Date.now() - t0,
        });

        soilInfo = {
          source: usedManual ? 'manual_soil_entry' : (soilResult?.provider ?? 'soilgrids'),
          dataNature: usedManual ? 'measured' : 'model_estimate',
          spatialResolutionMeters: usedManual ? 0 : 250,
          depthLayers: ['0-5cm', '5-15cm', '15-30cm', '30-60cm', '60-100cm', '100-200cm'],
          properties: {
            ph:
              usedManual && manualSoil?.ph != null
                ? { value: manualSoil.ph }
                : soilResult?.soil?.ph != null
                  ? { value: soilResult.soil.ph }
                  : {},
            clayPercent:
              usedManual && manualSoil?.clayPercent != null
                ? { value: manualSoil.clayPercent }
                : {},
            sandPercent:
              usedManual && manualSoil?.sandPercent != null
                ? { value: manualSoil.sandPercent }
                : {},
            siltPercent:
              usedManual && manualSoil?.siltPercent != null
                ? { value: manualSoil.siltPercent }
                : {},
            organicCarbon:
              usedManual && manualSoil?.organicMatterPercent != null
                ? { value: manualSoil.organicMatterPercent }
                : soilResult?.soil?.organicMatterPercent != null
                  ? { value: soilResult.soil.organicMatterPercent }
                  : {},
            bulkDensity: {},
            coarseFragments: {},
          },
          uncertainty: usedManual && manualSoil?.ecDsM != null ? { ecDsM: manualSoil.ecDsM } : {},
          warnings: usedManual
            ? [
                'Elle girilen toprak değerleri kullanıldı (başvuru beyanı / lab özeti).',
                ...(manualSoil?.ecDsM != null
                  ? [`EC (elle): ${manualSoil.ecDsM} dS/m`]
                  : []),
              ]
            : (soilResult?.limitations ?? []),
        };

        if (soilResult) {
          dataSources.push({
            key: 'soilgrids',
            label: 'SoilGrids Toprak Tahminleri',
            status: usedManual ? 'partial' : soilResult.metadata?.isMock ? 'partial' : 'completed',
            dataType: 'soil',
            quality: soilResult.metadata?.isMock ? 'mock' : 'moderate',
            isEstimated: true,
            isMeasured: false,
            isApproved: false,
            observationCount: 1,
            dateRange: null,
            lastUpdatedAt: new Date().toISOString(),
            warning: usedManual
              ? 'Model profil alındı; elle girilen değerler öncelikli kullanıldı'
              : soilMode === 'pdf'
                ? 'Toprak analizi PDF yüklendi; sayısal değerler henüz çıkarılmadı, model veri kullanıldı'
                : soilResult.metadata?.isMock
                  ? 'Mock soil data used'
                  : null,
          });
        }

        if (usedManual) {
          dataSources.push({
            key: 'manual_soil_entry',
            label: 'Elle Girilen Toprak Verisi',
            status: 'completed',
            dataType: 'laboratory',
            quality: 'applicant_declared',
            isEstimated: false,
            isMeasured: true,
            isApproved: false,
            observationCount: 1,
            dateRange: null,
            lastUpdatedAt: new Date().toISOString(),
            warning: null,
          });
        } else if (soilMode === 'pdf') {
          dataSources.push({
            key: 'soil_analysis_pdf',
            label: 'Toprak Analizi PDF',
            status: 'completed',
            dataType: 'laboratory',
            quality: 'applicant_declared',
            isEstimated: false,
            isMeasured: false,
            isApproved: false,
            observationCount: 1,
            dateRange: null,
            lastUpdatedAt: new Date().toISOString(),
            warning:
              'PDF kaydedildi; otomatik sayısal çıkarım yok — skorlarda SoilGrids kullanıldı',
          });
          limitations.push('soil_analysis_pdf_uploaded_values_not_extracted');
        } else {
          limitations.push('soilgrids_is_estimated');
        }

        if (soilResult?.metadata?.isMock && !usedManual) {
          limitations.push('soil_is_mock');
        }

        await this.repository.addProviderSnapshot({
          analysisId,
          providerName: usedManual ? 'manual_soil_entry' : 'soilgrids',
          stepKey: 'soil',
          responseHash: hashSafeSummary({
            ph: soilInfo.properties.ph,
            manual: usedManual,
          }),
          responseSummary: {
            ph: soilInfo.properties.ph,
            usedManual,
            isMock: soilResult?.metadata?.isMock ?? false,
          },
          status: 'completed',
          durationMs: Date.now() - t0,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Soil failed';
        await this.setStep(analysisId, 'soil', 'failed', { error: msg });
        hasOptionalFailure = true;
        limitations.push('soil_data_unavailable');
      }
    } else {
      await this.setStep(analysisId, 'soil', 'missing');
      hasOptionalFailure = true;
      limitations.push('soil_service_not_configured');
    }

    // 9. Field survey
    if (this.fieldSurveyService) {
      try {
        await this.setStep(analysisId, 'field_survey', 'processing');
        const t0 = Date.now();
        const surveyResult = await this.withTimeout(
          this.fieldSurveyService.resolveForLandUsability({
            parcelQuery: request,
            useLatestApprovedFieldSurvey: true,
          }),
          15_000,
          'field_survey',
        );
        if (
          surveyResult.survey &&
          surveyResult.disposition?.disposition === 'usable'
        ) {
          await this.setStep(analysisId, 'field_survey', 'completed', {
            durationMs: Date.now() - t0,
          });
          const evidence = surveyResult.disposition.evidence;
          const samples = surveyResult.survey.samples ?? [];
          const depths = samples
            .map((s) => Number(s.rootableSoilDepthCm ?? 0))
            .filter((d) => d > 0);
          fieldSurveyInfo = {
            status: 'approved',
            surveyId: surveyResult.survey.id,
            approvedAt: surveyResult.survey.approvedAt ?? null,
            sampleCount: samples.length,
            rootableDepth:
              depths.length > 0
                ? {
                    minCm: Math.min(...depths),
                    maxCm: Math.max(...depths),
                    meanCm: depths.reduce((a, b) => a + b, 0) / depths.length,
                  }
                : evidence?.rootableSoilDepth
                  ? {
                      minCm: evidence.rootableSoilDepth.minimumCm ?? 0,
                      maxCm: evidence.rootableSoilDepth.maximumCm ?? 0,
                      meanCm: evidence.rootableSoilDepth.meanCm ?? 0,
                    }
                  : null,
            stoniness: evidence?.surfaceStoniness
              ? { value: evidence.surfaceStoniness }
              : null,
            rockOutcrop: evidence?.bedrockOutcrop
              ? { value: evidence.bedrockOutcrop }
              : null,
            drainage: evidence?.drainage ? { value: evidence.drainage } : null,
            erosion: null,
            machineryAccess: evidence?.machineAccess
              ? { value: evidence.machineAccess }
              : null,
            notes: [],
            isAuthoritativeFor: ['rootable_depth', 'stoniness', 'drainage'],
          };
          dataSources.push({
            key: 'field_survey',
            label: 'Saha Ölçümü',
            status: 'completed',
            dataType: 'field_measurement',
            quality: 'high',
            isEstimated: false,
            isMeasured: true,
            isApproved: true,
            observationCount: samples.length,
            dateRange: null,
            lastUpdatedAt: surveyResult.survey.approvedAt ?? null,
            warning: null,
          });
        } else {
          await this.setStep(analysisId, 'field_survey', 'missing', {
            durationMs: Date.now() - t0,
          });
          fieldSurveyInfo = {
            status: 'missing',
            surveyId: null,
            approvedAt: null,
            sampleCount: 0,
            rootableDepth: null,
            stoniness: null,
            rockOutcrop: null,
            drainage: null,
            erosion: null,
            machineryAccess: null,
            notes: [],
            isAuthoritativeFor: [],
          };
          limitations.push('field_survey_missing');
        }
      } catch {
        await this.setStep(analysisId, 'field_survey', 'missing');
        limitations.push('field_survey_missing');
      }
    } else {
      await this.setStep(analysisId, 'field_survey', 'missing');
      limitations.push('field_survey_service_not_configured');
    }

    // 10. Land usability
    if (this.landUsabilityService) {
      try {
        await this.setStep(analysisId, 'land_usability', 'processing');
        const t0 = Date.now();
        const luResult = await this.withTimeout(
          this.landUsabilityService.analyze({
            parcelQuery: request,
            useLatestApprovedFieldSurvey: true,
            includeSurfaceAnalysis: true,
            includeTerrain: true,
            includeSoil: true,
            surfaceAnalysisOptions: {
              analysisMonths: 6,
              maxCloudCoveragePercent: 30,
            },
          }),
          90_000,
          'land_usability',
        );
        await this.setStep(analysisId, 'land_usability', 'completed', {
          durationMs: Date.now() - t0,
        });
        const luStatus = luResult.landUsability?.status ?? 'unknown';
        const luPhysical =
          luResult.landUsability?.physicalSuitability ?? 'unknown';
        const luConfidence = luResult.landUsability?.confidence ?? 'low';
        landUsabilityInfo = {
          classification: luStatus,
          score: scoreFromLandUsabilityStatus(luStatus, luPhysical),
          limitingFactors: (luResult.limitingFactors ?? []).map((f) => ({
            factor: f.code ?? 'unknown',
            severity: f.severity ?? 'unknown',
            description: f.message ?? f.reason ?? '',
          })),
          positiveFactors: (luResult.supportingEvidence ?? []).map((f) => ({
            factor: f.code ?? 'unknown',
            description: f.message ?? f.reason ?? '',
          })),
          confidence: {
            level: luConfidence,
            physicalSuitability: luPhysical,
            preliminary: luResult.landUsability?.recommendationsArePreliminary ?? true,
          },
          explanation: String(luPhysical),
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Land usability failed';
        await this.setStep(analysisId, 'land_usability', 'failed', { error: msg });
        hasOptionalFailure = true;
        limitations.push('land_usability_analysis_failed');
      }
    } else {
      await this.setStep(analysisId, 'land_usability', 'skipped');
      limitations.push('land_usability_service_not_configured');
    }

    // 11. Crop physical compatibility
    if (this.cropPhysicalCompatibilityService) {
      try {
        await this.setStep(analysisId, 'crop_compatibility', 'processing');
        const t0 = Date.now();
        await this.withTimeout(
          this.cropPhysicalCompatibilityService.analyze({
            parcelQuery: request,
            useLatestApprovedFieldSurvey: true,
          }),
          30_000,
          'crop_compatibility',
        );
        await this.setStep(analysisId, 'crop_compatibility', 'completed', {
          durationMs: Date.now() - t0,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'CPC failed';
        await this.setStep(analysisId, 'crop_compatibility', 'failed', {
          error: msg,
        });
        hasOptionalFailure = true;
        limitations.push('crop_compatibility_failed');
      }
    } else {
      await this.setStep(analysisId, 'crop_compatibility', 'skipped');
    }

    // 12. Recommendations
    if (this.cropRecommendationService) {
      try {
        await this.setStep(analysisId, 'recommendations', 'processing');
        const t0 = Date.now();
        const irrigationScenario =
          irrigationMode === 'enter'
            ? irrigationAvailability === 'unavailable'
              ? 'rainfed'
              : irrigationAvailability === 'available_limited'
                ? 'limited'
                : irrigationAvailability === 'available_and_sufficient'
                  ? 'full'
                  : 'unknown'
            : 'unknown';
        const recResult = await this.withTimeout(
          this.cropRecommendationService.evaluate({
            parcelQuery: request,
            options: {
              timeSeriesMonths: 6,
              topN: 5,
              climateYears: 10,
              analysisDays: 90,
              maxCloudCoverage: 30,
              irrigationScenario,
            },
          }),
          180_000,
          'recommendations',
        );
        await this.setStep(analysisId, 'recommendations', 'completed', {
          durationMs: Date.now() - t0,
        });
        const ranks = recResult.cropSelection?.ranks;
        cropRecommendations = (recResult.recommendations ?? []).map((r, idx) => ({
          cropId: r.crop?.id ?? '',
          cropName: r.crop?.name ?? '',
          rank: ranks?.[idx] ?? idx + 1,
          score: r.score?.final ?? 0,
          classification: r.score?.classification ?? 'unknown',
          isTopFive: (ranks?.[idx] ?? idx + 1) <= 5,
          positiveFactors: (r.strengths ?? []).map((s) => s.message ?? ''),
          limitingFactors: (r.constraints ?? []).map((c) => c.message ?? ''),
          criticalFailures: [],
          missingValidations: r.requiredVerifications ?? [],
          confidence: {},
          requirementsCompared: [],
          explanation: r.explanation?.summary ?? '',
        }));
        await this.repository.addProviderSnapshot({
          analysisId,
          providerName: 'crop_recommendation',
          stepKey: 'recommendations',
          responseHash: createHash('sha256')
            .update(
              JSON.stringify(
                cropRecommendations.map((c) => ({
                  id: c.cropId,
                  rank: c.rank,
                  score: c.score,
                })),
              ),
            )
            .digest('hex')
            .slice(0, 32),
          responseSummary: {
            count: cropRecommendations.length,
            top5: cropRecommendations.filter((c) => c.isTopFive).map((c) => c.cropId),
          },
          status: 'completed',
          durationMs: Date.now() - t0,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Recommendations failed';
        await this.setStep(analysisId, 'recommendations', 'failed', { error: msg });
        hasOptionalFailure = true;
        limitations.push('crop_recommendations_failed');
      }
    } else {
      await this.setStep(analysisId, 'recommendations', 'skipped');
      limitations.push('crop_recommendation_service_not_configured');
    }

    // Report step starts after recommendations; PDF is written once the final result exists.
    await this.setStep(analysisId, 'report_ready', 'processing');

    const soilValuesUsed =
      soilMode === 'enter' &&
      Boolean(
        manualSoil &&
          (manualSoil.ph != null ||
            manualSoil.ecDsM != null ||
            manualSoil.organicMatterPercent != null ||
            manualSoil.clayPercent != null ||
            manualSoil.sandPercent != null ||
            manualSoil.siltPercent != null),
      );

    if (irrigationQualityEntered && manualIrrigation) {
      dataSources.push({
        key: 'manual_irrigation_water',
        label: 'Elle Girilen Sulama Suyu Verisi',
        status: 'completed',
        dataType: 'laboratory',
        quality: 'applicant_declared',
        isEstimated: false,
        isMeasured: true,
        isApproved: false,
        observationCount: 1,
        dateRange: null,
        lastUpdatedAt: new Date().toISOString(),
        warning: null,
      });
    } else if (irrigationMode === 'pdf') {
      dataSources.push({
        key: 'irrigation_water_pdf',
        label: 'Sulama Suyu Analizi PDF',
        status: 'completed',
        dataType: 'laboratory',
        quality: 'applicant_declared',
        isEstimated: false,
        isMeasured: false,
        isApproved: false,
        observationCount: 1,
        dateRange: null,
        lastUpdatedAt: new Date().toISOString(),
        warning:
          'PDF kaydedildi; otomatik sayısal çıkarım yok — kalite skoruna sayısal etki yok',
      });
      limitations.push('irrigation_water_pdf_uploaded_values_not_extracted');
    } else if (irrigationMode === 'skip') {
      limitations.push('irrigation_water_analysis_missing');
    }

    if (
      soilMode === 'pdf' &&
      !dataSources.some((d) => d.key === 'soil_analysis_pdf')
    ) {
      dataSources.push({
        key: 'soil_analysis_pdf',
        label: 'Toprak Analizi PDF',
        status: 'completed',
        dataType: 'laboratory',
        quality: 'applicant_declared',
        isEstimated: false,
        isMeasured: false,
        isApproved: false,
        observationCount: 1,
        dateRange: null,
        lastUpdatedAt: new Date().toISOString(),
        warning:
          'PDF kaydedildi; otomatik sayısal çıkarım yok — skorlarda SoilGrids kullanıldı',
      });
      if (!limitations.includes('soil_analysis_pdf_uploaded_values_not_extracted')) {
        limitations.push('soil_analysis_pdf_uploaded_values_not_extracted');
      }
    }

    if (soilMode === 'skip') {
      // Model soil already flagged via soilgrids_is_estimated when applicable.
    }

    const soilAttachmentMeta =
      soilMode === 'pdf' ? readAnalysisAttachmentMeta(analysisId, 'soil') : null;
    const irrigationAttachmentMeta =
      irrigationMode === 'pdf'
        ? readAnalysisAttachmentMeta(analysisId, 'irrigation')
        : null;
    const soilPdfPresent = Boolean(soilAttachmentMeta);
    const irrigationPdfPresent = Boolean(irrigationAttachmentMeta);

    const availableSources = dataSources
      .filter((d) => d.status === 'completed')
      .map((d) => d.key);
    const missingSources = dataSources
      .filter((d) => d.status === 'missing' || d.status === 'failed')
      .map((d) => d.key);
    const hasFieldSurvey = fieldSurveyInfo?.status === 'approved';
    const laboratoryAvailable = soilValuesUsed || soilPdfPresent;
    const irrigationLabAvailable = irrigationQualityEntered || irrigationPdfPresent;
    const confidence: ConfidenceInfo = {
      level:
        availableSources.length >= 4
          ? hasFieldSurvey || laboratoryAvailable
            ? 'high'
            : 'medium'
          : 'low',
      availableSources,
      missingSources,
      approvedFieldSurveyAvailable: hasFieldSurvey,
      laboratoryAnalysisAvailable: laboratoryAvailable,
      irrigationWaterAnalysisAvailable: irrigationLabAvailable,
      explanation: soilValuesUsed
        ? irrigationQualityEntered || irrigationPdfPresent
          ? irrigationPdfPresent && !irrigationQualityEntered
            ? 'Elle girilen toprak verisi kullanıldı; sulama suyu PDF yüklendi.'
            : 'Elle girilen toprak ve sulama suyu verileri kullanıldı.'
          : 'Elle girilen toprak verisi kullanıldı; sulama suyu kalitesi girilmedi.'
        : soilPdfPresent
          ? irrigationQualityEntered
            ? 'Toprak analizi PDF yüklendi; sulama suyu değerleri elle girildi. Toprak skorlarında model veri kullanıldı.'
            : irrigationPdfPresent
              ? 'Toprak ve sulama suyu PDF’leri yüklendi; sayısal skorlarda model/varsayılan veri kullanıldı.'
              : 'Toprak analizi PDF yüklendi; skorlarda SoilGrids model verisi kullanıldı.'
          : hasFieldSurvey
            ? 'Onaylanmış saha ölçümü mevcut. Toprak profili model (SoilGrids) verisine dayanır.'
            : irrigationMode === 'enter' || irrigationMode === 'pdf'
              ? 'Sulama beyanı/PDF alındı; toprak için model veri kullanıldı (ön değerlendirme).'
              : 'Saha ölçümü yok; sonuçlar uzaktan algılama ve model verilerine dayanır (ön değerlendirme).',
    };

    const nextActions: string[] = [];
    if (!hasFieldSurvey) nextActions.push('Saha ölçümü yapılması önerilir.');
    if (soilMode === 'skip') {
      nextActions.push(
        'Laboratuvar toprak analizi PDF yükleyebilir veya pH/EC/OM değerlerini elle girebilirsiniz.',
      );
    } else if (soilMode === 'pdf') {
      nextActions.push(
        'Toprak PDF yüklendi; skorlara yansıması için aynı değerleri elle de girebilirsiniz.',
      );
    }
    if (irrigationMode === 'skip') {
      nextActions.push(
        'Sulama suyu analizi PDF yükleyebilir veya EC/SAR/pH değerlerini elle girebilirsiniz.',
      );
    } else if (irrigationMode === 'pdf') {
      nextActions.push(
        'Su PDF yüklendi; kalite skoruna yansıması için EC/SAR/pH değerlerini elle de girebilirsiniz.',
      );
    }

    const toAttachmentSummary = (
      meta: NonNullable<typeof soilAttachmentMeta>,
    ) => ({
      kind: meta.kind,
      fileName: meta.fileName,
      contentType: meta.contentType,
      byteSize: meta.byteSize,
      uploadedAt: meta.uploadedAt,
    });

    const applicantInputs = {
      soilMode,
      irrigationMode,
      irrigationAvailability: irrigationMode === 'enter' ? irrigationAvailability : null,
      soilValuesUsed,
      irrigationQualityUsed: irrigationQualityEntered,
      soilAttachment: soilAttachmentMeta
        ? toAttachmentSummary(soilAttachmentMeta)
        : null,
      irrigationAttachment: irrigationAttachmentMeta
        ? toAttachmentSummary(irrigationAttachmentMeta)
        : null,
      soil:
        soilMode === 'enter' && manualSoil
          ? {
              ph: manualSoil.ph ?? null,
              ecDsM: manualSoil.ecDsM ?? null,
              organicMatterPercent: manualSoil.organicMatterPercent ?? null,
              clayPercent: manualSoil.clayPercent ?? null,
              sandPercent: manualSoil.sandPercent ?? null,
              siltPercent: manualSoil.siltPercent ?? null,
            }
          : null,
      irrigation:
        irrigationMode === 'enter' && manualIrrigation
          ? {
              availability: irrigationAvailability,
              qualityEntered: irrigationQualityEntered,
              ecDsM: irrigationQualityEntered ? (manualIrrigation.ecDsM ?? null) : null,
              sar: irrigationQualityEntered ? (manualIrrigation.sar ?? null) : null,
              ph: irrigationQualityEntered ? (manualIrrigation.ph ?? null) : null,
            }
          : null,
    };

    const finalStatus = hasOptionalFailure ? 'partial_completed' : 'completed';
    let reportOk = false;
    try {
      const pdfDraft = this.buildResult(
        analysisId,
        finalStatus,
        parcelInfo,
        dataSources,
        satelliteInfo,
        terrainInfo,
        climateInfo,
        soilInfo,
        fieldSurveyInfo,
        landUsabilityInfo,
        cropRecommendations,
        limitations.filter((x) => x !== 'report_generation_missing'),
        confidence,
        nextActions,
        applicantInputs,
      );
      const pdfPath = await writeAnalysisPdf(pdfDraft);
      reportOk = true;
      await this.setStep(analysisId, 'report_ready', 'completed');
      void pdfPath;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Report generation failed';
      await this.setStep(analysisId, 'report_ready', 'failed', { error: msg });
      limitations.push('report_generation_missing');
    }

    const result = this.buildResult(
      analysisId,
      finalStatus,
      parcelInfo,
      dataSources,
      satelliteInfo,
      terrainInfo,
      climateInfo,
      soilInfo,
      fieldSurveyInfo,
      landUsabilityInfo,
      cropRecommendations,
      reportOk
        ? limitations.filter((x) => x !== 'report_generation_missing')
        : limitations,
      confidence,
      nextActions,
      applicantInputs,
    );

    await this.repository.update(analysisId, {
      status: finalStatus,
      progress: 100,
      completedAt: new Date().toISOString(),
      result,
    });

    try {
      const finished = await this.repository.findById(analysisId);
      if (finished?.result) {
        saveLandAnalysisCache({
          landId: finished.landId,
          analysisId,
          status: finalStatus,
          completedAt: finished.completedAt,
          parcel: {
            province: finished.province,
            district: finished.district,
            neighborhood: finished.neighborhood,
            block: finished.block,
            parcel: finished.parcel,
          },
          result: finished.result,
        });
      }
    } catch {
      /* best-effort land cache */
    }
  }

  private buildResult(
    analysisId: string,
    status: AnalysisResultResponse['status'],
    parcel: ParcelInfo | null,
    dataSources: DataSourceInfo[],
    satellite: SatelliteInfo | null,
    terrain: TerrainInfo | null,
    climate: ClimateInfo | null,
    soil: SoilInfo | null,
    fieldSurvey: FieldSurveyInfo | null,
    landUsability: LandUsabilityInfo | null,
    cropRecommendations: CropRecommendationItemDTO[],
    limitations: string[],
    confidence: ConfidenceInfo | null,
    nextActions: string[] = [],
    applicantInputs: AnalysisResultResponse['applicantInputs'] = null,
  ): AnalysisResultResponse {
    return {
      analysisId,
      status,
      parcel,
      dataSources,
      satellite,
      terrain,
      climate,
      soil,
      fieldSurvey,
      landUsability,
      cropRecommendations,
      confidence,
      limitations: [...new Set(limitations)],
      recommendedNextActions: nextActions,
      applicantInputs,
      recommendationsArePreliminary: true,
      generatedAt: new Date().toISOString(),
    };
  }

  private async createGoldenAnalysis(
    request: AnalysisRequest,
    correlationId: string | null,
  ): Promise<AnalysisCreatedResponse> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const steps = this.initializeSteps();

    try {
      const { loadGoldenDatasetForAnalysis } = await import('../golden/golden-loader.js');
      const { verifyGoldenDataset } = await import('../golden/golden-verify.js');
      const verification = await verifyGoldenDataset();
      if (!verification.demoReady) {
        const record = buildInitialRecord(
          id,
          request,
          steps,
          correlationId,
          'golden',
        );
        record.status = 'failed';
        record.failedAt = now;
        record.errorCode = 'GOLDEN_DATASET_NOT_READY';
        record.errorSummary = 'Golden dataset is not demo-ready';
        await this.repository.create(record);
        return {
          analysisId: id,
          parcelId: null,
          status: 'failed',
          createdAt: now,
        };
      }

      const goldenResult = await loadGoldenDatasetForAnalysis(id, request);
      try {
        await writeAnalysisPdf(goldenResult);
        goldenResult.limitations = (goldenResult.limitations ?? []).filter(
          (item) => item !== 'report_generation_missing',
        );
      } catch {
        // Keep report_generation_missing if PDF write fails
        if (!(goldenResult.limitations ?? []).includes('report_generation_missing')) {
          goldenResult.limitations = [
            ...(goldenResult.limitations ?? []),
            'report_generation_missing',
          ];
        }
      }
      for (const step of steps) {
        step.status = 'completed';
        step.completedAt = now;
      }
      if ((goldenResult.limitations ?? []).includes('report_generation_missing')) {
        const reportStep = steps.find((s) => s.key === 'report_ready');
        if (reportStep) {
          reportStep.status = 'failed';
          reportStep.error = 'PDF rapor üretilemedi';
        }
      }
      const record = buildInitialRecord(id, request, steps, correlationId, 'golden');
      record.status = 'completed';
      record.progress = 100;
      record.startedAt = now;
      record.completedAt = now;
      record.result = goldenResult;
      await this.repository.create(record);
      try {
        saveLandAnalysisCache({
          landId: record.landId,
          analysisId: id,
          status: 'completed',
          completedAt: now,
          parcel: {
            province: request.province,
            district: request.district,
            neighborhood: request.neighborhood,
            block: request.block,
            parcel: request.parcel,
          },
          result: goldenResult,
        });
      } catch {
        /* best-effort */
      }
      return {
        analysisId: id,
        parcelId: null,
        status: 'completed',
        createdAt: now,
      };
    } catch {
      const record = buildInitialRecord(id, request, steps, correlationId, 'golden');
      record.status = 'failed';
      record.failedAt = now;
      record.errorCode = 'GOLDEN_DATASET_NOT_READY';
      await this.repository.create(record);
      return {
        analysisId: id,
        parcelId: null,
        status: 'failed',
        createdAt: now,
      };
    }
  }
}
