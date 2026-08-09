// @ts-nocheck
import { Router } from 'express';
import { ProviderHealthService } from '../health/provider-health.service.js';

export function createSystemRoutes(healthService: ProviderHealthService): Router {
  const router = Router();

  router.get('/providers', async (req, res, next) => {
    try {
      const matrix = await healthService.getHealthMatrix();
      res.json(matrix);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
