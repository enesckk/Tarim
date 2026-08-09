export type {
  CropKnowledge,
  HardConstraintDef,
  NumericRange,
  TemperatureRange,
  PrecipitationRange,
} from '../knowledge/schemas/crop-knowledge.schema.js';

export interface CropSummary {
  id: string;
  name: string;
  category: string;
  reviewStatus: string;
  profileStatus: string;
  seasonalOrPerennial: string;
}
