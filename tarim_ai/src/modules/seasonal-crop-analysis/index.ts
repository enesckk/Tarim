import type { ParcelQueryService } from '../parcel/services/parcel-query.service.js';
import type { ClimateProfileService } from '../environment/climate/services/climate-profile.service.js';
import type { SoilProfileService } from '../environment/soil/services/soil-profile.service.js';
import type { TerrainProfileService } from '../terrain/services/terrain-profile.service.js';
import type { PhysicalSuitabilityFacade } from '../physical-suitability/services/physical-suitability.facade.js';
import type { CropRecommendationService } from '../crop-recommendation/services/crop-recommendation.service.js';
import { getSharedSeasonalAnalysisRepository } from '../database/persistence-factory.js';
import type { SeasonalAnalysisRepository } from './repositories/seasonal-analysis.repository.js';
import { SeasonalAnalysisOrchestratorService } from './services/seasonal-analysis-orchestrator.service.js';
import { SeasonalCropAnalysisService } from './services/seasonal-crop-analysis.service.js';
import { SeasonalCropAnalysisController } from './controllers/seasonal-crop-analysis.controller.js';
import { createSeasonalCropAnalysisRouter } from './routes/seasonal-crop-analysis.routes.js';

export interface SeasonalCropAnalysisModuleDeps {
  parcelQueryService: ParcelQueryService;
  climateProfileService: ClimateProfileService | null;
  soilProfileService: SoilProfileService | null;
  terrainProfileService: TerrainProfileService | null;
  physicalSuitabilityFacade: PhysicalSuitabilityFacade;
  cropRecommendationService: CropRecommendationService | null;
  repository?: SeasonalAnalysisRepository;
}

export function createSeasonalCropAnalysisModule(deps: SeasonalCropAnalysisModuleDeps) {
  const repository = deps.repository ?? getSharedSeasonalAnalysisRepository();
  const orchestrator = new SeasonalAnalysisOrchestratorService(repository, {
    parcelQueryService: deps.parcelQueryService,
    climateProfileService: deps.climateProfileService,
    soilProfileService: deps.soilProfileService,
    terrainProfileService: deps.terrainProfileService,
    physicalSuitabilityFacade: deps.physicalSuitabilityFacade,
    cropRecommendationService: deps.cropRecommendationService,
  });
  const service = new SeasonalCropAnalysisService(orchestrator);
  const controller = new SeasonalCropAnalysisController(service);
  const router = createSeasonalCropAnalysisRouter(controller);

  return {
    router,
    repository,
    orchestrator,
    service,
    controller,
  };
}

export { SeasonalAnalysisOrchestratorService } from './services/seasonal-analysis-orchestrator.service.js';
export { SeasonalCropAnalysisService } from './services/seasonal-crop-analysis.service.js';
export type { SeasonalAnalysisRepository } from './repositories/seasonal-analysis.repository.js';
export * from './types/seasonal-crop-analysis.types.js';
