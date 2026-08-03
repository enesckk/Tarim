import { Router } from 'express';
import type { PhysicalSuitabilityController } from '../controllers/physical-suitability.controller.js';

/**
 * Phase 2.2C/D/E catalog + report + import routes — mounted under /api (see app.ts).
 */
export function createSoilCatalogRouter(controller: PhysicalSuitabilityController): Router {
  const router = Router();

  router.get('/soil-parameters', controller.listSoilParameters);
  router.post('/soil-parameters', controller.createSoilParameter);
  router.get('/soil-parameters/code/:code', controller.getSoilParameterByCode);
  router.get('/soil-parameters/:parameterId', controller.getSoilParameter);
  router.put('/soil-parameters/:parameterId', controller.updateSoilParameter);
  router.delete('/soil-parameters/:parameterId', controller.deleteSoilParameter);

  router.get('/soil-units', controller.listSoilUnits);
  router.post('/soil-units/convert', controller.convertSoilUnit);

  router.get('/soil-parameter-aliases', controller.listSoilParameterAliases);
  router.post('/soil-parameter-aliases', controller.createSoilParameterAlias);
  router.put('/soil-parameter-aliases/:aliasId', controller.updateSoilParameterAlias);

  router.post('/soil-analysis-results/normalize', controller.normalizeSoilAnalysisResult);
  router.post('/soil-analysis-results/validate', controller.validateSoilAnalysisResultPayload);

  // Laboratory Report Management — Phase 2.2D
  router.get('/laboratory-reports', controller.listLaboratoryReports);
  router.post('/laboratory-reports', controller.createLaboratoryReport);
  router.post('/laboratory-reports/upload', controller.uploadLaboratoryReport);
  router.get('/laboratory-reports/:reportId/attachments', controller.listLaboratoryReportAttachments);
  router.get('/laboratory-reports/:reportId', controller.getLaboratoryReport);
  router.put('/laboratory-reports/:reportId', controller.updateLaboratoryReport);
  router.delete('/laboratory-reports/:reportId', controller.deleteLaboratoryReport);

  // Laboratory Import Engine — Phase 2.2E
  router.get('/laboratory-imports', controller.listLaboratoryImportSessions);
  router.post('/laboratory-imports/upload', controller.uploadLaboratoryImport);
  router.post('/laboratory-imports/mappings', controller.createLaboratoryImportMapping);
  router.get('/laboratory-imports/:sessionId', controller.getLaboratoryImport);
  router.post('/laboratory-imports/:sessionId/validate', controller.validateLaboratoryImport);
  router.post('/laboratory-imports/:sessionId/preview', controller.previewLaboratoryImport);
  router.post('/laboratory-imports/:sessionId/import', controller.commitLaboratoryImport);
  router.get(
    '/laboratory-imports/:sessionId/validations',
    controller.listLaboratoryImportValidations,
  );

  // Soil Sampling Management — Phase 2.2F
  router.get('/sampling-campaigns', controller.listSamplingCampaigns);
  router.post('/sampling-campaigns', controller.createSamplingCampaign);
  router.get('/sampling-campaigns/:campaignId', controller.getSamplingCampaign);
  router.put('/sampling-campaigns/:campaignId', controller.updateSamplingCampaign);
  router.delete('/sampling-campaigns/:campaignId', controller.deleteSamplingCampaign);

  router.get('/sampling-points', controller.listSamplingPoints);
  router.post('/sampling-points', controller.createSamplingPoint);
  router.get('/sampling-points/:pointId', controller.getSamplingPoint);
  router.put('/sampling-points/:pointId', controller.updateSamplingPoint);
  router.delete('/sampling-points/:pointId', controller.deleteSamplingPoint);

  router.get('/sampling-samples', controller.listSamplingSamples);
  router.post('/sampling-samples', controller.createSamplingSample);
  router.get('/sampling-samples/:sampleId', controller.getSamplingSample);
  router.put('/sampling-samples/:sampleId', controller.updateSamplingSample);
  router.delete('/sampling-samples/:sampleId', controller.deleteSamplingSample);
  router.get('/sampling-samples/:sampleId/chain-of-custody', controller.listChainOfCustody);

  router.get('/sampling-observations', controller.listSamplingObservations);
  router.post('/sampling-observations', controller.createSamplingObservation);
  router.get('/sampling-observations/:observationId', controller.getSamplingObservation);
  router.put('/sampling-observations/:observationId', controller.updateSamplingObservation);
  router.delete('/sampling-observations/:observationId', controller.deleteSamplingObservation);

  router.get('/sampling-chain-of-custody', controller.listChainOfCustody);
  router.post('/sampling-chain-of-custody', controller.createChainOfCustody);
  router.get('/sampling-chain-of-custody/:custodyId', controller.getChainOfCustody);
  router.put('/sampling-chain-of-custody/:custodyId', controller.updateChainOfCustody);
  router.delete('/sampling-chain-of-custody/:custodyId', controller.deleteChainOfCustody);

  // Irrigation Water Laboratory — Phase 2.2G
  router.get('/water-sources', controller.listWaterSources);
  router.post('/water-sources', controller.createWaterSource);
  router.get('/water-sources/:id', controller.getWaterSource);
  router.put('/water-sources/:id', controller.updateWaterSource);
  router.delete('/water-sources/:id', controller.deleteWaterSource);
  router.get('/parcels/:parcelId/water-sources', controller.listWaterSources);

  router.get('/water-samples', controller.listWaterSamples);
  router.post('/water-samples', controller.createWaterSample);
  router.get('/water-samples/:id', controller.getWaterSample);
  router.put('/water-samples/:id', controller.updateWaterSample);
  router.post('/water-samples/:id/status', controller.updateWaterSampleStatus);
  router.get('/water-samples/:sampleId/results', controller.listWaterAnalysisResults);
  router.post('/water-samples/:sampleId/calculate-indicators', controller.calculateWaterIndicators);
  router.get('/water-samples/:sampleId/derived-indicators', controller.listWaterDerivedIndicators);
  router.get('/water-samples/:sampleId/chain-of-custody', controller.listWaterChainOfCustody);
  router.post('/water-samples/:sampleId/chain-of-custody', controller.createWaterChainOfCustody);

  router.get('/water-parameters', controller.listWaterParameters);
  router.post('/water-parameters', controller.createWaterParameter);
  router.get('/water-parameters/code/:code', controller.getWaterParameterByCode);
  router.get('/water-parameters/:id', controller.getWaterParameter);
  router.put('/water-parameters/:id', controller.updateWaterParameter);

  router.post('/water-analysis-results', controller.createWaterAnalysisResult);
  router.put('/water-analysis-results/:id', controller.updateWaterAnalysisResult);
  router.post('/water-analysis-results/normalize', controller.normalizeWaterAnalysisResult);
  router.post('/water-analysis-results/validate', controller.validateWaterAnalysisResult);

  // Field Observation — Phase 2.2H
  // NOTE: /api/field-surveys is owned by legacy field-survey module (app.ts).
  // Phase 2.2H surveys use /api/field-observation-surveys to avoid collision.
  router.get('/field-observation-surveys', controller.listFieldSurveys);
  router.post('/field-observation-surveys', controller.createFieldSurvey);
  router.get('/field-observation-surveys/:id', controller.getFieldSurvey);
  router.put('/field-observation-surveys/:id', controller.updateFieldSurvey);
  router.post('/field-observation-surveys/:id/start', controller.startFieldSurvey);
  router.post('/field-observation-surveys/:id/complete', controller.completeFieldSurvey);
  router.post('/field-observation-surveys/:id/submit-review', controller.submitFieldSurveyReview);
  router.get('/parcels/:parcelId/field-observation-surveys', controller.listFieldSurveys);

  router.get('/field-observation-surveys/:surveyId/points', controller.listFieldObservationPoints);
  router.post('/field-observation-surveys/:surveyId/points', controller.createFieldObservationPoint);
  router.put('/field-observation-points/:id', controller.updateFieldObservationPoint);
  router.delete('/field-observation-points/:id', controller.deleteFieldObservationPoint);

  router.get('/field-parameters', controller.listFieldParameters);
  router.post('/field-parameters', controller.createFieldParameter);
  router.get('/field-parameters/code/:code', controller.getFieldParameterByCode);
  router.get('/field-parameters/:id', controller.getFieldParameter);
  router.put('/field-parameters/:id', controller.updateFieldParameter);

  router.get('/field-observation-surveys/:surveyId/results', controller.listFieldObservationResults);
  router.post('/field-observation-results', controller.createFieldObservationResult);
  router.put('/field-observation-results/:id', controller.updateFieldObservationResult);
  router.delete('/field-observation-results/:id', controller.deleteFieldObservationResult);
  router.post('/field-observation-results/:id/verify', controller.verifyFieldObservationResult);
  router.post('/field-observation-results/:id/reject', controller.rejectFieldObservationResult);

  router.post('/field-evidence/upload', controller.uploadFieldEvidence);
  router.get('/field-observation-surveys/:surveyId/evidence', controller.listFieldEvidence);
  router.delete('/field-evidence/:id', controller.deleteFieldEvidence);

  router.get('/field-measurement-devices', controller.listFieldMeasurementDevices);
  router.post('/field-measurement-devices', controller.createFieldMeasurementDevice);
  router.put('/field-measurement-devices/:id', controller.updateFieldMeasurementDevice);
  router.post('/field-device-measurements', controller.createFieldDeviceMeasurement);

  router.get('/field-observation-surveys/:surveyId/review', controller.getFieldSurveyReview);
  router.post('/field-observation-surveys/:surveyId/review', controller.createFieldSurveyReviewRecord);
  router.post('/field-observation-surveys/:surveyId/approve', controller.approveFieldSurvey);
  router.post(
    '/field-observation-surveys/:surveyId/request-revision',
    controller.requestFieldSurveyRevision,
  );
  router.post('/field-observation-surveys/:surveyId/reject', controller.rejectFieldSurvey);

  // Phase 2.3A AgroClimate Indicators Engine
  router.get('/agroclimate/indicators', controller.listAgroClimateIndicators);
  router.get('/agroclimate/indicators/code/:code', controller.getAgroClimateIndicatorByCode);
  router.get('/agroclimate/indicators/:id', controller.getAgroClimateIndicator);

  router.get('/agroclimate/configurations', controller.listAgroClimateConfigurations);
  router.post('/agroclimate/configurations', controller.createAgroClimateConfiguration);
  router.put('/agroclimate/configurations/:id', controller.updateAgroClimateConfiguration);
  router.delete('/agroclimate/configurations/:id', controller.deleteAgroClimateConfiguration);

  router.post('/agroclimate/analyses', controller.createAgroClimateAnalysis);
  router.get('/agroclimate/analyses/:id', controller.getAgroClimateAnalysis);
  router.get('/parcels/:parcelId/agroclimate-analyses', controller.listAgroClimateAnalyses);
  router.post('/agroclimate/analyses/:id/validate', controller.validateAgroClimateAnalysis);
  router.post('/agroclimate/analyses/:id/calculate', controller.calculateAgroClimateAnalysis);
  router.post('/agroclimate/analyses/:id/recalculate', controller.recalculateAgroClimateAnalysis);

  router.get('/agroclimate/analyses/:id/results', controller.listAgroClimateResults);
  router.get('/parcels/:parcelId/agroclimate-indicators', controller.listParcelAgroClimateIndicators);
  router.get('/parcels/:parcelId/agroclimate-indicators/:indicatorCode', controller.listParcelAgroClimateIndicators);

  router.post('/agroclimate/source-comparisons', controller.createClimateSourceComparison);
  router.get('/parcels/:parcelId/climate-source-comparisons', controller.listClimateSourceComparisons);

  router.get('/agroclimate/data-sources', controller.listClimateDataSources);
  router.post('/agroclimate/data-sources', controller.createClimateDataSource);
  router.get('/agroclimate/observations', controller.listClimateObservations);
  router.post('/agroclimate/observations', controller.createClimateObservation);
  router.get('/parcels/:parcelId/climate-observations', controller.listClimateObservations);

  return router;
}
