import express, {
  type Request,
  type Response,
  type NextFunction,
  type Express,
} from 'express';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { ZodError } from 'zod';
import { createSatelliteRouter } from './routes/satellite.routes.js';
import { createParcelModule } from './modules/parcel/index.js';
import { createEnvironmentModule } from './modules/environment/index.js';
import { createTerrainModule } from './modules/terrain/index.js';
import { createCropRecommendationModule } from './modules/crop-recommendation/index.js';
import { createLandUsabilityModule } from './modules/land-usability/index.js';
import { createFieldSurveyModule } from './modules/field-survey/index.js';
import { createCropPhysicalCompatibilityModule } from './modules/crop-physical-compatibility/index.js';
import { createCalibrationManagementModule } from './modules/calibration-management/index.js';
import { createAnalysisOrchestratorModule } from './modules/analysis-orchestrator/index.js';
import { startWeeklyAnalysisScheduler } from './modules/analysis-orchestrator/services/weekly-analysis-scheduler.service.js';
import { createDroneImageryModule } from './modules/drone-imagery/index.js';
import { createPhysicalSuitabilityModule } from './modules/physical-suitability/index.js';
import { createSeasonalCropAnalysisModule } from './modules/seasonal-crop-analysis/index.js';
import { createCropGuideModule } from './modules/crop-production-guide/index.js';
import { createProductionPlanningModule } from './modules/production-planning/index.js';
import { createNotificationModule } from './modules/notifications/index.js';
import { createFieldLogModule } from './modules/field-log/index.js';
import { createSoilLaboratoryRouter } from './modules/soil-laboratory/routes/soil-laboratory.routes.js';
import { createWaterManagementRouter } from './modules/water-management/routes/water-management.routes.js';
import { createDecisionEngineRouter } from './modules/physical-suitability/routes/decision-engine.routes.js';
import { createSeasonalCropRankingRouter } from './modules/seasonal-crop-ranking/routes/seasonal-crop-ranking.routes.js';
import { createPerennialCropRankingRouter } from './modules/perennial-crop-ranking/routes/perennial-crop-ranking.routes.js';
import { createFinalReportRouter } from './modules/final-report/routes/final-report.routes.js';
import { createSystemRoutes } from './modules/operations/routes/system.routes.js';
import { ProviderHealthService } from './modules/operations/health/provider-health.service.js';

import { createDatabaseHealthRouter } from './modules/database/index.js';
import {
  correlationMiddleware,
  createOperationsHealthRouter,
  httpObservabilityMiddleware,
  idempotencyMiddleware,
  getOperationsRuntime,
  resetOperationsRuntime,
} from './modules/operations/index.js';
import { isApiError } from './utils/api-error.js';
import { getEnv } from './config/env.js';

