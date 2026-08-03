import type { ParcelQueryService } from '../parcel/services/parcel-query.service.js';
import type { TerrainProfileService } from '../terrain/services/terrain-profile.service.js';
import type { ClimateProfileService } from '../environment/climate/services/climate-profile.service.js';
import type { SoilProfileService } from '../environment/soil/services/soil-profile.service.js';
import type { FieldSurveyService } from '../field-survey/services/field-survey.service.js';
import type { LandUsabilityService } from '../land-usability/services/land-usability.service.js';
import type { CropRecommendationService } from '../crop-recommendation/services/crop-recommendation.service.js';
import type { CropPhysicalCompatibilityService } from '../crop-physical-compatibility/services/crop-physical-compatibility.service.js';
import { getSharedAnalysisRepository } from '../database/persistence-factory.js';
import { AnalysisOrchestratorService } from './services/analysis-orchestrator.service.js';
import { createAnalysisRouter } from './routes/analysis.routes.js';
import { createDemoReadinessRouter } from './routes/demo-readiness.routes.js';

export interface AnalysisOrchestratorDeps {
  parcelQueryService: ParcelQueryService;
  terrainProfileService: TerrainProfileService | null;
  climateProfileService: ClimateProfileService | null;
  soilProfileService: SoilProfileService | null;
  fieldSurveyService: FieldSurveyService | null;
  landUsabilityService: LandUsabilityService | null;
  cropRecommendationService: CropRecommendationService | null;
  cropPhysicalCompatibilityService?: CropPhysicalCompatibilityService | null;
}

export function createAnalysisOrchestratorModule(deps: AnalysisOrchestratorDeps) {
  const repository = getSharedAnalysisRepository();
  const service = new AnalysisOrchestratorService(
    repository,
    deps.parcelQueryService,
    deps.terrainProfileService,
    deps.climateProfileService,
    deps.soilProfileService,
    deps.fieldSurveyService,
    deps.landUsabilityService,
    deps.cropRecommendationService,
    deps.cropPhysicalCompatibilityService ?? null,
  );

  return {
    service,
    analysisRouter: createAnalysisRouter(service),
    readinessRouter: createDemoReadinessRouter(),
  };
}

export { AnalysisOrchestratorService } from './services/analysis-orchestrator.service.js';
export type { AnalysisResultResponse } from './types/analysis.types.js';
