import { Router } from 'express';
import { WaterManagementController } from '../controllers/water-management.controller.js';

export function createWaterManagementRouter(): Router {
  const router = Router();
  const controller = new WaterManagementController();

  router.get('/sources', controller.getSources);

  return router;
}
