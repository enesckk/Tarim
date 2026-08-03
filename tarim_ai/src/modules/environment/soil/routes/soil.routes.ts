import { Router } from 'express';
import type { SoilController } from '../controllers/soil.controller.js';

export function createSoilRouter(controller: SoilController): Router {
  const router = Router();
  router.post('/profile', controller.profile);
  return router;
}
