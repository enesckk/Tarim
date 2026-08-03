import { Router } from 'express';
import type { ParcelController } from '../controllers/parcel.controller.js';

export function createParcelRouter(controller: ParcelController): Router {
  const router = Router();

  router.post('/resolve', controller.resolve);
  router.post('/analyze', controller.analyze);

  return router;
}
