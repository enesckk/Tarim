import { Router } from 'express';
import type { CalibrationManagementController } from '../controllers/calibration-management.controller.js';

export function createCalibrationManagementRouter(
  controller: CalibrationManagementController,
): Router {
  const router = Router();

  router.post('/bootstrap', controller.bootstrap);
  router.post('/crop-requirements', controller.create);
  router.get('/crop-requirements/:id', controller.getById);
  router.patch('/crop-requirements/:id', controller.update);
  router.post('/crop-requirements/:id/submit', controller.submit);
  router.post('/crop-requirements/:id/start-review', controller.startReview);
  router.post('/crop-requirements/:id/reviews', controller.addReview);
  router.post('/crop-requirements/:id/approve', controller.approve);
  router.post('/crop-requirements/:id/publish', controller.publish);
  router.post('/crop-requirements/:id/reject', controller.reject);
  router.post('/crop-requirements/:id/impact-analysis', controller.impactAnalysis);
  router.get('/crop-requirements/:id/compare/:otherId', controller.compare);
  router.post('/crop-requirements/:id/create-revision', controller.createRevision);
  router.post('/crop-requirements/:id/rollback', controller.rollback);
  router.get('/crops/:cropId/active-profile', controller.getActive);

  return router;
}
