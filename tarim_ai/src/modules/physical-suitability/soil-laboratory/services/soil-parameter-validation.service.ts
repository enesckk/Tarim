import { z } from 'zod';
import {
  NORMALIZATION_STATUSES,
  SOIL_MEASUREMENT_SCOPES,
  SOIL_PARAMETER_ALIAS_MATCH_TYPES,
  SOIL_PARAMETER_VALUE_TYPES,
  SOIL_VALUE_SOURCE_TYPES,
} from '../types/soil-parameter.types.js';

const verificationStatusSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

const nullableString = z.string().max(2000).nullable().optional();

export const soilParameterValueTypeSchema = z.enum(
  SOIL_PARAMETER_VALUE_TYPES as unknown as [string, ...string[]],
);
export const soilMeasurementScopeSchema = z.enum(
  SOIL_MEASUREMENT_SCOPES as unknown as [string, ...string[]],
);
export const soilValueSourceTypeSchema = z.enum(
  SOIL_VALUE_SOURCE_TYPES as unknown as [string, ...string[]],
);
export const normalizationStatusSchema = z.enum(
  NORMALIZATION_STATUSES as unknown as [string, ...string[]],
);
export const aliasMatchTypeSchema = z.enum(
  SOIL_PARAMETER_ALIAS_MATCH_TYPES as unknown as [string, ...string[]],
);

export const createSoilParameterSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Code must be UPPER_SNAKE_CASE'),
  canonicalName: z.string().min(1).max(500),
  turkishDisplayName: z.string().min(1).max(500),
  englishDisplayName: z.string().min(1).max(500),
  category: z.enum(['Chemical', 'Physical', 'Hydrological', 'FieldObservation', 'Nutrient']),
  subCategory: z
    .enum([
      'AciditySalinity',
      'OrganicMatter',
      'CationExchange',
      'Texture',
      'DensityPorosity',
      'Fragments',
      'Depth',
      'WaterRetention',
      'Hydraulic',
      'DrainageStructure',
      'SurfaceCondition',
      'Macronutrient',
      'Micronutrient',
    ])
    .nullable()
    .optional(),
  description: z.string().max(8000).nullable().optional(),
  canonicalUnitId: z.string().uuid().nullable().optional(),
  dataType: z.enum(['Decimal', 'Integer', 'Boolean', 'Text', 'Enum']),
  decimalPrecision: z.number().int().min(0).max(12).nullable().optional(),
  valueType: soilParameterValueTypeSchema,
  measurementScope: soilMeasurementScopeSchema.optional(),
  isDirectlyMeasured: z.boolean().optional(),
  isCalculated: z.boolean().optional(),
  isFieldObservation: z.boolean().optional(),
  isLaboratoryParameter: z.boolean().optional(),
  isRequiredForPhysicalSuitability: z.boolean().optional(),
  isRequiredForFertilityAssessment: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  source: nullableString,
  verificationStatus: verificationStatusSchema.optional(),
});

export const updateSoilParameterSchema = createSoilParameterSchema
  .omit({ code: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export const createSoilParameterAliasSchema = z.object({
  parameterId: z.string().uuid(),
  alias: z.string().min(1).max(500),
  language: z.string().max(16).nullable().optional(),
  laboratoryId: z.string().uuid().nullable().optional(),
  matchType: aliasMatchTypeSchema.optional(),
  priority: z.number().int().optional(),
});

export const updateSoilParameterAliasSchema = createSoilParameterAliasSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export const unitConvertSchema = z.object({
  value: z.number(),
  fromUnit: z.string().min(1).max(64),
  toUnit: z.string().min(1).max(64),
});

export const normalizeAnalysisResultSchema = z.object({
  resultId: z.string().uuid().optional(),
  parameterCode: z.string().min(1).max(128).optional(),
  rawValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  rawUnit: z.string().max(64).nullable().optional(),
  originalParameterName: nullableString,
  laboratoryId: z.string().uuid().nullable().optional(),
});

export const validateAnalysisResultSchema = z.object({
  resultId: z.string().uuid().optional(),
  parameterCode: z.string().min(1).max(128).optional(),
  rawValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  rawUnit: z.string().max(64).nullable().optional(),
  measuredValue: z.number().nullable().optional(),
  unit: z.string().max(64).optional(),
  valueSourceType: soilValueSourceTypeSchema.nullable().optional(),
});

export type CreateSoilParameterInput = z.infer<typeof createSoilParameterSchema>;
export type UpdateSoilParameterInput = z.infer<typeof updateSoilParameterSchema>;
export type CreateSoilParameterAliasInput = z.infer<typeof createSoilParameterAliasSchema>;
export type UpdateSoilParameterAliasInput = z.infer<typeof updateSoilParameterAliasSchema>;
export type UnitConvertInput = z.infer<typeof unitConvertSchema>;
export type NormalizeAnalysisResultInput = z.infer<typeof normalizeAnalysisResultSchema>;
export type ValidateAnalysisResultInput = z.infer<typeof validateAnalysisResultSchema>;
