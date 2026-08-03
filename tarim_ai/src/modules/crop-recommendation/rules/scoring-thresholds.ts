import type { RiskLevel } from '../../environment/shared/types/provider-metadata.types.js';

export type SuitabilityClassification =
  | 'very_high'
  | 'high'
  | 'moderate'
  | 'low'
  | 'very_low';

export const CLASSIFICATION_THRESHOLDS: Array<{
  min: number;
  max: number;
  classification: SuitabilityClassification;
  label: string;
}> = [
  {
    min: 85,
    max: 100,
    classification: 'very_high',
    label: 'Mevcut verilere göre çok yüksek uygunluk sinyali',
  },
  {
    min: 70,
    max: 84.99,
    classification: 'high',
    label: 'Mevcut verilere göre yüksek uygunluk sinyali',
  },
  {
    min: 55,
    max: 69.99,
    classification: 'moderate',
    label: 'Mevcut verilere göre orta düzey uygunluk sinyali',
  },
  {
    min: 40,
    max: 54.99,
    classification: 'low',
    label: 'Mevcut verilere göre düşük uygunluk sinyali',
  },
  {
    min: 0,
    max: 39.99,
    classification: 'very_low',
    label: 'Mevcut verilere göre çok düşük uygunluk sinyali',
  },
];

export const CONSTRAINT_PENALTIES = {
  critical: 25,
  major: 12,
  moderate: 5,
} as const;

export type ConstraintSeverity = keyof typeof CONSTRAINT_PENALTIES;

/**
 * Compatibility matrix: cropTolerance × observedRisk → score ratio 0..1
 */
export const RISK_COMPATIBILITY_TABLE: Record<
  RiskLevel,
  Record<RiskLevel, number>
> = {
  low: { low: 1, medium: 0.45, high: 0.1 },
  medium: { low: 1, medium: 0.85, high: 0.4 },
  high: { low: 1, medium: 0.95, high: 0.8 },
};

/**
 * Irrigation: crop irrigationDependency vs climate estimatedIrrigationNeed.
 */
export const IRRIGATION_COMPATIBILITY_TABLE: Record<
  RiskLevel,
  Record<RiskLevel, number>
> = {
  low: { low: 1, medium: 0.7, high: 0.35 },
  medium: { low: 0.85, medium: 1, high: 0.7 },
  high: { low: 0.55, medium: 0.85, high: 1 },
};

export const DRAINAGE_ORDINAL: Record<'poor' | 'moderate' | 'good', number> = {
  poor: 0,
  moderate: 1,
  good: 2,
};

export const KNOWLEDGE_BASE_VERSION = '1.0';
export const SCORING_MODEL_VERSION = '1.0';

export const MAX_STRENGTHS = 4;
export const MAX_RISKS = 4;
export const MAX_REQUIRED_VERIFICATIONS = 4;
export const MAX_NOT_RECOMMENDED = 3;
export const NOT_RECOMMENDED_SCORE_THRESHOLD = 40;
