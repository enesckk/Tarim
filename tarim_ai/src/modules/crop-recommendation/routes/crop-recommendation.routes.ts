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
  router.get('/admin/stats', controller.adminStats);
  router.get('/criteria-catalog', controller.getCriteriaCatalog);
  router.get('/:cropId', controller.getCrop);
  router.get('/:cropId/decision-rules', controller.getDecisionRules);
  router.get('/:cropId/scientific-data', controller.getScientificData);
  router.get('/:cropId/regional-profile', controller.getRegionalProfile);
  return router;
}
