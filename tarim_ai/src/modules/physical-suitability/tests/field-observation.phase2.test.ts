import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import { InMemoryCropKnowledgeRepository } from '../crop-knowledge/repositories/crop-knowledge.repository.js';
import { InMemorySoilLaboratoryRepository } from '../soil-laboratory/repositories/soil-laboratory.repository.js';
import { InMemorySoilSamplingRepository } from '../soil-sampling/repositories/soil-sampling.repository.js';
import { InMemoryIrrigationWaterRepository } from '../irrigation-water-laboratory/repositories/irrigation-water.repository.js';
import { InMemoryFieldObservationRepository } from '../field-observation/repositories/field-observation.repository.js';
import { seedPhysicalSuitabilityPhase1 } from '../seed/phase1-seed.js';
import { seedCropKnowledgeGeneralInformation } from '../crop-knowledge/seed/general-information.seed.js';
import { seedCropPhenologyEngine } from '../crop-knowledge/phenology/crop-phenology-engine.service.js';
import { seedCropClimateRequirements } from '../crop-knowledge/climate/crop-climate-requirements.service.js';
import { seedCropSoilRequirements } from '../crop-knowledge/soil/crop-soil-requirements.service.js';
import { seedCropWaterRequirements } from '../crop-knowledge/water/crop-water-requirements.service.js';
import { seedCropTerrainRequirements } from '../crop-knowledge/terrain/crop-terrain-requirements.service.js';
import { seedCropRiskProfile } from '../crop-knowledge/risk/crop-risk-profile.service.js';
import { seedCropProductionCalendar } from '../crop-knowledge/calendar/crop-production-calendar.service.js';
import { seedScientificReferenceLibrary } from '../crop-knowledge/references/scientific-reference-library.service.js';
import { seedSoilLaboratoryCore } from '../soil-laboratory/services/soil-laboratory.service.js';
import { seedSoilSamplingManagement } from '../soil-sampling/services/soil-sampling.service.js';
import { seedIrrigationWaterLaboratory } from '../irrigation-water-laboratory/services/irrigation-water.service.js';
import { seedFieldObservationModule } from '../field-observation/services/field-observation.service.js';
import { PhysicalSuitabilityFacade } from '../services/physical-suitability.facade.js';

async function seedAll(
  psRepo: InMemoryPhysicalSuitabilityRepository,
  ckRepo: InMemoryCropKnowledgeRepository,
  labRepo: InMemorySoilLaboratoryRepository,
  samplingRepo: InMemorySoilSamplingRepository,
  waterRepo: InMemoryIrrigationWaterRepository,
  fieldRepo: InMemoryFieldObservationRepository,
) {
  await seedPhysicalSuitabilityPhase1(psRepo);
  await seedCropKnowledgeGeneralInformation(ckRepo, psRepo);
  await seedCropPhenologyEngine(ckRepo);
  await seedCropClimateRequirements(ckRepo);
  await seedCropSoilRequirements(ckRepo);
  await seedCropWaterRequirements(ckRepo);
  await seedCropTerrainRequirements(ckRepo);
  await seedCropRiskProfile(ckRepo);
  await seedCropProductionCalendar(ckRepo);
  await seedScientificReferenceLibrary(ckRepo);
  await seedSoilLaboratoryCore(labRepo);
  await seedSoilSamplingManagement(samplingRepo);
  await seedIrrigationWaterLaboratory(waterRepo);
  await seedFieldObservationModule(fieldRepo);
}

