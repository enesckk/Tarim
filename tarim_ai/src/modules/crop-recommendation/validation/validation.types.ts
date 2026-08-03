export type ValidationOverallStatus =
  | 'ready_for_preliminary_use'
  | 'needs_review'
  | 'insufficient_data';

export interface ValidationReport {
  overallStatus: ValidationOverallStatus;
  dataReadiness: {
    parcel: string;
    sentinel: string;
    climate: string;
    soil: string;
    /** Optional terrain readiness (v1.2+). */
    terrain?: string;
    /** Optional surface readiness (v1.3+). */
    surface?: string;
    /** Optional land usability readiness (v1.4+). */
    landUsability?: string;
  };
  modelReadiness: {
    cropCount: number;
    knowledgeReviewStatus: string;
    calibrationStatus: string;
    fieldValidationAvailable: boolean;
  };
  criticalGaps: Array<{ code: string; message: string }>;
  recommendedNextActions: Array<{ priority: number; action: string }>;
  disclaimer: string;
  /** Optional terrain validation checks (backward compatible). */
  terrainChecks?: Array<{
    code: string;
    status: 'passed' | 'warning' | 'failed' | 'informational';
    message: string;
  }>;
  /** Optional surface validation checks (backward compatible). */
  surfaceChecks?: Array<{
    code: string;
    status: 'passed' | 'warning' | 'failed' | 'informational';
    message: string;
  }>;
  /** Optional land usability checks (v1.4+). */
  landUsabilityChecks?: Array<{
    code: string;
    status: 'passed' | 'warning' | 'failed' | 'informational';
    observedValue?: string | number | boolean | null;
    threshold?: string | number | null;
    expectedValue?: string | number | null;
    source?: string;
    message: string;
  }>;
}
