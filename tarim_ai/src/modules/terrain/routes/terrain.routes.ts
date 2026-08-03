import { Router } from 'express';
import type { TerrainController } from '../controllers/terrain.controller.js';

export function createTerrainRouter(controller: TerrainController): Router {
  const router = Router();
  router.post('/profile', controller.profile);
  return router;
}