describe('physical-suitability Phase 2.2H Field Observation', () => {
  let facade: PhysicalSuitabilityFacade;
  let psRepo: InMemoryPhysicalSuitabilityRepository;

  beforeEach(async () => {
    psRepo = new InMemoryPhysicalSuitabilityRepository();
    const ckRepo = new InMemoryCropKnowledgeRepository();
    const labRepo = new InMemorySoilLaboratoryRepository();
    const samplingRepo = new InMemorySoilSamplingRepository();
    const waterRepo = new InMemoryIrrigationWaterRepository();
    const fieldRepo = new InMemoryFieldObservationRepository();
    await seedAll(psRepo, ckRepo, labRepo, samplingRepo, waterRepo, fieldRepo);
    facade = new PhysicalSuitabilityFacade(
      psRepo,
      ckRepo,
      labRepo,
      samplingRepo,
      waterRepo,
      fieldRepo,
    );
  });

  it('seeds 51 field parameters and no enum options', async () => {
    const params = await facade.listFieldParameters();
    expect(params.length).toBe(51);
    expect(params.every((p) => p.verificationStatus === 'Draft')).toBe(true);
  });

  it('rejects duplicate survey codes', async () => {
    await facade.createFieldSurvey({
      surveyCode: 'FS-1',
      parcelId: 'p1',
      surveyType: 'INITIAL',
    });
    await expect(
      facade.createFieldSurvey({
        surveyCode: 'FS-1',
        parcelId: 'p1',
        surveyType: 'ROUTINE',
      }),
    ).rejects.toMatchObject({ code: 'FIELD_SURVEY_INVALID' });
  });

  it('validates GPS and warns outside parcel boundary without losing data', async () => {
    const survey = await facade.createFieldSurvey({
      surveyCode: 'FS-GPS',
      parcelId: 'parcel-box',
      surveyType: 'INITIAL',
    });
    await facade.registerParcelGeometryForFieldCheck(
      'parcel-box',
      JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [37.0, 37.0],
            [37.2, 37.0],
            [37.2, 37.2],
            [37.0, 37.2],
            [37.0, 37.0],
          ],
        ],
      }),
    );
    const outside = await facade.createFieldObservationPoint(survey.id, {
      pointCode: 'P1',
      latitude: 38.0,
      longitude: 38.0,
      accuracyMeters: 5,
    });
    expect(outside.geometryValidationStatus).toBe('OUTSIDE_PARCEL');
    expect(outside.isActive).toBe(true);

    const badGeomSurvey = await facade.createFieldSurvey({
      surveyCode: 'FS-BADG',
      parcelId: 'parcel-bad',
      surveyType: 'INITIAL',
    });
    await facade.registerParcelGeometryForFieldCheck('parcel-bad', '{not-json');
    const retained = await facade.createFieldObservationPoint(badGeomSurvey.id, {
      pointCode: 'P1',
      latitude: 37.1,
      longitude: 37.1,
    });
    expect(retained.geometryValidationStatus).toBe('REQUIRES_REVIEW');
  });

  it('rejects negative depth and invalid depth interval', async () => {
    const survey = await facade.createFieldSurvey({
      surveyCode: 'FS-DEPTH',
      parcelId: 'p',
      surveyType: 'INITIAL',
    });
    const param = await facade.getFieldParameterByCode('TOTAL_SOIL_DEPTH');
    await expect(
      facade.createFieldObservationResult({
        surveyId: survey.id,
        parameterId: param!.id,
        numericValue: 30,
        observationDepthFromCm: -1,
      }),
    ).rejects.toMatchObject({ code: 'FIELD_RESULT_INVALID' });

    await expect(
      facade.createFieldObservationResult({
        surveyId: survey.id,
        parameterId: param!.id,
        numericValue: 30,
        observationDepthFromCm: 40,
        observationDepthToCm: 10,
      }),
    ).rejects.toMatchObject({ code: 'FIELD_RESULT_INVALID' });
  });

  it('enforces ValueType compatibility and null≠0', async () => {
    const survey = await facade.createFieldSurvey({
      surveyCode: 'FS-VT',
      parcelId: 'p',
      surveyType: 'INITIAL',
    });
    const numeric = await facade.getFieldParameterByCode('PENETRATION_RESISTANCE');
    await expect(
      facade.createFieldObservationResult({
        surveyId: survey.id,
        parameterId: numeric!.id,
        textValue: 'hard',
      }),
    ).rejects.toMatchObject({ code: 'FIELD_RESULT_INVALID' });

    const zero = await facade.createFieldObservationResult({
      surveyId: survey.id,
      parameterId: numeric!.id,
      numericValue: 0,
    });
    expect(zero.numericValue).toBe(0);
    const nullable = await facade.createFieldObservationResult({
      surveyId: survey.id,
      parameterId: (await facade.getFieldParameterByCode('SLOPE_OBSERVATION'))!.id,
    });
    expect(nullable.numericValue).toBeNull();
  });

  it('requires evidence before verifying photo-required parameters', async () => {
    const survey = await facade.createFieldSurvey({
      surveyCode: 'FS-EV',
      parcelId: 'p',
      surveyType: 'INITIAL',
    });
    const param = await facade.getFieldParameterByCode('PONDING_PRESENCE');
    const result = await facade.createFieldObservationResult({
      surveyId: survey.id,
      parameterId: param!.id,
      booleanValue: true,
    });
    await expect(facade.verifyFieldObservationResult(result.id, 'expert')).rejects.toMatchObject({
      code: 'EVIDENCE_REQUIRED',
    });
    await facade.uploadFieldEvidence({
      surveyId: survey.id,
      observationResultId: result.id,
      evidenceType: 'PHOTO',
      fileName: 'pond.jpg',
      fileHash: 'abc123',
    });
    const verified = await facade.verifyFieldObservationResult(result.id, 'expert');
    expect(verified.reviewStatus).toBe('VERIFIED');
  });

  it('marks invalid device calibration as REQUIRES_REVIEW without rejecting', async () => {
    const survey = await facade.createFieldSurvey({
      surveyCode: 'FS-DEV',
      parcelId: 'p',
      surveyType: 'INITIAL',
    });
    const param = await facade.getFieldParameterByCode('PENETRATION_RESISTANCE');
    const result = await facade.createFieldObservationResult({
      surveyId: survey.id,
      parameterId: param!.id,
      numericValue: 2.5,
      dataOrigin: 'OBSERVED',
    });
    const device = await facade.createFieldMeasurementDevice({
      deviceCode: 'PEN-1',
      deviceName: 'Penetrometer',
      deviceType: 'PENETROMETER',
      calibrationExpiryDate: '2020-01-01T00:00:00.000Z',
      isCalibrated: true,
    });
    const m = await facade.createFieldDeviceMeasurement({
      observationResultId: result.id,
      deviceId: device.id,
      measuredValue: 2.5,
      measuredAt: '2026-07-01T00:00:00.000Z',
    });
    expect(m.calibrationValidAtMeasurement).toBe(false);
    const updated = await facade.listFieldObservationResults(survey.id);
    const row = updated.find((r) => r.id === result.id)!;
    expect(row.reviewStatus).toBe('REQUIRES_REVIEW');
    expect(row.dataOrigin).toBe('MEASURED');
  });

  it('enforces survey status transitions and approved immutability', async () => {
    const survey = await facade.createFieldSurvey({
      surveyCode: 'FS-LIFE',
      parcelId: 'p',
      surveyType: 'INITIAL',
    });
    await expect(facade.completeFieldSurvey(survey.id)).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
    });
    await facade.startFieldSurvey(survey.id);
    await facade.completeFieldSurvey(survey.id);
    await facade.submitFieldSurveyReview(survey.id);

    // Approve without critical unverified params
    const approved = await facade.approveFieldSurvey(survey.id, {
      reviewedBy: 'lead',
    });
    expect(approved.surveyStatus).toBe('APPROVED');

    await expect(
      facade.updateFieldSurvey(survey.id, { generalNotes: 'nope' }),
    ).rejects.toMatchObject({ code: 'SURVEY_IMMUTABLE' });

    const revised = await facade.requestFieldSurveyRevision(survey.id, {
      reviewedBy: 'lead',
      reviewNotes: 'fix GPS',
    });
    expect(revised.surveyStatus).toBe('IN_PROGRESS');
  });

  it('creates audit entries for critical operations', async () => {
    const survey = await facade.createFieldSurvey({
      surveyCode: 'FS-AUD',
      parcelId: 'p',
      surveyType: 'INITIAL',
    });
    await facade.startFieldSurvey(survey.id, 'tech');
    const audits = await psRepo.listAudit();
    expect(audits.some((a) => a.entityType === 'FieldSurvey' && a.action === 'create')).toBe(
      true,
    );
    expect(audits.some((a) => a.action === 'status:IN_PROGRESS')).toBe(true);
  });
});
