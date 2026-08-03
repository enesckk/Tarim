import type { SurfaceAnalysisResponse } from '../../satellite/surface-analysis/surface-analysis.types.js';
import type { NormalizedSurfaceEvidence } from '../types/land-usability.types.js';

/**
 * Adapts current surface-analysis response into a stable evidence contract.
 * Does not invent canonical fields (e.g. persistentOpenSurfaceRatio stays null when absent).
 * lowNdviShare is never silently aliased to persistentOpenSurfaceRatio.
 */
export function normalizeSurfaceEvidence(
  analysis: SurfaceAnalysisResponse | null | undefined,
): NormalizedSurfaceEvidence | null {
  if (!analysis) {
    return null;
  }

  const availableSignals: string[] = [];
  const missingCanonicalFields: string[] = ['persistentOpenSurfaceRatio'];

  const persistence = analysis.surfacePersistence;
  if (persistence) {
    availableSignals.push(
      'lowNdviShare',
      'highBsiShare',
      'vegetatedShare',
      'persistentBareSurfaceSignal',
      'persistentVegetationSignal',
    );
  }
  if (analysis.seasonalVegetation?.seasonalAmplitudeNdvi != null) {
    availableSignals.push('seasonalAmplitudeNdvi');
  }
  if (analysis.agriculturalCycle?.signal) {
    availableSignals.push('agriculturalCycle.signal');
  }
  if (analysis.probableRockOrShallowSoil) {
    availableSignals.push(
      'probableRockOrShallowSoil.informationalScore',
      'probableRockOrShallowSoil.riskLevel',
    );
  }
  if (analysis.continuousBareSurface) {
    availableSignals.push('continuousBareSurface.signal');
  }

  const cycle = analysis.agriculturalCycle?.signal ?? null;
  const cycleDetected =
    cycle === 'likely_annual_cycle' || cycle === 'likely_perennial';

  return {
    providerReal: true,
    usableObservationCount: analysis.dataQuality.successfulAcquisitionCount,
    seasonsRepresented: analysis.dataQuality.seasonsWithObservations,
    dataConfidence: analysis.dataQuality.confidence,
    persistentOpenSurfaceRatio: null,
    lowNdviShare: persistence?.lowNdviShare ?? null,
    highBsiShare: persistence?.highBsiShare ?? null,
    vegetatedShare: persistence?.vegetatedShare ?? null,
    seasonalAmplitude: analysis.seasonalVegetation?.seasonalAmplitudeNdvi ?? null,
    agriculturalCycleClassification: cycle,
    agriculturalCycleDetected: cycleDetected,
    probableRockScore: analysis.probableRockOrShallowSoil?.informationalScore ?? null,
    probableRockClassification:
      analysis.probableRockOrShallowSoil?.riskLevel ?? null,
    availableSignals,
    missingCanonicalFields,
  };
}

export function rockRank(classification: string | null | undefined): number {
  switch (classification) {
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'medium_high':
      return 3;
    case 'high':
    case 'very_high':
      return 4;
    default:
      return 0;
  }
}

/** Map calibration class names onto our rockRank scale. */
export function rockClassMeetsMinimum(
  classification: string | null | undefined,
  minimumClass: string,
): boolean {
  return rockRank(classification) >= rockRank(minimumClass);
}
