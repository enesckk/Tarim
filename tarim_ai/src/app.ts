import express, {
  type Request,
  type Response,
  type NextFunction,
  type Express,
} from 'express';
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

export function createApp(): Express {
  resetOperationsRuntime();
  getOperationsRuntime();

  const app = express();
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

  // Drone uploads accept base64 images (larger than typical JSON payloads).
  app.use('/api/drone-images', express.json({ limit: '45mb' }));
  // Analysis create may include soil/irrigation lab PDFs as base64.
  app.use('/api/analyses', express.json({ limit: '30mb' }));
  app.use(express.json({ limit: '1mb' }));
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

  startWeeklyAnalysisScheduler(analysisOrchestratorModule.service);

  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      code: 'NOT_FOUND',
      correlationId: req.observability?.correlationId,
    });
  });

  app.use(errorHandler);

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
