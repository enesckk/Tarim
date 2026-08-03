import type { ConfidenceLevel } from '../../../utils/trend.utils.js';
import type { TimeSeriesResponse } from '../../../services/time-series.service.js';

export type SignalLevel = 'low' | 'medium' | 'high' | 'unknown';
export type SeasonName = 'winter' | 'spring' | 'summer' | 'autumn';

export type AgriculturalCycleSignal =
  | 'likely_annual_cycle'
  | 'likely_perennial'
  | 'likely_fallow_or_bare'
  | 'mixed'
  | 'insufficient_data';

export interface SurfaceEvidenceItem {
  code: string;
  message: string;
  value?: number;
  unit?: string;
}

export interface SeasonVegetationStats {
  observationCount: number;
  ndviMean: number | null;
  ndmiMean: number | null;
  bsiMean: number | null;
  lowNdviShare: number | null;
  highBsiShare: number | null;
}

export interface SurfacePersistenceResult {
  persistentVegetationSignal: SignalLevel;
  persistentBareSurfaceSignal: SignalLevel;
  lowNdviShare: number;
  highBsiShare: number;
  vegetatedShare: number;
  crossSeasonBareConsistency: number;
  messages: string[];
}

export interface SeasonalVegetationResult {
  bySeason: Record<SeasonName, SeasonVegetationStats>;
  peakSeason: SeasonName | 'unknown';
  activityLevel: SignalLevel;
  seasonalAmplitudeNdvi: number | null;
  messages: string[];
}

export interface AgriculturalCycleResult {
  signal: AgriculturalCycleSignal;
  confidence: ConfidenceLevel;
  evidence: SurfaceEvidenceItem[];
  messages: string[];
}

export interface ContinuousBareSurfaceResult {
  signal: SignalLevel;
  bareObservationShare: number;
  consecutiveBareHint: boolean;
  messages: string[];
}

export interface ProbableRockOrShallowSoilResult {
  riskLevel: SignalLevel;
  /** Informational 0–100 score; not a rock percentage. */
  informationalScore: number;
  evidence: SurfaceEvidenceItem[];
  /** Optional subtractive signals (backward compatible). */
  counterEvidence?: SurfaceEvidenceItem[];
  disclaimer: string;
}


export interface SurfaceDataQuality {
  successfulAcquisitionCount: number;
  selectedAcquisitionCount: number;
  failedAcquisitionCount: number;
  averageValidPixelRatio: number | null;
  seasonsWithObservations: number;
  seasonCoverageRatio: number;
  confidence: ConfidenceLevel;
  limitations: string[];
}

export interface SurfaceAnalysisAudit {
  modelVersion: string;
  calibrationVersion: string;
  inputsUsed: string[];
  rulesApplied: string[];
  evidenceSummary: string[];
  notes: string[];
}

export interface SurfaceAnalysisResponse {
  period: {
    start: string;
    end: string;
    months: number;
  };
  dataQuality: SurfaceDataQuality;
  surfacePersistence: SurfacePersistenceResult;
  seasonalVegetation: SeasonalVegetationResult;
  agriculturalCycle: AgriculturalCycleResult;
  continuousBareSurface: ContinuousBareSurfaceResult;
  probableRockOrShallowSoil: ProbableRockOrShallowSoilResult;
  audit: SurfaceAnalysisAudit;
  limitations: string[];
  /** Compact reference; does not replace /time-series. */
  sourceTimeSeries: {
    successfulAcquisitionCount: number;
    ndviMean: number | null;
    ndmiMean: number | null;
    bsiMean: number | null;
    trends: TimeSeriesResponse['trends'];
  };
}

export interface SurfaceCheckResult {
  code: string;
  status: 'passed' | 'warning' | 'failed' | 'informational';
  message: string;
}

export interface SuccessfulObservation {
  datetime: string;
  month: number;
  season: SeasonName;
  ndviMean: number;
  ndmiMean: number;
  bsiMean: number;
  validPixelRatio: number | null;
}
