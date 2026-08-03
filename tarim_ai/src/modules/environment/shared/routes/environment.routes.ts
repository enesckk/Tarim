import { Router } from 'express';
import type { ClimateController } from '../../climate/controllers/climate.controller.js';
import type { SoilController } from '../../soil/controllers/soil.controller.js';
import type { EnvironmentController } from '../controllers/environment.controller.js';
import { createClimateRouter } from '../../climate/routes/climate.routes.js';
import { createSoilRouter } from '../../soil/routes/soil.routes.js';

export function createEnvironmentRouter(deps: {
  climateController: ClimateController;
  soilController: SoilController;
  environmentController: EnvironmentController;
}): Router {
  const router = Router();

  router.use('/climate', createClimateRouter(deps.climateController));
  router.use('/soil', createSoilRouter(deps.soilController));
  router.post('/profile', deps.environmentController.profile);

  return router;
}
