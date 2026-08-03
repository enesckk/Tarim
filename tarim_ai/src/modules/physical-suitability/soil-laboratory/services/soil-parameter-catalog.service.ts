import { randomUUID } from 'node:crypto';
import { normalizeAliasText } from '../catalogs/catalog-ids.js';
import {
  MEASUREMENT_UNIT_SEED,
  buildMeasurementUnit,
} from '../catalogs/measurement-unit.catalog.js';
import {
  SOIL_PARAMETER_SEED,
  buildParameterUnitMappings,
  buildSoilParameter,
} from '../catalogs/soil-parameter.catalog.js';
import type { SoilLaboratoryRepository } from '../repositories/soil-laboratory.repository.js';
import type { SoilAnalysisResult, SoilLaboratoryValidationIssue } from '../types/soil-laboratory.types.js';
import type {
  AliasResolveResult,
  NormalizationStatus,
  SoilParameter,
  SoilParameterAlias,
  SoilParameterOption,
  SoilParameterUnit,
  UnitConversionResult,
} from '../types/soil-parameter.types.js';
import {
  convertMeasurementValue,
  resolveUnitByCodeOrSymbol,
} from './unit-conversion.engine.js';
import type {
  CreateSoilParameterAliasInput,
  CreateSoilParameterInput,
  NormalizeAnalysisResultInput,
  UnitConvertInput,
  UpdateSoilParameterAliasInput,
  UpdateSoilParameterInput,
  ValidateAnalysisResultInput,
} from './soil-parameter-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

export type NormalizationOutcome = {
  parameter: SoilParameter | null;
  rawValue: string | null;
  rawUnit: string | null;
  normalizedValue: number | null;
  normalizedUnitId: string | null;
  normalizationStatus: NormalizationStatus;
  normalizationMessage: string | null;
  measuredValue: number | null;
  unit: string;
  issues: SoilLaboratoryValidationIssue[];
};

/**
 * Phase 2.2C — parameter catalog, unit conversion, alias resolution, normalization.
 * No scientific interpretation ranges, crop thresholds, or suitability scores.
 */
export class SoilParameterCatalogService {
  constructor(private readonly repo: SoilLaboratoryRepository) {}

  listParameters(activeOnly = true) {
    return this.repo.listSoilParameters(activeOnly);
  }

  getParameter(id: string) {
    return this.repo.getSoilParameterById(id);
  }

  getParameterByCode(code: string) {
    return this.repo.getSoilParameterByCode(code);
  }

