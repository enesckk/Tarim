import type { ClimateProvider } from './climate-provider.interface.js';
import type { ClimateProviderInput, ClimateProfile } from '../types/climate.types.js';
import { ApiError } from '../../../../utils/api-error.js';

/**
 * Tries primary provider first; on failure returns mock profile marked as fallback.
 * Never presents fallback mock data as real observations.
 */
export class FallbackClimateProvider implements ClimateProvider {
  readonly name = 'fallback';

  constructor(
    private readonly primary: ClimateProvider,
    private readonly mock: ClimateProvider,
  ) {}

  async getProfile(input: ClimateProviderInput): Promise<ClimateProfile> {
    try {
      return await this.primary.getProfile(input);
    } catch (error) {
      const status = error instanceof ApiError ? error.statusCode : 502;
      console.warn('[ClimateFallback] primary failed, using mock', {
        primary: this.primary.name,
        status,
        message: error instanceof Error ? error.message : 'unknown',
      });

      const mockProfile = await this.mock.getProfile(input);
      return {
        ...mockProfile,
        provider: 'mock-fallback',
        confidence: 'low',
        limitations: [
          ...mockProfile.limitations,
          `${this.primary.name} erişilemediği için temsili mock iklim profili kullanılmıştır.`,
        ],
        metadata: {
          ...mockProfile.metadata,
          source: mockProfile.metadata.source,
          provider: 'mock-fallback',
          isMock: true,
          isEstimated: true,
          fallbackFrom: this.primary.name,
          generatedAt: new Date().toISOString(),
          mockReason: error instanceof Error ? error.message : 'Unknown provider error',
          fallbackPolicy: 'LIVE_REJECTED_IF_STRICT',
          mockStartedAt: new Date().toISOString(),
          mockFinishedAt: new Date().toISOString(),
        },
      };
    }
  }
}