export function createApp(): Express {
  resetOperationsRuntime();
  getOperationsRuntime();

  const app = express();

  // Enable CORS for frontend web client access
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Correlation-Id, Idempotency-Key');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Serve drone photos statically
  const dronePhotosDir = process.env.DRONE_PHOTOS_DIR || path.resolve(process.cwd(), 'public', 'drone_photos');
  app.use('/drone_photos', express.static(dronePhotosDir));
  const parcelModule = createParcelModule();
  const environmentModule = createEnvironmentModule(parcelModule.parcelQueryService);
  const terrainModule = createTerrainModule(parcelModule.parcelQueryService);
  const fieldSurveyModule = createFieldSurveyModule({
    parcelQueryService: parcelModule.parcelQueryService,
  });
  const landUsabilityModule = createLandUsabilityModule({
    parcelQueryService: parcelModule.parcelQueryService,
    terrainProfileService: terrainModule.terrainProfileService,
    soilProfileService: environmentModule.soilProfileService,
    climateProfileService: environmentModule.climateProfileService,
    fieldSurveyService: fieldSurveyModule.fieldSurveyService,
  });
  const cropModule = createCropRecommendationModule({
    parcelQueryService: parcelModule.parcelQueryService,
    climateProfileService: environmentModule.climateProfileService,
    soilProfileService: environmentModule.soilProfileService,
    terrainProfileService: terrainModule.terrainProfileService,
    landUsabilityService: landUsabilityModule.landUsabilityService,
  });
  const calibrationManagementModule = createCalibrationManagementModule({
    cropKnowledgeService: cropModule.cropKnowledgeService,
  });
  const cropPhysicalCompatibilityModule = createCropPhysicalCompatibilityModule({
    parcelQueryService: parcelModule.parcelQueryService,
    cropKnowledgeService: cropModule.cropKnowledgeService,
    terrainProfileService: terrainModule.terrainProfileService,
    fieldSurveyService: fieldSurveyModule.fieldSurveyService,
    landUsabilityService: landUsabilityModule.landUsabilityService,
    cropRecommendationService: cropModule.cropRecommendationService,
    calibrationManagementService: calibrationManagementModule.service,
  });
  cropModule.cropRecommendationService.setCalibrationManagementService(
    calibrationManagementModule.service,
  );
  const analysisOrchestratorModule = createAnalysisOrchestratorModule({
    parcelQueryService: parcelModule.parcelQueryService,
    terrainProfileService: terrainModule.terrainProfileService,
    climateProfileService: environmentModule.climateProfileService,
    soilProfileService: environmentModule.soilProfileService,
    fieldSurveyService: fieldSurveyModule.fieldSurveyService,
    landUsabilityService: landUsabilityModule.landUsabilityService,
    cropRecommendationService: cropModule.cropRecommendationService,
    cropPhysicalCompatibilityService: cropPhysicalCompatibilityModule.service,
  });
  const droneImageryModule = createDroneImageryModule();
  const physicalSuitabilityModule = createPhysicalSuitabilityModule();
  const seasonalCropAnalysisModule = createSeasonalCropAnalysisModule({
    parcelQueryService: parcelModule.parcelQueryService,
    climateProfileService: environmentModule.climateProfileService,
    soilProfileService: environmentModule.soilProfileService,
    terrainProfileService: terrainModule.terrainProfileService,
    physicalSuitabilityFacade: physicalSuitabilityModule.facade,
    cropRecommendationService: cropModule.cropRecommendationService,
  });

  const cropGuideModule = createCropGuideModule();
  const notificationModule = createNotificationModule();
  const productionPlanningModule = createProductionPlanningModule();
  const fieldLogModule = createFieldLogModule();

  // Drone uploads accept base64 images (larger than typical JSON payloads).
  app.use('/api/drone-images', express.json({ limit: '45mb' }));
  // Analysis create may include soil/irrigation lab PDFs as base64.
  app.use('/api/analyses', express.json({ limit: '30mb' }));
  app.use(express.json({ limit: '1mb' }));
  // Only the authenticated Agriculture API proxy may call AI endpoints. Render's
  // /health probe stays public, while every /api route uses the shared secret.
  app.use('/api', (req, res, next) => {
    const expected = getEnv().AMS_INTEGRATION_API_KEY.trim();
    const provided = req.header('X-TarimAi-Key')?.trim() ?? '';
    if (process.env.NODE_ENV !== 'production') {
      next();
      return;
    }
    const expectedBytes = Buffer.from(expected);
    const providedBytes = Buffer.from(provided);
    if (
      expectedBytes.length === 0 ||
      expectedBytes.length !== providedBytes.length ||
      !timingSafeEqual(expectedBytes, providedBytes)
    ) {
      res.status(401).json({ error: 'unauthorized_service_request' });
      return;
    }
    next();
  });
  app.use(correlationMiddleware);
  app.use(httpObservabilityMiddleware);
  app.use(idempotencyMiddleware);

  app.get('/health', (_req, res) => {
    const runtime = getOperationsRuntime();
    res.json({
      status: 'ok',
      persistence: fieldSurveyModule.persistence,
      idempotency: {
        enabled: runtime.config.idempotencyEnabled,
        durable: runtime.durable,
        provider: runtime.persistenceProvider,
      },
    });
  });
  app.use('/api/health', createOperationsHealthRouter());
  app.use('/api/health', createDatabaseHealthRouter());
  app.use('/api/system', createSystemRoutes(new ProviderHealthService()));

  app.use('/api/satellite', createSatelliteRouter(parcelModule.parcelQueryService));
  app.use('/api/parcel', parcelModule.router);
  app.use('/api/environment', environmentModule.router);
  app.use('/api/terrain', terrainModule.router);
  app.use('/api/field-surveys', fieldSurveyModule.router);
  app.use('/api/land-usability', landUsabilityModule.router);
  app.use('/api/crops', cropModule.cropsRouter);
  app.use('/api/crop-recommendations', cropModule.recommendationsRouter);
  app.use(
    '/api/crop-physical-compatibility',
    cropPhysicalCompatibilityModule.router,
  );
  app.use(
    '/api/calibration-management',
    calibrationManagementModule.router,
  );
  app.use('/api/analyses', analysisOrchestratorModule.analysisRouter);
  app.use('/api/demo/readiness', analysisOrchestratorModule.readinessRouter);
  app.use('/api/drone-images', droneImageryModule.router);
  app.use('/api/physical-suitability', physicalSuitabilityModule.router);
  app.use('/api', physicalSuitabilityModule.soilCatalogRouter);
  app.use('/api', seasonalCropAnalysisModule.router);
  app.use('/api/soil-laboratory', createSoilLaboratoryRouter());
  app.use('/api/water-management', createWaterManagementRouter());
  app.use('/api/physical-suitability', createDecisionEngineRouter());
  app.use('/api/seasonal-crop-ranking', createSeasonalCropRankingRouter());
  app.use('/api/perennial-crop-ranking', createPerennialCropRankingRouter());
  app.use('/api/reports', createFinalReportRouter());
  app.use('/api/crop-guides', cropGuideModule.router);
  app.use('/api/production-plans', productionPlanningModule.router);
  app.use('/api/notifications', notificationModule.router);
  app.use('/api/field-logs', fieldLogModule.router);

  startWeeklyAnalysisScheduler(analysisOrchestratorModule.service);

  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      code: 'NOT_FOUND',
      correlationId: req.observability?.correlationId,
    });
  });

  app.use(errorHandler);

  app.locals.analysisOrchestrator = analysisOrchestratorModule.service;

  return app;
}

function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId = req.observability?.correlationId;

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      correlationId,
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (isApiError(err)) {
    const details = err.details;
    const codeFromDetails =
      details &&
      typeof details === 'object' &&
      details !== null &&
      'code' in details &&
      typeof (details as { code: unknown }).code === 'string'
        ? (details as { code: string }).code
        : err.code;

    res.status(err.statusCode).json({
      error: err.message,
      ...(codeFromDetails ? { code: codeFromDetails } : {}),
      correlationId,
      ...(details !== undefined ? { details } : {}),
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    correlationId,
  });
}
