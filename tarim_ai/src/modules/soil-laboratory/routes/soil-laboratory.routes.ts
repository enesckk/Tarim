import { Router } from 'express';
import { SoilLaboratoryController } from '../controllers/soil-laboratory.controller.js';

export function createSoilLaboratoryRouter(): Router {
  const router = Router();
  const controller = new SoilLaboratoryController();

  router.get('/reports', controller.getLatestReport);
  router.post('/reports', controller.uploadReport);

  return router;
}
