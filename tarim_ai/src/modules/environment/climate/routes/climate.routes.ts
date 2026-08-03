import { Router } from 'express';
import type { ClimateController } from '../controllers/climate.controller.js';

export function createClimateRouter(controller: ClimateController): Router {
  const router = Router();
  router.post('/profile', controller.profile);
  return router;
}
