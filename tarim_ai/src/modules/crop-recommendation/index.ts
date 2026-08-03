import type { ParcelQueryService } from '../parcel/services/parcel-query.service.js';
import type { ClimateProfileService } from '../environment/climate/services/climate-profile.service.js';
import type { SoilProfileService } from '../environment/soil/services/soil-profile.service.js';
import type { TerrainProfileService } from '../terrain/services/terrain-profile.service.js';
import type { LandUsabilityService } from '../land-usability/services/land-usability.service.js';
import { getSharedCropRepository } from './repositories/json-crop.repository.js';
import { CropKnowledgeService } from './services/crop-knowledge.service.js';
import { CropRecommendationService } from './services/crop-recommendation.service.js';
import { CropRecommendationController } from './controllers/crop-recommendation.controller.js';
import {
  createCropRecommendationRouter,
  createCropsRouter,
} from './routes/crop-recommendation.routes.js';

export function createCropRecommendationModule(deps: {
  parcelQueryService: ParcelQueryService;
  climateProfileService: ClimateProfileService;
  soilProfileService: SoilProfileService;
  terrainProfileService?: TerrainProfileService;
  landUsabilityService?: LandUsabilityService | null;
}) {
  const repository = getSharedCropRepository();
  const cropKnowledgeService = new CropKnowledgeService(repository);
  const cropRecommendationService = new CropRecommendationService(
    deps.parcelQueryService,
    deps.climateProfileService,
    deps.soilProfileService,
    cropKnowledgeService,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    deps.terrainProfileService ?? null,
    deps.landUsabilityService ?? null,
  );
  const controller = new CropRecommendationController(
    cropKnowledgeService,
    cropRecommendationService,
  );

  return {
    cropsRouter: createCropsRouter(controller),
    recommendationsRouter: createCropRecommendationRouter(controller),
    cropKnowledgeService,
    cropRecommendationService,
    controller,
  };
}
