import { randomUUID } from 'node:crypto';
import { convertMeasurementValue } from '../../soil-laboratory/services/unit-conversion.engine.js';
import {
  buildWaterParameter,
  WATER_PARAMETER_SEED,
} from '../catalogs/water-parameter.catalog.js';
import {
  buildWaterMeasurementUnits,
  unitIdForCode,
} from '../catalogs/water-measurement-unit.catalog.js';
import type { IrrigationWaterRepository } from '../repositories/irrigation-water.repository.js';
import type {
  IrrigationWaterAnalysis,
  WaterAnalysisResult,
  WaterDerivedIndicator,
  WaterParameter,
  WaterSample,
  WaterSampleChainOfCustody,
  WaterSource,
} from '../types/irrigation-water.types.js';
import {
  calculateAllIndicators,
  outcomeToDerivedIndicator,
} from './water-derived-indicator.calculation.js';
import {
  IrrigationWaterValidationService,
  type CreateWaterAnalysisResultInput,
  type CreateWaterCustodyInput,
  type CreateWaterParameterInput,
  type CreateWaterSampleInput,
  type CreateWaterSourceInput,
  type NormalizeWaterAnalysisResultInput,
  type UpdateWaterAnalysisResultInput,
  type UpdateWaterParameterInput,
  type UpdateWaterSampleInput,
  type UpdateWaterSampleStatusInput,
  type UpdateWaterSourceInput,
} from './irrigation-water-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

function throwIfInvalid(issues: { severity: string }[], code: string, message: string) {
  const hard = issues.filter((i) => i.severity === 'error');
  if (hard.length > 0) throw httpError(422, code, message, { issues: hard });
}

/**
 * Phase 2.2G — Irrigation Water Laboratory.
 * Aggregate root: IrrigationWaterAnalysis.
 * No crop suitability, irrigation scheduling, AI, or automatic decisions.
 */
export class IrrigationWaterService {
  readonly validation: IrrigationWaterValidationService;

  constructor(private readonly repo: IrrigationWaterRepository) {
    this.validation = new IrrigationWaterValidationService(repo);
  }

  // ---- Water Source ----

  listWaterSources(parcelId?: string, activeOnly = true) {
    return this.repo.listWaterSources(parcelId, activeOnly);
  }

  getWaterSource(id: string) {
    return this.repo.getWaterSourceById(id);
  }

  getAggregate(sourceId: string): Promise<IrrigationWaterAnalysis | null> {
    return this.repo.getIrrigationWaterAnalysisAggregate(sourceId);
  }

