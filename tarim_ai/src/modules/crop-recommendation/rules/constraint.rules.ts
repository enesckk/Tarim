import type { ConstraintSeverity } from './scoring-thresholds.js';
import { ScoreCalibrationService } from '../calibration/score-calibration.service.js';

const calibration = new ScoreCalibrationService();

export function penaltyForSeverity(severity: ConstraintSeverity): number {
  return calibration.penalty(severity);
}

/** Groups related salinity constraints so EC + risk do not stack unboundedly. */
export const CONSTRAINT_GROUPS = {
  SALINITY: 'SALINITY',
  PH: 'PH',
  DRAINAGE: 'DRAINAGE',
  DEPTH: 'DEPTH',
  TEMPERATURE: 'TEMPERATURE',
  FROST: 'FROST',
} as const;
