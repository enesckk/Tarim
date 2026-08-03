import { randomUUID } from 'node:crypto';
import type { SoilLaboratoryRepository } from '../repositories/soil-laboratory.repository.js';
import type {
  AnalysisMethod,
  Laboratory,
  SoilAnalysis,
  SoilAnalysisResult,
  SoilSample,
} from '../types/soil-laboratory.types.js';
import {
  SoilParameterCatalogService,
  seedSoilParameterCatalog,
} from './soil-parameter-catalog.service.js';
import {
  LaboratoryReportService,
  seedLaboratoryReportManagement,
} from './laboratory-report.service.js';
import {
  LaboratoryImportEngineService,
  seedLaboratoryImportEngine,
} from './laboratory-import-engine.service.js';
import {
  SoilLaboratoryValidationService,
  type CreateAnalysisMethodInput,
  type CreateLaboratoryInput,
  type CreateSoilAnalysisResultInput,
  type CreateSoilSampleInput,
  type UpdateAnalysisMethodInput,
  type UpdateLaboratoryInput,
  type UpdateSoilAnalysisResultInput,
  type UpdateSoilSampleInput,
} from './soil-laboratory-validation.service.js';

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
 * SoilAnalysis aggregate application service — Phase 2.2A/C/D/E.
 * Does not compute suitability, recommend crops, fertilizer, or irrigation.
 */
export class SoilLaboratoryService {
  readonly validation: SoilLaboratoryValidationService;
  readonly catalog: SoilParameterCatalogService;
  readonly reports: LaboratoryReportService;
  readonly imports: LaboratoryImportEngineService;

  constructor(private readonly repo: SoilLaboratoryRepository) {
    this.catalog = new SoilParameterCatalogService(repo);
    this.validation = new SoilLaboratoryValidationService(repo, this.catalog);
    this.reports = new LaboratoryReportService(repo);
    this.imports = new LaboratoryImportEngineService(repo);
  }

  // ---- Laboratory ----

  listLaboratories(activeOnly = true) {
    return this.repo.listLaboratories(activeOnly);
  }

  getLaboratory(id: string) {
    return this.repo.getLaboratoryById(id);
  }

  async createLaboratory(input: CreateLaboratoryInput): Promise<Laboratory> {
    const now = new Date().toISOString();
    const row: Laboratory = {
      id: newId(),
      name: input.name,
      country: input.country ?? null,
      city: input.city ?? null,
      accreditationNumber: input.accreditationNumber ?? null,
      accreditationStandard: input.accreditationStandard ?? null,
      contact: input.contact ?? null,
      website: input.website ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    throwIfInvalid(
      this.validation.validateLaboratory(row),
      'LABORATORY_INVALID',
      'Laboratory validation failed',
    );
    return this.repo.upsertLaboratory(row);
  }

  async updateLaboratory(id: string, input: UpdateLaboratoryInput): Promise<Laboratory> {
    const existing = await this.repo.getLaboratoryById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'LABORATORY_NOT_FOUND', 'Laboratory not found');
    }
    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertLaboratory(existing);

    const next: Laboratory = {
      ...existing,
      id: newId(),
      name: input.name ?? existing.name,
      country: input.country !== undefined ? input.country : existing.country,
      city: input.city !== undefined ? input.city : existing.city,
      accreditationNumber:
        input.accreditationNumber !== undefined
          ? input.accreditationNumber
          : existing.accreditationNumber,
      accreditationStandard:
        input.accreditationStandard !== undefined
          ? input.accreditationStandard
          : existing.accreditationStandard,
      contact: input.contact !== undefined ? input.contact : existing.contact,
      website: input.website !== undefined ? input.website : existing.website,
      isActive: input.isActive ?? true,
      version: existing.version + 1,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    throwIfInvalid(
      this.validation.validateLaboratory(next),
      'LABORATORY_INVALID',
      'Laboratory validation failed',
    );
    return this.repo.upsertLaboratory(next);
  }

