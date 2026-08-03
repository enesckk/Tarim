import type { ParcelQueryService } from '../parcel/services/parcel-query.service.js';
import type { TerrainProfileService } from '../terrain/services/terrain-profile.service.js';
import type { SoilProfileService } from '../environment/soil/services/soil-profile.service.js';
import type { ClimateProfileService } from '../environment/climate/services/climate-profile.service.js';
import type { FieldSurveyService } from '../field-survey/services/field-survey.service.js';
import { LandUsabilityService } from './services/land-usability.service.js';
import { LandUsabilityController } from './controllers/land-usability.controller.js';
import { createLandUsabilityRouter } from './routes/land-usability.routes.js';

export function createLandUsabilityModule(deps: {
  parcelQueryService: ParcelQueryService;
  terrainProfileService?: TerrainProfileService | null;
  soilProfileService?: SoilProfileService | null;
  climateProfileService?: ClimateProfileService | null;
  fieldSurveyService?: FieldSurveyService | null;
}) {
  const landUsabilityService = new LandUsabilityService(
    deps.parcelQueryService,
    deps.terrainProfileService ?? null,
    deps.soilProfileService ?? null,
    deps.climateProfileService ?? null,
    deps.fieldSurveyService ?? null,
  );
  const controller = new LandUsabilityController(landUsabilityService);
  const router = createLandUsabilityRouter(controller);

  return {
    router,
    landUsabilityService,
    controller,
  };
}
