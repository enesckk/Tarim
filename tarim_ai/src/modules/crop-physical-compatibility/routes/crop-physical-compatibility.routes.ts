import { Router } from 'express';
import type { CropPhysicalCompatibilityController } from '../controllers/crop-physical-compatibility.controller.js';

export function createCropPhysicalCompatibilityRouter(
  controller: CropPhysicalCompatibilityController,
): Router {
  const router = Router();
  router.post('/analyze', controller.analyze);
  return router;
}
