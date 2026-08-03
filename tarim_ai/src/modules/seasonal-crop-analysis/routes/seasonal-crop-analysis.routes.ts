import { Router } from 'express';
import type { SeasonalCropAnalysisController } from '../controllers/seasonal-crop-analysis.controller.js';

export function createSeasonalCropAnalysisRouter(
  controller: SeasonalCropAnalysisController,
): Router {
  const router = Router();

  router.post('/seasonal-crop-analysis', controller.create);
  router.get('/seasonal-crop-analysis/:id/status', controller.getStatus);
  router.get('/seasonal-crop-analysis/:id', controller.getById);
  router.get('/parcels/:parcelId/seasonal-crop-analyses', controller.listByParcel);
  router.post('/demo/seasonal-analysis', controller.demo);

  return router;
}
