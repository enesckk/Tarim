import type { SoilProvider } from './soil-provider.interface.js';
import type { SoilProfile, SoilProviderInput } from '../types/soil.types.js';

/**
 * Representative soil profile for development.
 * Explicitly mock — not a laboratory analysis substitute.
 */
export class MockSoilProvider implements SoilProvider {
  readonly name = 'mock';

  async getProfile(input: SoilProviderInput): Promise<SoilProfile> {
    return {
      provider: 'mock',
      location: input.centroid,
      soil: {
        ph: 7.8,
        texture: 'clay_loam',
        organicMatterPercent: 1.4,
        electricalConductivityDsM: 1.1,
        salinityRisk: 'medium',
        drainage: 'moderate',
        waterHoldingCapacity: 'medium',
        calciumCarbonatePercent: 12.5,
        depthCm: 90,
      },
      suitabilitySignals: {
        rootDevelopment: 'moderate',
        waterRetention: 'moderate',
        salinityConstraint: 'medium',
        generalSoilCondition: 'moderate',
      },
      confidence: 'low',
      limitations: [
        'Bu toprak profili geliştirme amaçlı temsili veridir ve laboratuvar analizinin yerini tutmaz.',
      ],
      metadata: {
        source: 'mock-soil-provider',
        provider: 'mock',
        generatedAt: new Date().toISOString(),
        isMock: true,
        isEstimated: true,
      },
    };
  }
}
