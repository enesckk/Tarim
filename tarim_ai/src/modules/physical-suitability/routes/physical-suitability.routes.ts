import { Router } from 'express';
import type { PhysicalSuitabilityController } from '../controllers/physical-suitability.controller.js';

export function createPhysicalSuitabilityRouter(
  controller: PhysicalSuitabilityController,
): Router {
  const router = Router();

  router.get('/crops', controller.listCrops);
  router.get('/crops/:cropId', controller.getCrop);
  router.post('/crops/:cropId/validate', controller.validateCrop);
  router.get('/crops/:cropId/decision-matrix', controller.getDecisionMatrix);

  router.get('/production-scenarios', controller.listScenarios);
  router.get('/criteria', controller.listCriteria);

  router.post('/rules', controller.addRule);
  router.patch('/rules/:ruleId', controller.updateRule);
  router.post('/rules/:ruleId/deactivate', controller.deactivateRule);

  router.get('/source-references', controller.listSourceReferences);
  router.post('/source-references', controller.addSourceReference);

  router.post('/evaluate/critical-barrier', controller.evaluateBarrier);
  router.post('/evaluate/missing-data', controller.evaluateMissingData);
  router.post('/evaluate/data-source', controller.resolveDataSource);

  // Crop Knowledge Base — Phase 2.1 (General Information first)
  router.get('/crop-knowledge', controller.listCropKnowledge);
  router.get('/crop-knowledge/code/:cropCode', controller.getCropKnowledgeByCode);
  router.get('/crop-knowledge/:cropKnowledgeId', controller.getCropKnowledge);
  router.get('/general-information', controller.listGeneralInformation);
  router.get('/general-information/code/:cropCode', controller.getGeneralInformationByCode);
  router.get('/crop-knowledge/:cropKnowledgeId/general-information', controller.getGeneralInformation);
  router.put(
    '/crop-knowledge/:cropKnowledgeId/general-information',
    controller.upsertGeneralInformation,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/general-information/validate',
    controller.validateGeneralInformation,
  );

  // Phenology Engine — Phase 2.1B (CropGrowthStage CRUD)
  router.get('/phenology/code/:cropCode', controller.getPhenologyByCode);
  router.get('/crop-knowledge/:cropKnowledgeId/phenology', controller.getPhenology);
  router.get(
    '/crop-knowledge/:cropKnowledgeId/growth-stages',
    controller.listGrowthStages,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/growth-stages/:stageId',
    controller.getGrowthStageDetails,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/growth-stages',
    controller.createGrowthStage,
  );
  router.put(
    '/crop-knowledge/:cropKnowledgeId/growth-stages/:stageId',
    controller.updateGrowthStage,
  );
  router.delete(
    '/crop-knowledge/:cropKnowledgeId/growth-stages/:stageId',
    controller.deleteGrowthStage,
  );

  // Legacy aliases
  router.get(
    '/crop-knowledge/:cropKnowledgeId/phenology/stages',
    controller.listPhenologyStages,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/phenology/stages/:stageCode',
    controller.getPhenologyStage,
  );
  router.put(
    '/crop-knowledge/:cropKnowledgeId/phenology/stages',
    controller.upsertPhenologyStage,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/phenology/validate',
    controller.validatePhenology,
  );

  // Climate Requirements — Phase 2.1C
  router.get('/climate-requirements/code/:cropCode', controller.getClimateRequirementsByCode);
  router.get(
    '/crop-knowledge/:cropKnowledgeId/climate-requirements',
    controller.getClimateRequirements,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/climate-requirements/factors',
    controller.listClimateRequirements,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/climate-requirements/factors/:climateFactor',
    controller.getClimateRequirementByFactor,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/climate-requirements/:requirementId',
    controller.getClimateRequirementDetails,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/climate-requirements',
    controller.createClimateRequirement,
  );
  router.put(
    '/crop-knowledge/:cropKnowledgeId/climate-requirements/:requirementId',
    controller.updateClimateRequirement,
  );
  router.delete(
    '/crop-knowledge/:cropKnowledgeId/climate-requirements/:requirementId',
    controller.deleteClimateRequirement,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/climate-requirements/validate',
    controller.validateClimateRequirements,
  );

  // Soil Requirements — Phase 2.1D
  router.get('/soil-requirements/code/:cropCode', controller.getSoilRequirementsByCode);
  router.get(
    '/crop-knowledge/:cropKnowledgeId/soil-requirements',
    controller.getSoilRequirements,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/soil-requirements/factors',
    controller.listSoilRequirements,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/soil-requirements/factors/:soilFactor',
    controller.getSoilRequirementByFactor,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/soil-requirements/:requirementId',
    controller.getSoilRequirementDetails,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/soil-requirements',
    controller.createSoilRequirement,
  );
  router.put(
    '/crop-knowledge/:cropKnowledgeId/soil-requirements/:requirementId',
    controller.updateSoilRequirement,
  );
  router.delete(
    '/crop-knowledge/:cropKnowledgeId/soil-requirements/:requirementId',
    controller.deleteSoilRequirement,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/soil-requirements/validate',
    controller.validateSoilRequirements,
  );

  // Water Requirements — Phase 2.1E
  router.get('/water-requirements/code/:cropCode', controller.getWaterRequirementsByCode);
  router.get(
    '/crop-knowledge/:cropKnowledgeId/water-requirements',
    controller.getWaterRequirements,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/water-requirements/factors',
    controller.listWaterRequirements,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/water-requirements/factors/:waterFactor',
    controller.getWaterRequirementByFactor,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/water-requirements/:requirementId',
    controller.getWaterRequirementDetails,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/water-requirements',
    controller.createWaterRequirement,
  );
  router.put(
    '/crop-knowledge/:cropKnowledgeId/water-requirements/:requirementId',
    controller.updateWaterRequirement,
  );
  router.delete(
    '/crop-knowledge/:cropKnowledgeId/water-requirements/:requirementId',
    controller.deleteWaterRequirement,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/water-requirements/validate',
    controller.validateWaterRequirements,
  );

  // Terrain Requirements — Phase 2.1F
  router.get('/terrain-requirements/code/:cropCode', controller.getTerrainRequirementsByCode);
  router.get(
    '/crop-knowledge/:cropKnowledgeId/terrain-requirements',
    controller.getTerrainRequirements,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/terrain-requirements/factors',
    controller.listTerrainRequirements,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/terrain-requirements/factors/:terrainFactor',
    controller.getTerrainRequirementByFactor,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/terrain-requirements/:requirementId',
    controller.getTerrainRequirementDetails,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/terrain-requirements',
    controller.createTerrainRequirement,
  );
  router.put(
    '/crop-knowledge/:cropKnowledgeId/terrain-requirements/:requirementId',
    controller.updateTerrainRequirement,
  );
  router.delete(
    '/crop-knowledge/:cropKnowledgeId/terrain-requirements/:requirementId',
    controller.deleteTerrainRequirement,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/terrain-requirements/validate',
    controller.validateTerrainRequirements,
  );

  // Risk Profile — Phase 2.1G
  router.get('/risk-profile/code/:cropCode', controller.getRiskProfileByCode);
  router.get('/crop-knowledge/:cropKnowledgeId/risk-profile', controller.getRiskProfile);
  router.get('/crop-knowledge/:cropKnowledgeId/risk-profile/risks', controller.listCropRisks);
  router.get(
    '/crop-knowledge/:cropKnowledgeId/risk-profile/risks/:riskType',
    controller.getCropRiskByType,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/risk-profile/:riskId',
    controller.getCropRiskDetails,
  );
  router.post('/crop-knowledge/:cropKnowledgeId/risk-profile/risks', controller.createCropRisk);
  router.put(
    '/crop-knowledge/:cropKnowledgeId/risk-profile/:riskId',
    controller.updateCropRisk,
  );
  router.delete(
    '/crop-knowledge/:cropKnowledgeId/risk-profile/:riskId',
    controller.deleteCropRisk,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/risk-profile/validate',
    controller.validateRiskProfile,
  );

  // Production Calendar — Phase 2.1H
  router.get('/production-calendar/code/:cropCode', controller.getProductionCalendarByCode);
  router.get(
    '/crop-knowledge/:cropKnowledgeId/production-calendar',
    controller.getProductionCalendar,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/production-calendar/regions',
    controller.listProductionCalendars,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/production-calendar/regions/:regionId',
    controller.getProductionCalendarByRegion,
  );
  router.get(
    '/crop-knowledge/:cropKnowledgeId/production-calendar/:calendarId',
    controller.getProductionCalendarDetails,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/production-calendar/regions',
    controller.createProductionCalendar,
  );
  router.put(
    '/crop-knowledge/:cropKnowledgeId/production-calendar/:calendarId',
    controller.updateProductionCalendar,
  );
  router.delete(
    '/crop-knowledge/:cropKnowledgeId/production-calendar/:calendarId',
    controller.deleteProductionCalendar,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/production-calendar/validate',
    controller.validateProductionCalendar,
  );

  // Scientific Reference Library — Phase 2.1I
  router.get('/scientific-references', controller.listScientificReferences);
  router.post('/scientific-references', controller.createScientificReference);
  router.get('/scientific-references/:referenceId', controller.getScientificReferenceDetails);
  router.put('/scientific-references/:referenceId', controller.updateScientificReference);
  router.delete('/scientific-references/:referenceId', controller.deleteScientificReference);
  router.post(
    '/scientific-references/:referenceId/validate',
    controller.validateScientificReference,
  );

  router.get('/references/code/:cropCode', controller.getCropReferencesByCode);
  router.get('/crop-knowledge/:cropKnowledgeId/references', controller.getCropReferences);
  router.get(
    '/crop-knowledge/:cropKnowledgeId/references/items',
    controller.listCropScientificReferences,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/references/link',
    controller.linkScientificReference,
  );
  router.delete(
    '/crop-knowledge/:cropKnowledgeId/references/:referenceId',
    controller.unlinkScientificReference,
  );
  router.post(
    '/crop-knowledge/:cropKnowledgeId/references/validate',
    controller.validateCropScientificReferences,
  );

  // Soil Laboratory — Phase 2.2A
  router.get('/laboratories', controller.listLaboratories);
  router.post('/laboratories', controller.createLaboratory);
  router.get('/laboratories/:laboratoryId', controller.getLaboratory);
  router.put('/laboratories/:laboratoryId', controller.updateLaboratory);
  router.delete('/laboratories/:laboratoryId', controller.deleteLaboratory);

  router.get('/analysis-methods', controller.listAnalysisMethods);
  router.post('/analysis-methods', controller.createAnalysisMethod);
  router.get('/analysis-methods/:methodId', controller.getAnalysisMethod);
  router.put('/analysis-methods/:methodId', controller.updateAnalysisMethod);
  router.delete('/analysis-methods/:methodId', controller.deleteAnalysisMethod);

  router.get('/soil-samples', controller.listSoilSamples);
  router.post('/soil-samples', controller.createSoilSample);
  router.get('/soil-samples/parcel/:parcelId', controller.listSoilSamplesByParcel);
  router.get('/soil-samples/:sampleId', controller.getSoilSample);
  router.put('/soil-samples/:sampleId', controller.updateSoilSample);
  router.delete('/soil-samples/:sampleId', controller.deleteSoilSample);
  router.post('/soil-samples/:sampleId/validate', controller.validateSoilSample);
  router.get('/soil-analyses/:sampleId', controller.getSoilAnalysis);

  router.get('/soil-samples/:sampleId/results', controller.listSoilAnalysisResults);
  router.post('/soil-samples/:sampleId/results', controller.createSoilAnalysisResult);
  router.get('/soil-analysis-results/:resultId', controller.getSoilAnalysisResult);
  router.put('/soil-analysis-results/:resultId', controller.updateSoilAnalysisResult);
  router.delete('/soil-analysis-results/:resultId', controller.deleteSoilAnalysisResult);

  return router;
}