  async createWaterSource(input: CreateWaterSourceInput): Promise<WaterSource> {
    const now = new Date().toISOString();
    const row: WaterSource = {
      id: newId(),
      parcelId: input.parcelId ?? null,
      sourceCode: input.sourceCode.trim(),
      sourceName: input.sourceName.trim(),
      sourceType: input.sourceType,
      ownershipType: input.ownershipType ?? 'UNKNOWN',
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      geometry: input.geometry ?? null,
      isInsideParcel: input.isInsideParcel ?? null,
      relatedParcelId: input.relatedParcelId ?? null,
      officialRegistrationNumber: input.officialRegistrationNumber ?? null,
      licenseNumber: input.licenseNumber ?? null,
      licenseStatus: input.licenseStatus ?? 'UNKNOWN',
      permitStartDate: input.permitStartDate ?? null,
      permitEndDate: input.permitEndDate ?? null,
      intendedUse: input.intendedUse ?? null,
      declaredDischarge: input.declaredDischarge ?? null,
      declaredDischargeUnit: input.declaredDischargeUnit ?? null,
      measuredDischarge: input.measuredDischarge ?? null,
      measuredDischargeUnit: input.measuredDischargeUnit ?? null,
      wellDepth: input.wellDepth ?? null,
      staticWaterLevel: input.staticWaterLevel ?? null,
      dynamicWaterLevel: input.dynamicWaterLevel ?? null,
      seasonalAvailability: input.seasonalAvailability ?? null,
      continuityStatus: input.continuityStatus ?? 'UNKNOWN',
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    const result = await this.validation.validateSourceCodeUnique(row);
    throwIfInvalid(result.issues, 'WATER_SOURCE_INVALID', 'Water source validation failed');
    return this.repo.upsertWaterSource(row);
  }

  async updateWaterSource(id: string, input: UpdateWaterSourceInput): Promise<WaterSource> {
    const existing = await this.repo.getWaterSourceById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'WATER_SOURCE_NOT_FOUND', 'Water source not found');
    }
    const next: WaterSource = {
      ...existing,
      parcelId: input.parcelId !== undefined ? input.parcelId : existing.parcelId,
      sourceCode: input.sourceCode !== undefined ? input.sourceCode.trim() : existing.sourceCode,
      sourceName: input.sourceName !== undefined ? input.sourceName.trim() : existing.sourceName,
      sourceType: input.sourceType ?? existing.sourceType,
      ownershipType: input.ownershipType ?? existing.ownershipType,
      latitude: input.latitude !== undefined ? input.latitude : existing.latitude,
      longitude: input.longitude !== undefined ? input.longitude : existing.longitude,
      geometry: input.geometry !== undefined ? input.geometry : existing.geometry,
      isInsideParcel:
        input.isInsideParcel !== undefined ? input.isInsideParcel : existing.isInsideParcel,
      relatedParcelId:
        input.relatedParcelId !== undefined ? input.relatedParcelId : existing.relatedParcelId,
      officialRegistrationNumber:
        input.officialRegistrationNumber !== undefined
          ? input.officialRegistrationNumber
          : existing.officialRegistrationNumber,
      licenseNumber:
        input.licenseNumber !== undefined ? input.licenseNumber : existing.licenseNumber,
      licenseStatus: input.licenseStatus ?? existing.licenseStatus,
      permitStartDate:
        input.permitStartDate !== undefined ? input.permitStartDate : existing.permitStartDate,
      permitEndDate:
        input.permitEndDate !== undefined ? input.permitEndDate : existing.permitEndDate,
      intendedUse: input.intendedUse !== undefined ? input.intendedUse : existing.intendedUse,
      declaredDischarge:
        input.declaredDischarge !== undefined
          ? input.declaredDischarge
          : existing.declaredDischarge,
      declaredDischargeUnit:
        input.declaredDischargeUnit !== undefined
          ? input.declaredDischargeUnit
          : existing.declaredDischargeUnit,
      measuredDischarge:
        input.measuredDischarge !== undefined
          ? input.measuredDischarge
          : existing.measuredDischarge,
      measuredDischargeUnit:
        input.measuredDischargeUnit !== undefined
          ? input.measuredDischargeUnit
          : existing.measuredDischargeUnit,
      wellDepth: input.wellDepth !== undefined ? input.wellDepth : existing.wellDepth,
      staticWaterLevel:
        input.staticWaterLevel !== undefined ? input.staticWaterLevel : existing.staticWaterLevel,
      dynamicWaterLevel:
        input.dynamicWaterLevel !== undefined
          ? input.dynamicWaterLevel
          : existing.dynamicWaterLevel,
      seasonalAvailability:
        input.seasonalAvailability !== undefined
          ? input.seasonalAvailability
          : existing.seasonalAvailability,
      continuityStatus: input.continuityStatus ?? existing.continuityStatus,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const result = await this.validation.validateSourceCodeUnique(next);
    throwIfInvalid(result.issues, 'WATER_SOURCE_INVALID', 'Water source validation failed');
    return this.repo.upsertWaterSource(next);
  }

