import type { ParcelQueryService } from '../parcel/services/parcel-query.service.js';
import { getEnv } from '../../config/env.js';
import { createClimateProvider } from './climate/providers/create-climate-provider.js';
import { ClimateController } from './climate/controllers/climate.controller.js';
import { ClimateProfileService } from './climate/services/climate-profile.service.js';
import { createSoilProvider } from './soil/providers/create-soil-provider.js';
import { SoilController } from './soil/controllers/soil.controller.js';
import { SoilProfileService } from './soil/services/soil-profile.service.js';
import { EnvironmentController } from './shared/controllers/environment.controller.js';
import { EnvironmentProfileService } from './shared/services/environment-profile.service.js';
import { createEnvironmentRouter } from './shared/routes/environment.routes.js';

/**
 * Wires climate + soil providers with shared parcel query dependency.
 */
export function createEnvironmentModule(parcelQueryService: ParcelQueryService) {
  const env = getEnv();
  const climateProvider = createClimateProvider();
  const soilProvider = createSoilProvider();

  const climateProfileService = new ClimateProfileService(climateProvider, parcelQueryService);
  const soilProfileService = new SoilProfileService(
    soilProvider,
    parcelQueryService,
    undefined,
    undefined,
    env.SOILGRIDS_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  const environmentProfileService = new EnvironmentProfileService(
    parcelQueryService,
    climateProfileService,
    soilProfileService,
  );

  const climateController = new ClimateController(climateProfileService);
  const soilController = new SoilController(soilProfileService);
  const environmentController = new EnvironmentController(environmentProfileService);

  const router = createEnvironmentRouter({
    climateController,
    soilController,
    environmentController,
  });

  return {
    router,
    climateProfileService,
    soilProfileService,
    environmentProfileService,
    climateProvider,
    soilProvider,
  };
}
