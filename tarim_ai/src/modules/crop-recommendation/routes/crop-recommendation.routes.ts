import { Router } from 'express';
import type { CropRecommendationController } from '../controllers/crop-recommendation.controller.js';

export function createCropRecommendationRouter(
  controller: CropRecommendationController,
): Router {
  const router = Router();
  router.post('/evaluate', controller.evaluate);
  router.post('/compare-scenarios', controller.compareScenarios);
  router.post('/validation-report', controller.validationReport);
  return router;
}

export function createCropsRouter(controller: CropRecommendationController): Router {
  const router = Router();
  router.get('/', controller.listCrops);
  router.get('/:cropId', controller.getCrop);
  return router;
}
