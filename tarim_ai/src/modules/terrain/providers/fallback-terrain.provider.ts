import type { TerrainProvider } from './terrain-provider.interface.js';
import type { DemSampleGrid, TerrainProviderInput } from '../types/terrain.types.js';
import { ApiError } from '../../../utils/api-error.js';

export class FallbackTerrainProvider implements TerrainProvider {
  readonly name = 'fallback';

  constructor(
    private readonly primary: TerrainProvider,
    private readonly mock: TerrainProvider,
  ) {}

  async getDemGrid(input: TerrainProviderInput): Promise<DemSampleGrid> {
    try {
      return await this.primary.getDemGrid(input);
    } catch (error) {
      const status = error instanceof ApiError ? error.statusCode : 502;
      console.warn('[TerrainFallback] primary failed, using mock', {
        primary: this.primary.name,
        status,
        message: error instanceof Error ? error.message : 'unknown',
      });

      const mockGrid = await this.mock.getDemGrid(input);
      return {
        ...mockGrid,
        provider: 'mock-fallback',
        providerStatus: 'ok',
        isMock: true,
        isEstimated: true,
        fallbackUsed: true,
        limitations: [
          ...mockGrid.limitations,
          `${this.primary.name} erişilemediği için temsili mock DEM kullanılmıştır.`,
        ],
        metadata: {
          ...mockGrid.metadata,
          source: mockGrid.metadata.source,
          provider: 'mock-fallback',
          providerMode: 'fallback',
          isMock: true,
          isEstimated: true,
          fallbackFrom: this.primary.name,
          fallbackUsed: true,
          generatedAt: new Date().toISOString(),
        },
      };
    }
  }
}
