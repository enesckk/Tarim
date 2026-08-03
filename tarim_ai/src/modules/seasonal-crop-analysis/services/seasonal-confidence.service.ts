import type {
  ConfidenceResult,
  OverallSuitabilityResult,
  ResolvedInputValue,
} from '../types/seasonal-crop-analysis.types.js';

/**
 * Confidence reflects how well-grounded the inputs and scoring are — it is
 * kept fully separate from the physical suitability score itself. A crop can
 * have a high physical score with low confidence (e.g. modelled-only soil
 * data) or vice versa.
 */
export class SeasonalConfidenceService {
  build(input: {
    resolvedInputs: ResolvedInputValue[];
    overall: OverallSuitabilityResult;
    hasSoilLabReport: boolean;
    hasFieldSurvey: boolean;
  }): ConfidenceResult {
    const reasons: string[] = [];
    const measuredCount = input.resolvedInputs.filter(
      (r) => r.selectedSourceType === 'Laboratory' || r.selectedSourceType === 'FieldMeasurement',
    ).length;
    const modelledCount = input.resolvedInputs.filter(
      (r) => r.selectedSourceType === 'GlobalModel' || r.selectedSourceType === 'UserDeclared',
    ).length;

    if (input.hasSoilLabReport) reasons.push('soil_laboratory_report_used');
    if (input.hasFieldSurvey) reasons.push('field_survey_used');
    if (measuredCount > 0) reasons.push(`measured_inputs:${measuredCount}`);
    if (modelledCount > 0) reasons.push(`modelled_or_declared_inputs:${modelledCount}`);

    if (input.overall.classification === 'preliminary_only') {
      reasons.push('no_calibrated_scoring_source');
      return { level: 'low', reasons };
    }
    if (input.overall.classification === 'blocked_by_barrier') {
      reasons.push('blocked_before_scoring');
      return { level: 'medium', reasons };
    }

    if (input.hasSoilLabReport && measuredCount >= 2) {
      return { level: 'high', reasons };
    }
    if (measuredCount > 0 || input.hasFieldSurvey) {
      return { level: 'medium', reasons };
    }
    reasons.push('modelled_data_only');
    return { level: 'low', reasons };
  }
}
