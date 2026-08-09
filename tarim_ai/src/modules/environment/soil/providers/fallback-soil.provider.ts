import type { SoilProvider } from './soil-provider.interface.js';
import type { SoilProviderInput, SoilProfile } from '../types/soil.types.js';
import { ApiError } from '../../../../utils/api-error.js';

export class FallbackSoilProvider implements SoilProvider {
  readonly name = 'fallback';

  constructor(
    private readonly primary: SoilProvider,
    private readonly mock: SoilProvider,
  ) {}

  async getProfile(input: SoilProviderInput): Promise<SoilProfile> {
    try {
      return await this.primary.getProfile(input);
    } catch (error) {
      const status = error instanceof ApiError ? error.statusCode : 502;
      console.warn('[SoilFallback] primary failed, using mock', {
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
          `${this.primary.name} erişilemediği için temsili mock toprak profili kullanılmıştır.`,
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
