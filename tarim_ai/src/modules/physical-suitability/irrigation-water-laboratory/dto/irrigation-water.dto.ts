/**
 * Phase 2.2G DTO barrel — re-exports validation input types and domain entities.
 */
export type {
  CreateWaterAnalysisResultInput,
  CreateWaterCustodyInput,
  CreateWaterParameterInput,
  CreateWaterSampleInput,
  CreateWaterSourceInput,
  NormalizeWaterAnalysisResultInput,
  UpdateWaterAnalysisResultInput,
  UpdateWaterParameterInput,
  UpdateWaterSampleInput,
  UpdateWaterSampleStatusInput,
  UpdateWaterSourceInput,
} from '../services/irrigation-water-validation.service.js';

export type {
  IrrigationWaterAnalysis,
  WaterAnalysisResult,
  WaterDerivedIndicator,
  WaterParameter,
  WaterParameterCatalog,
  WaterSample,
  WaterSampleChainOfCustody,
  WaterSource,
} from '../types/irrigation-water.types.js';