  async deleteLaboratory(id: string): Promise<Laboratory> {
    const existing = await this.repo.getLaboratoryById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'LABORATORY_NOT_FOUND', 'Laboratory not found');
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    return this.repo.upsertLaboratory(existing);
  }

  // ---- AnalysisMethod ----

  listAnalysisMethods(activeOnly = true) {
    return this.repo.listAnalysisMethods(activeOnly);
  }

  getAnalysisMethod(id: string) {
    return this.repo.getAnalysisMethodById(id);
  }

  async createAnalysisMethod(input: CreateAnalysisMethodInput): Promise<AnalysisMethod> {
    const dup = await this.repo.getAnalysisMethodByCode(input.code);
    if (dup) {
      throw httpError(422, 'ANALYSIS_METHOD_CODE_DUPLICATE', 'AnalysisMethod code already exists');
    }
    const now = new Date().toISOString();
    const row: AnalysisMethod = {
      id: newId(),
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      standard: input.standard ?? null,
      organization: input.organization ?? null,
      methodVersion: input.methodVersion ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    throwIfInvalid(
      this.validation.validateAnalysisMethod(row),
      'ANALYSIS_METHOD_INVALID',
      'AnalysisMethod validation failed',
    );
    return this.repo.upsertAnalysisMethod(row);
  }

  async updateAnalysisMethod(
    id: string,
    input: UpdateAnalysisMethodInput,
  ): Promise<AnalysisMethod> {
    const existing = await this.repo.getAnalysisMethodById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'ANALYSIS_METHOD_NOT_FOUND', 'AnalysisMethod not found');
    }
    const nextCode = input.code ?? existing.code;
    if (nextCode !== existing.code) {
      const dup = await this.repo.getAnalysisMethodByCode(nextCode);
      if (dup) {
        throw httpError(422, 'ANALYSIS_METHOD_CODE_DUPLICATE', 'AnalysisMethod code already exists');
      }
    }
    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertAnalysisMethod(existing);

    const next: AnalysisMethod = {
      ...existing,
      id: newId(),
      code: nextCode,
      name: input.name ?? existing.name,
      description: input.description !== undefined ? input.description : existing.description,
      standard: input.standard !== undefined ? input.standard : existing.standard,
      organization: input.organization !== undefined ? input.organization : existing.organization,
      methodVersion:
        input.methodVersion !== undefined ? input.methodVersion : existing.methodVersion,
      isActive: input.isActive ?? true,
      version: existing.version + 1,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    throwIfInvalid(
      this.validation.validateAnalysisMethod(next),
      'ANALYSIS_METHOD_INVALID',
      'AnalysisMethod validation failed',
    );
    return this.repo.upsertAnalysisMethod(next);
  }

  async deleteAnalysisMethod(id: string): Promise<AnalysisMethod> {
    const existing = await this.repo.getAnalysisMethodById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'ANALYSIS_METHOD_NOT_FOUND', 'AnalysisMethod not found');
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    return this.repo.upsertAnalysisMethod(existing);
  }

  // ---- SoilSample ----

  listSamples(activeOnly = true) {
    return this.repo.listSamples(activeOnly);
  }

  listSamplesByParcel(parcelId: string) {
    return this.repo.listSamplesByParcelId(parcelId, true);
  }

  getSample(id: string) {
    return this.repo.getSampleById(id);
  }

  getSoilAnalysis(sampleId: string): Promise<SoilAnalysis | null> {
    return this.repo.getSoilAnalysis(sampleId);
  }

  async createSample(input: CreateSoilSampleInput): Promise<SoilSample> {
    const dup = await this.repo.getSampleByCode(input.sampleCode);
    if (dup) {
      throw httpError(422, 'SAMPLE_CODE_DUPLICATE', 'SampleCode already exists');
    }
    if (input.laboratoryId) {
      const lab = await this.repo.getLaboratoryById(input.laboratoryId);
      if (!lab || !lab.isActive) {
        throw httpError(422, 'LABORATORY_MISSING', 'Laboratory not found');
      }
    }
    const now = new Date().toISOString();
    const row: SoilSample = {
      id: newId(),
      parcelId: input.parcelId,
      sampleCode: input.sampleCode,
      laboratoryId: input.laboratoryId ?? null,
      samplingDate: input.samplingDate ?? null,
      analysisDate: input.analysisDate ?? null,
      samplingDepthFromCm: input.samplingDepthFromCm ?? null,
      samplingDepthToCm: input.samplingDepthToCm ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      elevation: input.elevation ?? null,
      samplerName: input.samplerName ?? null,
      sampleMethod: input.sampleMethod ?? null,
      weatherCondition: input.weatherCondition ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    throwIfInvalid(
      this.validation.validateSample(row),
      'SOIL_SAMPLE_INVALID',
      'SoilSample validation failed',
    );
    return this.repo.upsertSample(row);
  }

  async updateSample(id: string, input: UpdateSoilSampleInput): Promise<SoilSample> {
    const existing = await this.repo.getSampleById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'SOIL_SAMPLE_NOT_FOUND', 'Soil sample not found');
    }
    const nextCode = input.sampleCode ?? existing.sampleCode;
    if (nextCode !== existing.sampleCode) {
      const dup = await this.repo.getSampleByCode(nextCode);
      if (dup) throw httpError(422, 'SAMPLE_CODE_DUPLICATE', 'SampleCode already exists');
    }
    if (input.laboratoryId) {
      const lab = await this.repo.getLaboratoryById(input.laboratoryId);
      if (!lab || !lab.isActive) {
        throw httpError(422, 'LABORATORY_MISSING', 'Laboratory not found');
      }
    }

    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertSample(existing);

    const next: SoilSample = {
      ...existing,
      id: newId(),
      parcelId: input.parcelId ?? existing.parcelId,
      sampleCode: nextCode,
      laboratoryId: input.laboratoryId !== undefined ? input.laboratoryId : existing.laboratoryId,
      samplingDate: input.samplingDate !== undefined ? input.samplingDate : existing.samplingDate,
      analysisDate: input.analysisDate !== undefined ? input.analysisDate : existing.analysisDate,
      samplingDepthFromCm:
        input.samplingDepthFromCm !== undefined
          ? input.samplingDepthFromCm
          : existing.samplingDepthFromCm,
      samplingDepthToCm:
        input.samplingDepthToCm !== undefined
          ? input.samplingDepthToCm
          : existing.samplingDepthToCm,
      latitude: input.latitude !== undefined ? input.latitude : existing.latitude,
      longitude: input.longitude !== undefined ? input.longitude : existing.longitude,
      elevation: input.elevation !== undefined ? input.elevation : existing.elevation,
      samplerName: input.samplerName !== undefined ? input.samplerName : existing.samplerName,
      sampleMethod: input.sampleMethod !== undefined ? input.sampleMethod : existing.sampleMethod,
      weatherCondition:
        input.weatherCondition !== undefined ? input.weatherCondition : existing.weatherCondition,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      version: existing.version + 1,
      createdAt: existing.createdAt,
      updatedAt: now,
      isActive: true,
    };
    throwIfInvalid(
      this.validation.validateSample(next),
      'SOIL_SAMPLE_INVALID',
      'SoilSample validation failed',
    );

    // Remap results to new sample version id
    const results = await this.repo.listResultsBySampleId(id, true);
    const saved = await this.repo.upsertSample(next);
    for (const result of results) {
      result.isActive = false;
      result.updatedAt = now;
      await this.repo.upsertResult(result);
      await this.repo.upsertResult({
        ...result,
        id: newId(),
        sampleId: saved.id,
        version: result.version + 1,
        createdAt: result.createdAt,
        updatedAt: now,
        isActive: true,
      });
    }
    return saved;
  }

  async deleteSample(id: string): Promise<SoilSample> {
    const existing = await this.repo.getSampleById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'SOIL_SAMPLE_NOT_FOUND', 'Soil sample not found');
    }
    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    const results = await this.repo.listResultsBySampleId(id, true);
    for (const result of results) {
      result.isActive = false;
      result.updatedAt = now;
      await this.repo.upsertResult(result);
    }
    return this.repo.upsertSample(existing);
  }

  validateSample(sampleId: string) {
    return this.validation.validateSampleAggregate(sampleId);
  }

  // ---- SoilAnalysisResult ----

  listResults(sampleId: string) {
    return this.repo.listResultsBySampleId(sampleId, true);
  }

  getResult(id: string) {
    return this.repo.getResultById(id);
  }

  async createResult(
    sampleId: string,
    input: CreateSoilAnalysisResultInput,
  ): Promise<SoilAnalysisResult> {
    const sample = await this.repo.getSampleById(sampleId);
    if (!sample || !sample.isActive) {
      throw httpError(404, 'SOIL_SAMPLE_NOT_FOUND', 'Soil sample not found');
    }
    if (input.analysisMethodId) {
      const method = await this.repo.getAnalysisMethodById(input.analysisMethodId);
      if (!method || !method.isActive) {
        throw httpError(422, 'ANALYSIS_METHOD_MISSING', 'AnalysisMethod not found');
      }
    }
    const siblings = await this.repo.listResultsBySampleId(sampleId, true);
    if (siblings.some((s) => s.parameterCode === input.parameterCode)) {
      throw httpError(
        422,
        'PARAMETER_CODE_DUPLICATE',
        'ParameterCode already exists for this sample',
      );
    }

    const rawValue =
      input.rawValue !== undefined
        ? input.rawValue
        : input.measuredValue !== undefined
          ? input.measuredValue
          : null;
    const rawUnit = input.rawUnit ?? input.unit ?? null;
    const outcome = await this.catalog.normalizeValues({
      parameterCode: input.parameterCode,
      rawValue,
      rawUnit,
      originalParameterName: input.originalParameterName ?? null,
      laboratoryId: sample.laboratoryId,
      measuredValueHint: input.measuredValue ?? null,
    });
    const rejectCodes = new Set([
      'PARAMETER_NOT_IN_CATALOG',
      'PARAMETER_CODE_REQUIRED',
      'NUMERIC_VALUE_INVALID',
      'ENUM_OPTION_INVALID',
      'BOOLEAN_VALUE_INVALID',
      'ALIAS_AMBIGUOUS',
      'ALIAS_UNMATCHED',
      'PERCENTAGE_RANGE_INVALID',
    ]);
    throwIfInvalid(
      outcome.issues.filter((i) => rejectCodes.has(i.code)),
      'SOIL_ANALYSIS_RESULT_INVALID',
      'SoilAnalysisResult validation failed',
    );

    const now = new Date().toISOString();
    const row: SoilAnalysisResult = {
      id: newId(),
      sampleId,
      parameterCode: outcome.parameter?.code ?? input.parameterCode,
      parameterName:
        input.parameterName ??
        outcome.parameter?.canonicalName ??
        input.parameterCode,
      measuredValue: outcome.measuredValue,
      unit: outcome.unit,
      analysisMethodId: input.analysisMethodId ?? null,
      analysisMethod: input.analysisMethod ?? null,
      detectionLimit: input.detectionLimit ?? null,
      measurementUncertainty: input.measurementUncertainty ?? null,
      qualityFlag: input.qualityFlag ?? 'Unknown',
      isAccredited: input.isAccredited ?? false,
      source: input.source ?? null,
      valueSourceType: (input.valueSourceType as SoilAnalysisResult['valueSourceType']) ?? null,
      verificationStatus: input.verificationStatus ?? 'Draft',
      rawValue: outcome.rawValue,
      rawUnit: outcome.rawUnit,
      normalizedValue: outcome.normalizedValue,
      normalizedUnitId: outcome.normalizedUnitId,
      normalizationStatus: outcome.normalizationStatus,
      normalizationMessage: outcome.normalizationMessage,
      originalParameterName: input.originalParameterName ?? null,
      originalMethodName: input.originalMethodName ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    throwIfInvalid(
      this.validation.validateResult(row),
      'SOIL_ANALYSIS_RESULT_INVALID',
      'SoilAnalysisResult validation failed',
    );
    return this.repo.upsertResult(row);
  }

  async updateResult(
    resultId: string,
    input: UpdateSoilAnalysisResultInput,
  ): Promise<SoilAnalysisResult> {
    const existing = await this.repo.getResultById(resultId);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'SOIL_ANALYSIS_RESULT_NOT_FOUND', 'Soil analysis result not found');
    }
    const nextCode = input.parameterCode ?? existing.parameterCode;
    if (nextCode !== existing.parameterCode) {
      const siblings = await this.repo.listResultsBySampleId(existing.sampleId, true);
      if (siblings.some((s) => s.id !== existing.id && s.parameterCode === nextCode)) {
        throw httpError(
          422,
          'PARAMETER_CODE_DUPLICATE',
          'ParameterCode already exists for this sample',
        );
      }
    }
    if (input.analysisMethodId) {
      const method = await this.repo.getAnalysisMethodById(input.analysisMethodId);
      if (!method || !method.isActive) {
        throw httpError(422, 'ANALYSIS_METHOD_MISSING', 'AnalysisMethod not found');
      }
    }

    // Raw payload is immutable once set.
    const preservedRaw = existing.rawValue;
    const preservedRawUnit = existing.rawUnit;
    const reNormalize =
      input.parameterCode !== undefined ||
      input.rawValue !== undefined ||
      input.rawUnit !== undefined ||
      input.unit !== undefined ||
      input.measuredValue !== undefined;

    let outcome = null as Awaited<ReturnType<SoilParameterCatalogService['normalizeValues']>> | null;
    if (reNormalize) {
      outcome = await this.catalog.normalizeValues({
        parameterCode: nextCode,
        rawValue:
          preservedRaw != null
            ? preservedRaw
            : input.rawValue !== undefined
              ? input.rawValue
              : input.measuredValue !== undefined
                ? input.measuredValue
                : existing.measuredValue,
        rawUnit: preservedRawUnit ?? input.rawUnit ?? input.unit ?? existing.unit,
        originalParameterName:
          input.originalParameterName ?? existing.originalParameterName,
        laboratoryId: null,
        measuredValueHint:
          input.measuredValue !== undefined ? input.measuredValue : existing.measuredValue,
      });
      throwIfInvalid(
        outcome.issues.filter((i) => i.severity === 'error'),
        'SOIL_ANALYSIS_RESULT_INVALID',
        'SoilAnalysisResult validation failed',
      );
    }

    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertResult(existing);

    const next: SoilAnalysisResult = {
      ...existing,
      id: newId(),
      parameterCode: nextCode,
      parameterName:
        input.parameterName ??
        outcome?.parameter?.canonicalName ??
        existing.parameterName,
      measuredValue: outcome ? outcome.measuredValue : existing.measuredValue,
      unit: outcome ? outcome.unit : (input.unit ?? existing.unit),
      analysisMethodId:
        input.analysisMethodId !== undefined
          ? input.analysisMethodId
          : existing.analysisMethodId,
      analysisMethod:
        input.analysisMethod !== undefined ? input.analysisMethod : existing.analysisMethod,
      detectionLimit:
        input.detectionLimit !== undefined ? input.detectionLimit : existing.detectionLimit,
      measurementUncertainty:
        input.measurementUncertainty !== undefined
          ? input.measurementUncertainty
          : existing.measurementUncertainty,
      qualityFlag: input.qualityFlag ?? existing.qualityFlag,
      isAccredited: input.isAccredited ?? existing.isAccredited,
      source: input.source !== undefined ? input.source : existing.source,
      valueSourceType:
        input.valueSourceType !== undefined
          ? (input.valueSourceType as SoilAnalysisResult['valueSourceType'])
          : existing.valueSourceType,
      verificationStatus: input.verificationStatus ?? existing.verificationStatus,
      rawValue: preservedRaw,
      rawUnit: preservedRawUnit,
      normalizedValue: outcome ? outcome.normalizedValue : existing.normalizedValue,
      normalizedUnitId: outcome ? outcome.normalizedUnitId : existing.normalizedUnitId,
      normalizationStatus: outcome
        ? outcome.normalizationStatus
        : existing.normalizationStatus,
      normalizationMessage: outcome
        ? outcome.normalizationMessage
        : existing.normalizationMessage,
      originalParameterName:
        input.originalParameterName !== undefined
          ? input.originalParameterName
          : existing.originalParameterName,
      originalMethodName:
        input.originalMethodName !== undefined
          ? input.originalMethodName
          : existing.originalMethodName,
      version: existing.version + 1,
      createdAt: existing.createdAt,
      updatedAt: now,
      isActive: true,
    };
    throwIfInvalid(
      this.validation.validateResult(next),
      'SOIL_ANALYSIS_RESULT_INVALID',
      'SoilAnalysisResult validation failed',
    );
    return this.repo.upsertResult(next);
  }

  async deleteResult(resultId: string): Promise<SoilAnalysisResult> {
    const existing = await this.repo.getResultById(resultId);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'SOIL_ANALYSIS_RESULT_NOT_FOUND', 'Soil analysis result not found');
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    return this.repo.upsertResult(existing);
  }
}

/**
 * Phase 2.2A/C/D/E seed:
 * - no laboratories / methods / samples / result / report / import session rows
 * - seeds measurement units + soil parameter catalog + unit mappings
 * - does not seed enum class options or scientific ranges
 */
export async function seedSoilLaboratoryCore(
  repo: SoilLaboratoryRepository,
): Promise<void> {
  await seedSoilParameterCatalog(repo);
  await seedLaboratoryReportManagement(repo);
  await seedLaboratoryImportEngine(repo);
}