  async deleteWaterSource(id: string): Promise<WaterSource> {
    const existing = await this.repo.getWaterSourceById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'WATER_SOURCE_NOT_FOUND', 'Water source not found');
    }
    const next: WaterSource = {
      ...existing,
      isActive: false,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    return this.repo.upsertWaterSource(next);
  }

  // ---- Water Sample ----

  listWaterSamples(waterSourceId?: string, activeOnly = true) {
    return this.repo.listWaterSamples(waterSourceId, activeOnly);
  }

  getWaterSample(id: string) {
    return this.repo.getWaterSampleById(id);
  }

  async createWaterSample(input: CreateWaterSampleInput): Promise<WaterSample> {
    const source = await this.repo.getWaterSourceById(input.waterSourceId);
    if (!source || !source.isActive) {
      throw httpError(404, 'WATER_SOURCE_NOT_FOUND', 'Water source not found');
    }
    const now = new Date().toISOString();
    const row: WaterSample = {
      id: newId(),
      waterSourceId: input.waterSourceId,
      sampleCode: input.sampleCode.trim(),
      samplingDate: input.samplingDate ?? null,
      samplingTime: input.samplingTime ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      sampledBy: input.sampledBy ?? null,
      samplingPointDescription: input.samplingPointDescription ?? null,
      samplingMethod: input.samplingMethod ?? null,
      containerType: input.containerType ?? null,
      preservationMethod: input.preservationMethod ?? null,
      transportCondition: input.transportCondition ?? null,
      receivedDate: input.receivedDate ?? null,
      laboratoryId: input.laboratoryId ?? null,
      laboratoryReportId: input.laboratoryReportId ?? null,
      waterTemperatureAtSampling: input.waterTemperatureAtSampling ?? null,
      weatherCondition: input.weatherCondition ?? null,
      currentStatus: input.currentStatus ?? 'PLANNED',
      barcode: input.barcode ?? null,
      qrCode: input.qrCode ?? null,
      sealNumber: input.sealNumber ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    const result = await this.validation.validateSampleCodeUnique(row);
    throwIfInvalid(result.issues, 'WATER_SAMPLE_INVALID', 'Water sample validation failed');
    return this.repo.upsertWaterSample(row);
  }

  async updateWaterSample(id: string, input: UpdateWaterSampleInput): Promise<WaterSample> {
    const existing = await this.repo.getWaterSampleById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'WATER_SAMPLE_NOT_FOUND', 'Water sample not found');
    }
    if (input.waterSourceId) {
      const source = await this.repo.getWaterSourceById(input.waterSourceId);
      if (!source || !source.isActive) {
        throw httpError(404, 'WATER_SOURCE_NOT_FOUND', 'Water source not found');
      }
    }
    const next: WaterSample = {
      ...existing,
      waterSourceId: input.waterSourceId ?? existing.waterSourceId,
      sampleCode: input.sampleCode !== undefined ? input.sampleCode.trim() : existing.sampleCode,
      samplingDate: input.samplingDate !== undefined ? input.samplingDate : existing.samplingDate,
      samplingTime: input.samplingTime !== undefined ? input.samplingTime : existing.samplingTime,
      latitude: input.latitude !== undefined ? input.latitude : existing.latitude,
      longitude: input.longitude !== undefined ? input.longitude : existing.longitude,
      sampledBy: input.sampledBy !== undefined ? input.sampledBy : existing.sampledBy,
      samplingPointDescription:
        input.samplingPointDescription !== undefined
          ? input.samplingPointDescription
          : existing.samplingPointDescription,
      samplingMethod:
        input.samplingMethod !== undefined ? input.samplingMethod : existing.samplingMethod,
      containerType:
        input.containerType !== undefined ? input.containerType : existing.containerType,
      preservationMethod:
        input.preservationMethod !== undefined
          ? input.preservationMethod
          : existing.preservationMethod,
      transportCondition:
        input.transportCondition !== undefined
          ? input.transportCondition
          : existing.transportCondition,
      receivedDate: input.receivedDate !== undefined ? input.receivedDate : existing.receivedDate,
      laboratoryId: input.laboratoryId !== undefined ? input.laboratoryId : existing.laboratoryId,
      laboratoryReportId:
        input.laboratoryReportId !== undefined
          ? input.laboratoryReportId
          : existing.laboratoryReportId,
      waterTemperatureAtSampling:
        input.waterTemperatureAtSampling !== undefined
          ? input.waterTemperatureAtSampling
          : existing.waterTemperatureAtSampling,
      weatherCondition:
        input.weatherCondition !== undefined ? input.weatherCondition : existing.weatherCondition,
      currentStatus: input.currentStatus ?? existing.currentStatus,
      barcode: input.barcode !== undefined ? input.barcode : existing.barcode,
      qrCode: input.qrCode !== undefined ? input.qrCode : existing.qrCode,
      sealNumber: input.sealNumber !== undefined ? input.sealNumber : existing.sealNumber,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const result = await this.validation.validateSampleCodeUnique(next);
    throwIfInvalid(result.issues, 'WATER_SAMPLE_INVALID', 'Water sample validation failed');
    return this.repo.upsertWaterSample(next);
  }

  async updateWaterSampleStatus(
    id: string,
    input: UpdateWaterSampleStatusInput,
  ): Promise<WaterSample> {
    return this.updateWaterSample(id, { currentStatus: input.currentStatus });
  }

  // ---- Parameters & units ----

  listWaterParameters(activeOnly = true) {
    return this.repo.listWaterParameters(activeOnly);
  }

  getWaterParameter(id: string) {
    return this.repo.getWaterParameterById(id);
  }

  getWaterParameterByCode(code: string) {
    return this.repo.getWaterParameterByCode(code);
  }

  listMeasurementUnits(activeOnly = true) {
    return this.repo.listMeasurementUnits(activeOnly);
  }

  async createWaterParameter(input: CreateWaterParameterInput): Promise<WaterParameter> {
    const existing = await this.repo.getWaterParameterByCode(input.code.trim());
    if (existing?.isActive) {
      throw httpError(409, 'WATER_PARAMETER_EXISTS', `Parameter code exists: ${input.code}`);
    }
    const now = new Date().toISOString();
    const isCalculated = input.isCalculated ?? false;
    const isDirectlyMeasured = input.isDirectlyMeasured ?? !isCalculated;
    const row: WaterParameter = {
      id: newId(),
      code: input.code.trim(),
      canonicalName: input.canonicalName.trim(),
      turkishDisplayName: input.turkishDisplayName.trim(),
      englishDisplayName: input.englishDisplayName.trim(),
      category: input.category,
      description: input.description ?? null,
      canonicalUnitId: input.canonicalUnitId ?? null,
      dataType: input.dataType ?? 'Decimal',
      decimalPrecision: input.decimalPrecision ?? null,
      isDirectlyMeasured,
      isCalculated,
      isRequiredForIrrigationAssessment: input.isRequiredForIrrigationAssessment ?? false,
      displayOrder: input.displayOrder ?? 1000,
      source: input.source ?? null,
      verificationStatus: input.verificationStatus ?? 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    throwIfInvalid(
      this.validation.validateParameterFlags(row),
      'WATER_PARAMETER_INVALID',
      'Water parameter validation failed',
    );
    if (row.canonicalUnitId) {
      const unit = await this.repo.getMeasurementUnitById(row.canonicalUnitId);
      if (!unit) {
        throw httpError(422, 'UNIT_NOT_FOUND', 'Canonical unit not found');
      }
    }
    return this.repo.upsertWaterParameter(row);
  }

  async updateWaterParameter(
    id: string,
    input: UpdateWaterParameterInput,
  ): Promise<WaterParameter> {
    const existing = await this.repo.getWaterParameterById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'WATER_PARAMETER_NOT_FOUND', 'Water parameter not found');
    }
    const next: WaterParameter = {
      ...existing,
      code: input.code !== undefined ? input.code.trim() : existing.code,
      canonicalName:
        input.canonicalName !== undefined ? input.canonicalName.trim() : existing.canonicalName,
      turkishDisplayName:
        input.turkishDisplayName !== undefined
          ? input.turkishDisplayName.trim()
          : existing.turkishDisplayName,
      englishDisplayName:
        input.englishDisplayName !== undefined
          ? input.englishDisplayName.trim()
          : existing.englishDisplayName,
      category: input.category ?? existing.category,
      description: input.description !== undefined ? input.description : existing.description,
      canonicalUnitId:
        input.canonicalUnitId !== undefined ? input.canonicalUnitId : existing.canonicalUnitId,
      dataType: input.dataType ?? existing.dataType,
      decimalPrecision:
        input.decimalPrecision !== undefined
          ? input.decimalPrecision
          : existing.decimalPrecision,
      isDirectlyMeasured: input.isDirectlyMeasured ?? existing.isDirectlyMeasured,
      isCalculated: input.isCalculated ?? existing.isCalculated,
      isRequiredForIrrigationAssessment:
        input.isRequiredForIrrigationAssessment ?? existing.isRequiredForIrrigationAssessment,
      displayOrder: input.displayOrder ?? existing.displayOrder,
      source: input.source !== undefined ? input.source : existing.source,
      verificationStatus: input.verificationStatus ?? existing.verificationStatus,
      isActive: input.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    throwIfInvalid(
      this.validation.validateParameterFlags(next),
      'WATER_PARAMETER_INVALID',
      'Water parameter validation failed',
    );
    return this.repo.upsertWaterParameter(next);
  }

  // ---- Analysis results ----

  listWaterAnalysisResults(sampleId: string, activeOnly = true) {
    return this.repo.listWaterAnalysisResults(sampleId, activeOnly);
  }

  async createWaterAnalysisResult(
    input: CreateWaterAnalysisResultInput,
  ): Promise<WaterAnalysisResult> {
    const sample = await this.repo.getWaterSampleById(input.sampleId);
    if (!sample || !sample.isActive) {
      throw httpError(404, 'WATER_SAMPLE_NOT_FOUND', 'Water sample not found');
    }
    const parameter = await this.repo.getWaterParameterById(input.parameterId);
    const now = new Date().toISOString();
    const row: WaterAnalysisResult = {
      id: newId(),
      sampleId: input.sampleId,
      parameterId: input.parameterId,
      rawParameterName: input.rawParameterName ?? null,
      rawValue: input.rawValue ?? null,
      rawUnit: input.rawUnit ?? null,
      measuredValue: input.measuredValue ?? null,
      measuredUnitId: input.measuredUnitId ?? null,
      normalizedValue: null,
      normalizedUnitId: null,
      analysisMethodId: input.analysisMethodId ?? null,
      detectionLimit: input.detectionLimit ?? null,
      measurementUncertainty: input.measurementUncertainty ?? null,
      qualityFlag: input.qualityFlag ?? null,
      isAccredited: input.isAccredited ?? null,
      source: input.source ?? 'LaboratoryReported',
      verificationStatus: input.verificationStatus ?? 'Draft',
      normalizationStatus: 'NOT_REQUIRED',
      normalizationMessage: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    const result = await this.validation.validateAnalysisResult(row, parameter);
    throwIfInvalid(result.issues, 'WATER_ANALYSIS_RESULT_INVALID', 'Analysis result invalid');

    if (parameter?.isCalculated && row.source === 'ManualMeasured') {
      throw httpError(
        422,
        'CALCULATED_AS_MEASURED',
        'Calculated parameters must not be entered as manual measurements; use laboratory-reported source or derived indicators',
      );
    }

    return this.repo.upsertWaterAnalysisResult(await this.applyNormalization(row, parameter));
  }

  async updateWaterAnalysisResult(
    id: string,
    input: UpdateWaterAnalysisResultInput,
  ): Promise<WaterAnalysisResult> {
    const existing = await this.repo.getWaterAnalysisResultById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'WATER_ANALYSIS_RESULT_NOT_FOUND', 'Analysis result not found');
    }
    const next: WaterAnalysisResult = {
      ...existing,
      sampleId: input.sampleId ?? existing.sampleId,
      parameterId: input.parameterId ?? existing.parameterId,
      rawParameterName:
        input.rawParameterName !== undefined ? input.rawParameterName : existing.rawParameterName,
      // Raw fields are preserved unless explicitly updated — never overwrite with normalized
      rawValue: input.rawValue !== undefined ? input.rawValue : existing.rawValue,
      rawUnit: input.rawUnit !== undefined ? input.rawUnit : existing.rawUnit,
      measuredValue: input.measuredValue !== undefined ? input.measuredValue : existing.measuredValue,
      measuredUnitId:
        input.measuredUnitId !== undefined ? input.measuredUnitId : existing.measuredUnitId,
      analysisMethodId:
        input.analysisMethodId !== undefined ? input.analysisMethodId : existing.analysisMethodId,
      detectionLimit:
        input.detectionLimit !== undefined ? input.detectionLimit : existing.detectionLimit,
      measurementUncertainty:
        input.measurementUncertainty !== undefined
          ? input.measurementUncertainty
          : existing.measurementUncertainty,
      qualityFlag: input.qualityFlag !== undefined ? input.qualityFlag : existing.qualityFlag,
      isAccredited: input.isAccredited !== undefined ? input.isAccredited : existing.isAccredited,
      source: input.source !== undefined ? input.source : existing.source,
      verificationStatus: input.verificationStatus ?? existing.verificationStatus,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const parameter = await this.repo.getWaterParameterById(next.parameterId);
    const result = await this.validation.validateAnalysisResult(next, parameter);
    throwIfInvalid(result.issues, 'WATER_ANALYSIS_RESULT_INVALID', 'Analysis result invalid');
    return this.repo.upsertWaterAnalysisResult(await this.applyNormalization(next, parameter));
  }

  async normalizeWaterAnalysisResult(
    input: NormalizeWaterAnalysisResultInput,
  ): Promise<WaterAnalysisResult> {
    let row: WaterAnalysisResult | null = null;
    if (input.resultId) {
      row = await this.repo.getWaterAnalysisResultById(input.resultId);
      if (!row || !row.isActive) {
        throw httpError(404, 'WATER_ANALYSIS_RESULT_NOT_FOUND', 'Analysis result not found');
      }
      row = {
        ...row,
        measuredValue:
          input.measuredValue !== undefined ? input.measuredValue : row.measuredValue,
        measuredUnitId:
          input.measuredUnitId !== undefined ? input.measuredUnitId : row.measuredUnitId,
        rawValue: input.rawValue !== undefined ? input.rawValue : row.rawValue,
        rawUnit: input.rawUnit !== undefined ? input.rawUnit : row.rawUnit,
        updatedAt: new Date().toISOString(),
        version: row.version + 1,
      };
    } else {
      throw httpError(400, 'RESULT_ID_REQUIRED', 'resultId is required for normalize');
    }
    const parameter = await this.repo.getWaterParameterById(row.parameterId);
    const normalized = await this.applyNormalization(row, parameter);
    return this.repo.upsertWaterAnalysisResult(normalized);
  }

  async validateWaterAnalysisResultPayload(input: CreateWaterAnalysisResultInput) {
    const parameter = await this.repo.getWaterParameterById(input.parameterId);
    const draft: WaterAnalysisResult = {
      id: newId(),
      sampleId: input.sampleId,
      parameterId: input.parameterId,
      rawParameterName: input.rawParameterName ?? null,
      rawValue: input.rawValue ?? null,
      rawUnit: input.rawUnit ?? null,
      measuredValue: input.measuredValue ?? null,
      measuredUnitId: input.measuredUnitId ?? null,
      normalizedValue: null,
      normalizedUnitId: null,
      analysisMethodId: input.analysisMethodId ?? null,
      detectionLimit: input.detectionLimit ?? null,
      measurementUncertainty: input.measurementUncertainty ?? null,
      qualityFlag: input.qualityFlag ?? null,
      isAccredited: input.isAccredited ?? null,
      source: input.source ?? null,
      verificationStatus: input.verificationStatus ?? 'Draft',
      normalizationStatus: 'NOT_REQUIRED',
      normalizationMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      isActive: true,
    };
    return this.validation.validateAnalysisResult(draft, parameter);
  }

  private async applyNormalization(
    row: WaterAnalysisResult,
    parameter: WaterParameter | null,
  ): Promise<WaterAnalysisResult> {
    // Preserve raw* fields exactly
    const rawValue = row.rawValue;
    const rawUnit = row.rawUnit;
    const rawParameterName = row.rawParameterName;

    if (!parameter?.canonicalUnitId || row.measuredValue == null || !row.measuredUnitId) {
      return {
        ...row,
        rawValue,
        rawUnit,
        rawParameterName,
        normalizedValue: null,
        normalizedUnitId: null,
        normalizationStatus: 'NOT_REQUIRED',
        normalizationMessage: null,
      };
    }

    const fromUnit = await this.repo.getMeasurementUnitById(row.measuredUnitId);
    const toUnit = await this.repo.getMeasurementUnitById(parameter.canonicalUnitId);
    if (!fromUnit || !toUnit) {
      return {
        ...row,
        rawValue,
        rawUnit,
        rawParameterName,
        normalizedValue: null,
        normalizedUnitId: null,
        normalizationStatus: 'FAILED',
        normalizationMessage: 'Measurement unit not found',
      };
    }

    if (fromUnit.id === toUnit.id) {
      return {
        ...row,
        rawValue,
        rawUnit,
        rawParameterName,
        normalizedValue: row.measuredValue,
        normalizedUnitId: toUnit.id,
        normalizationStatus: 'NORMALIZED',
        normalizationMessage: null,
      };
    }

    const conversion = convertMeasurementValue(row.measuredValue, fromUnit, toUnit);
    if (!conversion.ok) {
      // Failed conversion must not erase raw or measured data
      return {
        ...row,
        rawValue,
        rawUnit,
        rawParameterName,
        normalizedValue: null,
        normalizedUnitId: null,
        normalizationStatus: conversion.status,
        normalizationMessage: conversion.message,
      };
    }

    return {
      ...row,
      rawValue,
      rawUnit,
      rawParameterName,
      normalizedValue: conversion.value,
      normalizedUnitId: toUnit.id,
      normalizationStatus: 'NORMALIZED',
      normalizationMessage: null,
    };
  }

  // ---- Derived indicators ----

  listDerivedIndicators(sampleId: string) {
    return this.repo.listDerivedIndicators(sampleId);
  }

  async calculateIndicators(sampleId: string): Promise<WaterDerivedIndicator[]> {
    const sample = await this.repo.getWaterSampleById(sampleId);
    if (!sample || !sample.isActive) {
      throw httpError(404, 'WATER_SAMPLE_NOT_FOUND', 'Water sample not found');
    }
    const results = await this.repo.listWaterAnalysisResults(sampleId, true);
    const parameters = await this.repo.listWaterParameters(false);
    const units = await this.repo.listMeasurementUnits(false);
    const outcomes = calculateAllIndicators(results, parameters, units);
    const now = new Date().toISOString();
    const saved: WaterDerivedIndicator[] = [];
    for (const outcome of outcomes) {
      const existing = await this.repo.getDerivedIndicatorBySampleAndCode(
        sampleId,
        outcome.indicatorCode,
      );
      const row = outcomeToDerivedIndicator(
        sampleId,
        outcome,
        now,
        existing?.id ?? newId(),
        existing ? existing.version + 1 : 1,
      );
      saved.push(await this.repo.upsertDerivedIndicator(row));
    }
    return saved;
  }

  // ---- Chain of custody ----

  listChainOfCustody(sampleId: string) {
    return this.repo.listChainOfCustody(sampleId);
  }

  async createChainOfCustody(
    sampleId: string,
    input: CreateWaterCustodyInput,
  ): Promise<WaterSampleChainOfCustody> {
    const sample = await this.repo.getWaterSampleById(sampleId);
    if (!sample || !sample.isActive) {
      throw httpError(404, 'WATER_SAMPLE_NOT_FOUND', 'Water sample not found');
    }
    const row: WaterSampleChainOfCustody = {
      id: newId(),
      sampleId,
      action: input.action,
      performedBy: input.performedBy ?? null,
      performedAt: input.performedAt,
      location: input.location ?? null,
      notes: input.notes ?? null,
    };
    const result = await this.validation.validateCustodyChronology(sampleId, row);
    throwIfInvalid(result.issues, 'WATER_CUSTODY_INVALID', 'Chain of custody validation failed');
    return this.repo.upsertChainOfCustody(row);
  }
}

export async function seedIrrigationWaterLaboratory(
  repo: IrrigationWaterRepository,
): Promise<void> {
  const existing = await repo.listMeasurementUnits(false);
  if (existing.length > 0) return;
  const now = new Date().toISOString();
  for (const unit of buildWaterMeasurementUnits(now)) {
    await repo.upsertMeasurementUnit(unit);
  }
  for (const def of WATER_PARAMETER_SEED) {
    await repo.upsertWaterParameter(buildWaterParameter(def, now));
  }
  // Ensure unitIdForCode stable for hardness etc.
  void unitIdForCode('NONE');
}