  async createParameter(input: CreateSoilParameterInput): Promise<SoilParameter> {
    const existing = await this.repo.getSoilParameterByCode(input.code);
    if (existing) {
      throw httpError(422, 'PARAMETER_CODE_DUPLICATE', 'SoilParameter code must be unique');
    }
    if (input.canonicalUnitId) {
      const unit = await this.repo.getMeasurementUnitById(input.canonicalUnitId);
      if (!unit || !unit.isActive) {
        throw httpError(422, 'CANONICAL_UNIT_INVALID', 'CanonicalUnitId not found');
      }
    }
    const now = new Date().toISOString();
    const row: SoilParameter = {
      id: newId(),
      code: input.code,
      canonicalName: input.canonicalName,
      turkishDisplayName: input.turkishDisplayName,
      englishDisplayName: input.englishDisplayName,
      category: input.category,
      subCategory: input.subCategory ?? null,
      description: input.description ?? null,
      canonicalUnitId: input.canonicalUnitId ?? null,
      dataType: input.dataType,
      decimalPrecision: input.decimalPrecision ?? null,
      valueType: input.valueType as SoilParameter['valueType'],
      measurementScope: (input.measurementScope ?? 'SAMPLE') as SoilParameter['measurementScope'],
      isDirectlyMeasured: input.isDirectlyMeasured ?? true,
      isCalculated: input.isCalculated ?? false,
      isFieldObservation: input.isFieldObservation ?? false,
      isLaboratoryParameter: input.isLaboratoryParameter ?? true,
      isRequiredForPhysicalSuitability: input.isRequiredForPhysicalSuitability ?? false,
      isRequiredForFertilityAssessment: input.isRequiredForFertilityAssessment ?? false,
      displayOrder: input.displayOrder ?? 1000,
      source: input.source ?? null,
      verificationStatus: input.verificationStatus ?? 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    return this.repo.upsertSoilParameter(row);
  }

  async updateParameter(id: string, input: UpdateSoilParameterInput): Promise<SoilParameter> {
    const existing = await this.repo.getSoilParameterById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'SOIL_PARAMETER_NOT_FOUND', 'SoilParameter not found');
    }
    if (input.canonicalUnitId) {
      const unit = await this.repo.getMeasurementUnitById(input.canonicalUnitId);
      if (!unit || !unit.isActive) {
        throw httpError(422, 'CANONICAL_UNIT_INVALID', 'CanonicalUnitId not found');
      }
    }
    const now = new Date().toISOString();
    // Keep stable id so SoilParameterUnit / alias FKs remain valid. Code is immutable.
    const next: SoilParameter = {
      ...existing,
      code: existing.code,
      canonicalName: input.canonicalName ?? existing.canonicalName,
      turkishDisplayName: input.turkishDisplayName ?? existing.turkishDisplayName,
      englishDisplayName: input.englishDisplayName ?? existing.englishDisplayName,
      category: input.category ?? existing.category,
      subCategory:
        input.subCategory !== undefined ? input.subCategory : existing.subCategory,
      description: input.description !== undefined ? input.description : existing.description,
      canonicalUnitId:
        input.canonicalUnitId !== undefined
          ? input.canonicalUnitId
          : existing.canonicalUnitId,
      dataType: input.dataType ?? existing.dataType,
      decimalPrecision:
        input.decimalPrecision !== undefined
          ? input.decimalPrecision
          : existing.decimalPrecision,
      valueType: (input.valueType as SoilParameter['valueType']) ?? existing.valueType,
      measurementScope:
        (input.measurementScope as SoilParameter['measurementScope']) ??
        existing.measurementScope,
      isDirectlyMeasured: input.isDirectlyMeasured ?? existing.isDirectlyMeasured,
      isCalculated: input.isCalculated ?? existing.isCalculated,
      isFieldObservation: input.isFieldObservation ?? existing.isFieldObservation,
      isLaboratoryParameter: input.isLaboratoryParameter ?? existing.isLaboratoryParameter,
      isRequiredForPhysicalSuitability:
        input.isRequiredForPhysicalSuitability ?? existing.isRequiredForPhysicalSuitability,
      isRequiredForFertilityAssessment:
        input.isRequiredForFertilityAssessment ?? existing.isRequiredForFertilityAssessment,
      displayOrder: input.displayOrder ?? existing.displayOrder,
      source: input.source !== undefined ? input.source : existing.source,
      verificationStatus: input.verificationStatus ?? existing.verificationStatus,
      version: existing.version + 1,
      updatedAt: now,
      isActive: input.isActive ?? existing.isActive,
    };
    return this.repo.upsertSoilParameter(next);
  }

  async deleteParameter(id: string): Promise<SoilParameter> {
    const existing = await this.repo.getSoilParameterById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'SOIL_PARAMETER_NOT_FOUND', 'SoilParameter not found');
    }
    existing.isActive = false;
    existing.updatedAt = new Date().toISOString();
    return this.repo.upsertSoilParameter(existing);
  }

  listUnits(activeOnly = true) {
    return this.repo.listMeasurementUnits(activeOnly);
  }

  async convertUnit(input: UnitConvertInput): Promise<UnitConversionResult> {
    const units = await this.repo.listMeasurementUnits(true);
    const from = resolveUnitByCodeOrSymbol(units, input.fromUnit);
    const to = resolveUnitByCodeOrSymbol(units, input.toUnit);
    if (!from || !to) {
      return {
        ok: false,
        value: null,
        fromUnitCode: input.fromUnit,
        toUnitCode: input.toUnit,
        status: 'UNSUPPORTED_UNIT',
        message: 'Unknown measurement unit code or symbol',
      };
    }
    return convertMeasurementValue(input.value, from, to);
  }

  listAliases(activeOnly = true) {
    return this.repo.listParameterAliases(activeOnly);
  }

  async createAlias(input: CreateSoilParameterAliasInput): Promise<SoilParameterAlias> {
    const param = await this.repo.getSoilParameterById(input.parameterId);
    if (!param || !param.isActive) {
      throw httpError(422, 'SOIL_PARAMETER_NOT_FOUND', 'SoilParameter not found');
    }
    if (input.laboratoryId) {
      const lab = await this.repo.getLaboratoryById(input.laboratoryId);
      if (!lab || !lab.isActive) {
        throw httpError(422, 'LABORATORY_MISSING', 'Laboratory not found');
      }
    }
    const now = new Date().toISOString();
    const row: SoilParameterAlias = {
      id: newId(),
      parameterId: input.parameterId,
      alias: input.alias,
      language: input.language ?? null,
      laboratoryId: input.laboratoryId ?? null,
      matchType: (input.matchType ?? 'EXACT') as SoilParameterAlias['matchType'],
      priority: input.priority ?? 100,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    return this.repo.upsertParameterAlias(row);
  }

  async updateAlias(
    id: string,
    input: UpdateSoilParameterAliasInput,
  ): Promise<SoilParameterAlias> {
    const existing = await this.repo.getParameterAliasById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'ALIAS_NOT_FOUND', 'SoilParameterAlias not found');
    }
    if (input.parameterId) {
      const param = await this.repo.getSoilParameterById(input.parameterId);
      if (!param || !param.isActive) {
        throw httpError(422, 'SOIL_PARAMETER_NOT_FOUND', 'SoilParameter not found');
      }
    }
    const now = new Date().toISOString();
    existing.isActive = false;
    existing.updatedAt = now;
    await this.repo.upsertParameterAlias(existing);

    const next: SoilParameterAlias = {
      ...existing,
      id: newId(),
      parameterId: input.parameterId ?? existing.parameterId,
      alias: input.alias ?? existing.alias,
      language: input.language !== undefined ? input.language : existing.language,
      laboratoryId:
        input.laboratoryId !== undefined ? input.laboratoryId : existing.laboratoryId,
      matchType:
        (input.matchType as SoilParameterAlias['matchType']) ?? existing.matchType,
      priority: input.priority ?? existing.priority,
      version: existing.version + 1,
      createdAt: existing.createdAt,
      updatedAt: now,
      isActive: input.isActive ?? true,
    };
    return this.repo.upsertParameterAlias(next);
  }

  async resolveAlias(
    aliasText: string,
    laboratoryId?: string | null,
  ): Promise<AliasResolveResult> {
    const aliases = await this.repo.listParameterAliases(true);
    const exact = aliasText.trim();
    const normalized = normalizeAliasText(aliasText);
    const matches: AliasResolveResult['matches'] = [];

    for (const row of aliases) {
      if (row.laboratoryId && laboratoryId && row.laboratoryId !== laboratoryId) continue;
      if (row.laboratoryId && !laboratoryId && row.matchType === 'LAB_SPECIFIC') continue;

      let hit = false;
      if (row.matchType === 'EXACT' || row.matchType === 'LAB_SPECIFIC' || row.matchType === 'MANUAL') {
        hit = row.alias.trim() === exact;
      } else if (row.matchType === 'NORMALIZED_TEXT') {
        hit = normalizeAliasText(row.alias) === normalized;
      }
      if (hit) {
        matches.push({
          aliasId: row.id,
          parameterId: row.parameterId,
          matchType: row.matchType,
        });
      }
    }

    const uniqueParams = [...new Set(matches.map((m) => m.parameterId))];
    if (uniqueParams.length === 1) {
      const param = await this.repo.getSoilParameterById(uniqueParams[0]!);
      return {
        parameterId: uniqueParams[0]!,
        parameterCode: param?.code ?? null,
        matchCount: matches.length,
        status: 'MATCHED',
        matches,
      };
    }
    if (uniqueParams.length > 1) {
      return {
        parameterId: null,
        parameterCode: null,
        matchCount: matches.length,
        status: 'AMBIGUOUS',
        matches,
      };
    }
    return {
      parameterId: null,
      parameterCode: null,
      matchCount: 0,
      status: 'UNMATCHED',
      matches: [],
    };
  }

  async listParameterUnits(parameterId: string): Promise<SoilParameterUnit[]> {
    return this.repo.listParameterUnits(parameterId, true);
  }

  async listParameterOptions(parameterId: string): Promise<SoilParameterOption[]> {
    return this.repo.listParameterOptions(parameterId, true);
  }

  async normalizePayload(input: NormalizeAnalysisResultInput): Promise<NormalizationOutcome> {
    if (input.resultId) {
      const existing = await this.repo.getResultById(input.resultId);
      if (!existing || !existing.isActive) {
        throw httpError(404, 'SOIL_ANALYSIS_RESULT_NOT_FOUND', 'Soil analysis result not found');
      }
      const outcome = await this.normalizeValues({
        parameterCode: input.parameterCode ?? existing.parameterCode,
        rawValue:
          input.rawValue !== undefined
            ? input.rawValue
            : existing.rawValue,
        rawUnit: input.rawUnit !== undefined ? input.rawUnit : existing.rawUnit,
        originalParameterName:
          input.originalParameterName ?? existing.originalParameterName,
        laboratoryId: input.laboratoryId ?? null,
      });
      const preservedRaw = existing.rawValue;
      const preservedRawUnit = existing.rawUnit;
      const now = new Date().toISOString();
      existing.isActive = false;
      existing.updatedAt = now;
      await this.repo.upsertResult(existing);

      const next: SoilAnalysisResult = {
        ...existing,
        id: newId(),
        parameterCode: outcome.parameter?.code ?? existing.parameterCode,
        parameterName: outcome.parameter?.canonicalName ?? existing.parameterName,
        measuredValue: outcome.measuredValue,
        unit: outcome.unit,
        rawValue: preservedRaw,
        rawUnit: preservedRawUnit,
        normalizedValue: outcome.normalizedValue,
        normalizedUnitId: outcome.normalizedUnitId,
        normalizationStatus: outcome.normalizationStatus,
        normalizationMessage: outcome.normalizationMessage,
        originalParameterName:
          input.originalParameterName ?? existing.originalParameterName,
        version: existing.version + 1,
        createdAt: existing.createdAt,
        updatedAt: now,
        isActive: true,
      };
      await this.repo.upsertResult(next);
      return outcome;
    }

    return this.normalizeValues({
      parameterCode: input.parameterCode,
      rawValue: input.rawValue ?? null,
      rawUnit: input.rawUnit ?? null,
      originalParameterName: input.originalParameterName ?? null,
      laboratoryId: input.laboratoryId ?? null,
    });
  }

  async validatePayload(
    input: ValidateAnalysisResultInput,
  ): Promise<{ valid: boolean; issues: SoilLaboratoryValidationIssue[]; outcome?: NormalizationOutcome }> {
    const issues: SoilLaboratoryValidationIssue[] = [];
    let parameterCode = input.parameterCode;
    let rawValue: string | number | boolean | null =
      input.rawValue !== undefined ? input.rawValue : null;
    let rawUnit = input.rawUnit ?? input.unit ?? null;

    if (input.resultId) {
      const existing = await this.repo.getResultById(input.resultId);
      if (!existing || !existing.isActive) {
        return {
          valid: false,
          issues: [
            {
              code: 'SOIL_ANALYSIS_RESULT_NOT_FOUND',
              severity: 'error',
              message: 'Soil analysis result not found',
            },
          ],
        };
      }
      parameterCode = parameterCode ?? existing.parameterCode;
      if (rawValue == null && existing.rawValue != null) rawValue = existing.rawValue;
      if (rawUnit == null) rawUnit = existing.rawUnit;
    }

    if (!parameterCode) {
      issues.push({
        code: 'PARAMETER_CODE_REQUIRED',
        severity: 'error',
        message: 'ParameterCode is required',
        path: 'parameterCode',
      });
      return { valid: false, issues };
    }

    const outcome = await this.normalizeValues({
      parameterCode,
      rawValue,
      rawUnit,
      originalParameterName: null,
      laboratoryId: null,
      measuredValueHint: input.measuredValue,
    });
    issues.push(...outcome.issues);

    if (input.valueSourceType === undefined) {
      issues.push({
        code: 'VALUE_SOURCE_TYPE_UNSET',
        severity: 'warning',
        message: 'ValueSourceType (Measured/Observed/Modelled/Derived) is not set',
        path: 'valueSourceType',
      });
    }

    return {
      valid: issues.every((i) => i.severity !== 'error'),
      issues,
      outcome,
    };
  }

  async normalizeValues(input: {
    parameterCode?: string | null;
    rawValue: string | number | boolean | null;
    rawUnit: string | null;
    originalParameterName?: string | null;
    laboratoryId?: string | null;
    measuredValueHint?: number | null;
  }): Promise<NormalizationOutcome> {
    const issues: SoilLaboratoryValidationIssue[] = [];
    const rawValueStr =
      input.rawValue === null || input.rawValue === undefined
        ? null
        : String(input.rawValue);
    const rawUnit = input.rawUnit;

    let parameter: SoilParameter | null = null;
    if (input.parameterCode) {
      parameter = await this.repo.getSoilParameterByCode(input.parameterCode);
      if (!parameter) {
        issues.push({
          code: 'PARAMETER_NOT_IN_CATALOG',
          severity: 'error',
          message: `Parameter code ${input.parameterCode} is not in the central catalog`,
          path: 'parameterCode',
        });
      }
    } else if (input.originalParameterName) {
      const resolved = await this.resolveAlias(
        input.originalParameterName,
        input.laboratoryId,
      );
      if (resolved.status === 'AMBIGUOUS') {
        return {
          parameter: null,
          rawValue: rawValueStr,
          rawUnit,
          normalizedValue: null,
          normalizedUnitId: null,
          normalizationStatus: 'REQUIRES_REVIEW',
          normalizationMessage: 'Ambiguous parameter alias match',
          measuredValue: null,
          unit: rawUnit ?? 'NONE',
          issues: [
            {
              code: 'ALIAS_AMBIGUOUS',
              severity: 'error',
              message: 'Alias matched multiple parameters; manual review required',
              path: 'originalParameterName',
            },
          ],
        };
      }
      if (resolved.status === 'MATCHED' && resolved.parameterId) {
        parameter = await this.repo.getSoilParameterById(resolved.parameterId);
      } else {
        issues.push({
          code: 'ALIAS_UNMATCHED',
          severity: 'error',
          message: 'Could not resolve parameter from alias',
          path: 'originalParameterName',
        });
      }
    } else {
      issues.push({
        code: 'PARAMETER_CODE_REQUIRED',
        severity: 'error',
        message: 'ParameterCode or originalParameterName is required',
      });
    }

    if (!parameter) {
      return {
        parameter: null,
        rawValue: rawValueStr,
        rawUnit,
        normalizedValue: null,
        normalizedUnitId: null,
        normalizationStatus: 'FAILED',
        normalizationMessage: 'Parameter unresolved',
        measuredValue: null,
        unit: rawUnit ?? 'NONE',
        issues,
      };
    }

    const canonicalUnit = parameter.canonicalUnitId
      ? await this.repo.getMeasurementUnitById(parameter.canonicalUnitId)
      : null;
    const allowedUnits = await this.repo.listParameterUnits(parameter.id, true);
    const allUnits = await this.repo.listMeasurementUnits(true);

    if (rawValueStr == null || rawValueStr === '') {
      return {
        parameter,
        rawValue: null,
        rawUnit,
        normalizedValue: null,
        normalizedUnitId: canonicalUnit?.id ?? null,
        normalizationStatus: 'NOT_REQUIRED',
        normalizationMessage: 'Null raw value preserved; zero was not substituted',
        measuredValue: null,
        unit: canonicalUnit?.code ?? rawUnit ?? 'NONE',
        issues,
      };
    }

    // ENUM / CLASSIFICATION
    if (parameter.valueType === 'ENUM' || parameter.valueType === 'CLASSIFICATION') {
      const options = await this.repo.listParameterOptions(parameter.id, true);
      if (options.length === 0) {
        return {
          parameter,
          rawValue: rawValueStr,
          rawUnit,
          normalizedValue: null,
          normalizedUnitId: canonicalUnit?.id ?? null,
          normalizationStatus: 'REQUIRES_REVIEW',
          normalizationMessage:
            'Enum option catalog empty — scientific class codes not seeded yet',
          measuredValue: null,
          unit: 'NONE',
          issues: [
            ...issues,
            {
              code: 'ENUM_OPTIONS_EMPTY',
              severity: 'warning',
              message: 'No SoilParameterOption rows; value stored raw for review',
              path: 'rawValue',
            },
          ],
        };
      }
      const match = options.find(
        (o) =>
          o.code === rawValueStr ||
          o.turkishLabel === rawValueStr ||
          o.englishLabel === rawValueStr,
      );
      if (!match) {
        issues.push({
          code: 'ENUM_OPTION_INVALID',
          severity: 'error',
          message: 'Value is not a catalogued SoilParameterOption',
          path: 'rawValue',
        });
        return {
          parameter,
          rawValue: rawValueStr,
          rawUnit,
          normalizedValue: null,
          normalizedUnitId: null,
          normalizationStatus: 'FAILED',
          normalizationMessage: 'Enum value not in catalog',
          measuredValue: null,
          unit: 'NONE',
          issues,
        };
      }
      return {
        parameter,
        rawValue: rawValueStr,
        rawUnit,
        normalizedValue: null,
        normalizedUnitId: canonicalUnit?.id ?? null,
        normalizationStatus: 'NORMALIZED',
        normalizationMessage: `Matched option ${match.code}`,
        measuredValue: null,
        unit: 'NONE',
        issues,
      };
    }

    // BOOLEAN
    if (parameter.valueType === 'BOOLEAN') {
      const lower = rawValueStr.toLowerCase();
      if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
        issues.push({
          code: 'BOOLEAN_VALUE_INVALID',
          severity: 'error',
          message: 'Boolean parameter requires a boolean-compatible raw value',
          path: 'rawValue',
        });
        return {
          parameter,
          rawValue: rawValueStr,
          rawUnit,
          normalizedValue: null,
          normalizedUnitId: null,
          normalizationStatus: 'FAILED',
          normalizationMessage: 'Invalid boolean raw value',
          measuredValue: null,
          unit: 'NONE',
          issues,
        };
      }
      const boolNum = ['true', '1', 'yes'].includes(lower) ? 1 : 0;
      return {
        parameter,
        rawValue: rawValueStr,
        rawUnit,
        normalizedValue: boolNum,
        normalizedUnitId: canonicalUnit?.id ?? null,
        normalizationStatus: 'NORMALIZED',
        normalizationMessage: null,
        measuredValue: boolNum,
        unit: 'NONE',
        issues,
      };
    }

    // TEXT
    if (parameter.valueType === 'TEXT') {
      return {
        parameter,
        rawValue: rawValueStr,
        rawUnit,
        normalizedValue: null,
        normalizedUnitId: canonicalUnit?.id ?? null,
        normalizationStatus: 'NOT_REQUIRED',
        normalizationMessage: 'Text values are stored raw',
        measuredValue: null,
        unit: canonicalUnit?.code ?? 'NONE',
        issues,
      };
    }

    // NUMERIC / PERCENTAGE / RATIO
    if (
      parameter.valueType === 'NUMERIC' ||
      parameter.valueType === 'PERCENTAGE' ||
      parameter.valueType === 'RATIO'
    ) {
      if (typeof input.rawValue === 'boolean' || /[a-zA-Z]/.test(rawValueStr)) {
        // Allow scientific notation / decimal only — reject alpha text
        if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(rawValueStr.trim())) {
          issues.push({
            code: 'NUMERIC_VALUE_INVALID',
            severity: 'error',
            message: 'Numeric parameter cannot accept text values',
            path: 'rawValue',
          });
          return {
            parameter,
            rawValue: rawValueStr,
            rawUnit,
            normalizedValue: null,
            normalizedUnitId: null,
            normalizationStatus: 'FAILED',
            normalizationMessage: 'Non-numeric raw value rejected',
            measuredValue: null,
            unit: rawUnit ?? 'NONE',
            issues,
          };
        }
      }

      const numeric = Number(rawValueStr);
      if (!Number.isFinite(numeric)) {
        issues.push({
          code: 'NUMERIC_VALUE_INVALID',
          severity: 'error',
          message: 'Raw value is not a finite number',
          path: 'rawValue',
        });
        return {
          parameter,
          rawValue: rawValueStr,
          rawUnit,
          normalizedValue: null,
          normalizedUnitId: null,
          normalizationStatus: 'FAILED',
          normalizationMessage: 'Non-finite numeric value',
          measuredValue: null,
          unit: rawUnit ?? 'NONE',
          issues,
        };
      }

      // Null vs zero: numeric 0 is valid and distinct from null (already handled above).
      if (parameter.valueType === 'PERCENTAGE') {
        if (numeric < 0 || numeric > 100) {
          issues.push({
            code: 'PERCENTAGE_RANGE_INVALID',
            severity: 'error',
            message: 'Percentage value must be within [0, 100] before normalization',
            path: 'rawValue',
          });
          return {
            parameter,
            rawValue: rawValueStr,
            rawUnit,
            normalizedValue: null,
            normalizedUnitId: null,
            normalizationStatus: 'FAILED',
            normalizationMessage: 'Percentage out of range; raw preserved',
            measuredValue: null,
            unit: rawUnit ?? 'PERCENT',
            issues,
          };
        }
      }

      if (!rawUnit) {
        issues.push({
          code: 'UNIT_REQUIRED',
          severity: 'error',
          message: 'Raw unit is required for numeric normalization',
          path: 'rawUnit',
        });
        return {
          parameter,
          rawValue: rawValueStr,
          rawUnit,
          normalizedValue: null,
          normalizedUnitId: null,
          normalizationStatus: 'FAILED',
          normalizationMessage: 'Missing unit',
          measuredValue: null,
          unit: 'NONE',
          issues,
        };
      }

      const fromUnit = resolveUnitByCodeOrSymbol(allUnits, rawUnit);
      if (!fromUnit) {
        return {
          parameter,
          rawValue: rawValueStr,
          rawUnit,
          normalizedValue: null,
          normalizedUnitId: null,
          normalizationStatus: 'UNSUPPORTED_UNIT',
          normalizationMessage: `Unsupported unit: ${rawUnit}`,
          measuredValue: null,
          unit: rawUnit,
          issues: [
            ...issues,
            {
              code: 'UNSUPPORTED_UNIT',
              severity: 'error',
              message: `Unit ${rawUnit} is not in the measurement unit catalog`,
              path: 'rawUnit',
            },
          ],
        };
      }

      const mapping = allowedUnits.find((m) => m.unitId === fromUnit.id && m.isActive);
      if (!mapping || !mapping.isAllowedForImport) {
        return {
          parameter,
          rawValue: rawValueStr,
          rawUnit,
          normalizedValue: null,
          normalizedUnitId: null,
          normalizationStatus: 'UNSUPPORTED_UNIT',
          normalizationMessage: `Unit ${fromUnit.code} is not allowed for parameter ${parameter.code}`,
          measuredValue: null,
          unit: fromUnit.code,
          issues: [
            ...issues,
            {
              code: 'UNIT_NOT_ALLOWED_FOR_PARAMETER',
              severity: 'error',
              message: `Unit ${fromUnit.code} is not mapped for ${parameter.code}`,
              path: 'rawUnit',
            },
          ],
        };
      }

      if (mapping.requiresContext) {
        return {
          parameter,
          rawValue: rawValueStr,
          rawUnit,
          normalizedValue: null,
          normalizedUnitId: null,
          normalizationStatus: 'REQUIRES_REVIEW',
          normalizationMessage:
            mapping.conversionNotes ??
            'Unit requires laboratory context; automatic conversion unsupported',
          measuredValue: null,
          unit: fromUnit.code,
          issues: [
            ...issues,
            {
              code: 'UNIT_REQUIRES_CONTEXT',
              severity: 'warning',
              message: 'Context-dependent unit; raw preserved for review',
              path: 'rawUnit',
            },
          ],
        };
      }

      if (!canonicalUnit) {
        return {
          parameter,
          rawValue: rawValueStr,
          rawUnit,
          normalizedValue: null,
          normalizedUnitId: null,
          normalizationStatus: 'FAILED',
          normalizationMessage: 'Parameter has no canonical unit',
          measuredValue: null,
          unit: fromUnit.code,
          issues: [
            ...issues,
            {
              code: 'CANONICAL_UNIT_MISSING',
              severity: 'error',
              message: 'Canonical unit missing on parameter',
            },
          ],
        };
      }

      const converted = convertMeasurementValue(numeric, fromUnit, canonicalUnit);
      if (!converted.ok || converted.value == null) {
        return {
          parameter,
          rawValue: rawValueStr,
          rawUnit,
          normalizedValue: null,
          normalizedUnitId: null,
          normalizationStatus: converted.status,
          normalizationMessage: converted.message,
          measuredValue: null,
          unit: fromUnit.code,
          issues: [
            ...issues,
            {
              code: 'UNIT_CONVERSION_FAILED',
              severity: 'error',
              message: converted.message ?? 'Unit conversion failed',
              path: 'rawUnit',
            },
          ],
        };
      }

      const precision = parameter.decimalPrecision;
      const normalized =
        precision != null
          ? Number(converted.value.toFixed(precision))
          : converted.value;

      return {
        parameter,
        rawValue: rawValueStr,
        rawUnit,
        normalizedValue: normalized,
        normalizedUnitId: canonicalUnit.id,
        normalizationStatus: 'NORMALIZED',
        normalizationMessage: null,
        measuredValue: normalized,
        unit: canonicalUnit.code,
        issues,
      };
    }

    return {
      parameter,
      rawValue: rawValueStr,
      rawUnit,
      normalizedValue: null,
      normalizedUnitId: null,
      normalizationStatus: 'FAILED',
      normalizationMessage: `Unsupported value type ${parameter.valueType}`,
      measuredValue: input.measuredValueHint ?? null,
      unit: rawUnit ?? 'NONE',
      issues: [
        ...issues,
        {
          code: 'VALUE_TYPE_UNSUPPORTED',
          severity: 'error',
          message: `Unsupported value type: ${parameter.valueType}`,
        },
      ],
    };
  }
}

/** Seed units + parameter catalog + unit mappings. No enum options. No lab results. */
export async function seedSoilParameterCatalog(
  repo: SoilLaboratoryRepository,
): Promise<void> {
  const existing = await repo.listMeasurementUnits(false);
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  for (const def of MEASUREMENT_UNIT_SEED) {
    await repo.upsertMeasurementUnit(buildMeasurementUnit(def, now));
  }
  for (const def of SOIL_PARAMETER_SEED) {
    await repo.upsertSoilParameter(buildSoilParameter(def, now));
    for (const mapping of buildParameterUnitMappings(def, now)) {
      await repo.upsertParameterUnit(mapping);
    }
  }
}
