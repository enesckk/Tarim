import type { ParcelQueryService } from '../parcel/services/parcel-query.service.js';
import type { TerrainProfileService } from '../terrain/services/terrain-profile.service.js';
import type { FieldSurveyService } from '../field-survey/services/field-survey.service.js';
import type { LandUsabilityService } from '../land-usability/services/land-usability.service.js';
import type { CropKnowledgeService } from '../crop-recommendation/services/crop-knowledge.service.js';
import type { CropRecommendationService } from '../crop-recommendation/services/crop-recommendation.service.js';
import type { CalibrationManagementService } from '../calibration-management/services/calibration-management.service.js';
import { CropPhysicalCompatibilityService } from './services/crop-physical-compatibility.service.js';
import { CropPhysicalCompatibilityController } from './controllers/crop-physical-compatibility.controller.js';
import { createCropPhysicalCompatibilityRouter } from './routes/crop-physical-compatibility.routes.js';

export function createCropPhysicalCompatibilityModule(deps: {
  parcelQueryService: ParcelQueryService;
  cropKnowledgeService: CropKnowledgeService;
  terrainProfileService?: TerrainProfileService | null;
  fieldSurveyService?: FieldSurveyService | null;
  landUsabilityService?: LandUsabilityService | null;
  cropRecommendationService?: CropRecommendationService | null;
  calibrationManagementService?: CalibrationManagementService | null;
}) {
  const service = new CropPhysicalCompatibilityService(
    deps.parcelQueryService,
    deps.cropKnowledgeService,
    deps.terrainProfileService ?? null,
    deps.fieldSurveyService ?? null,
    deps.landUsabilityService ?? null,
    deps.cropRecommendationService ?? null,
    deps.calibrationManagementService ?? null,
  );
  const controller = new CropPhysicalCompatibilityController(service);
  const router = createCropPhysicalCompatibilityRouter(controller);
  return { router, service, controller };
}
