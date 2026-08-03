import { Router } from 'express';
import type { LandUsabilityController } from '../controllers/land-usability.controller.js';

export function createLandUsabilityRouter(
  controller: LandUsabilityController,
): Router {
  const router = Router();
  router.post('/analyze', controller.analyze);
  return router;
}
