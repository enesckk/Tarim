import type { SuitabilityClassification } from '../rules/scoring-thresholds.js';
import type { ConstraintSeverity } from '../rules/scoring-thresholds.js';

export interface ScoreFactor {
  code: string;
  score: number;
  maxScore: number;
  observed?: number | string | null;
  message: string;
}

export interface CategoryBreakdown {
  score: number;
  maxScore: number;
  factors: ScoreFactor[];
}

export interface SuitabilityScoreBreakdown {
  climate: CategoryBreakdown;
  soil: CategoryBreakdown;
  sentinel: CategoryBreakdown;
  reliability: CategoryBreakdown;
}

export interface EvaluatedConstraint {
  code: string;
  severity: ConstraintSeverity;
  penalty: number;
  group?: string;
  observedValue: number | string | boolean | null;
  requiredRange?: { min?: number; max?: number };
  message: string;
}

export interface SuitabilityScoreResult {
  gross: number;
  constraintPenalty: number;
  final: number;
  classification: SuitabilityClassification;
  label: string;
  breakdown: SuitabilityScoreBreakdown;
  constraints: EvaluatedConstraint[];
}
