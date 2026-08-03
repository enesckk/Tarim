import type {
  RiskLevel,
  ProviderInputBase,
  ProviderMetadata,
  ProviderLocation,
} from '../../shared/types/provider-metadata.types.js';

export type SoilProviderInput = ProviderInputBase;

export type SoilTexture =
  | 'clay'
  | 'clay_loam'
  | 'loam'
  | 'sandy_loam'
  | 'sand'
  | 'silt_loam'
  | 'unknown';

export type DrainageClass = 'poor' | 'moderate' | 'good' | 'unknown';
export type CapacityClass = 'low' | 'medium' | 'high' | 'unknown';
export type SuitabilityClass = 'poor' | 'moderate' | 'good';
export type SalinityRiskLevel = RiskLevel | 'unknown';

export interface SoilProfile {
  provider: string;
  location: ProviderLocation;
  soil: {
    ph: number;
    texture: SoilTexture;
    organicMatterPercent: number;
    electricalConductivityDsM: number | null;
    salinityRisk: SalinityRiskLevel;
    drainage: DrainageClass;
    waterHoldingCapacity: CapacityClass;
    calciumCarbonatePercent: number | null;
    depthCm: number | null;
  };
  suitabilitySignals: {
    rootDevelopment: SuitabilityClass;
    waterRetention: SuitabilityClass;
    salinityConstraint: SalinityRiskLevel;
    generalSoilCondition: SuitabilityClass;
  };
  confidence: RiskLevel;
  limitations: string[];
  metadata: ProviderMetadata;
}
