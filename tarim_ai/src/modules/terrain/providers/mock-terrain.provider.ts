import type { NormalizedGeometry } from '../../../types/geojson.types.js';
import type { DemSampleGrid, TerrainProviderInput } from '../types/terrain.types.js';
import type { TerrainProvider } from './terrain-provider.interface.js';
import {
  cellCenter,
  createEmptyGrid,
  indexOf,
  pointInGeometry,
} from '../utils/dem-grid.utils.js';
import { hashString } from '../utils/terrain-stats.utils.js';

export type MockTerrainProfileKind =
  | 'auto'
  | 'flat'
  | 'gentle'
  | 'steep'
  | 'sparse'
  | 'low_coverage';

/**
 * Deterministic DEM mock for Gaziantep-like elevations (~800–900 m).
 * Same geometry always yields the same grid.
 */
export class MockTerrainProvider implements TerrainProvider {
  readonly name = 'mock';

  constructor(
    private readonly options: {
      profile?: MockTerrainProfileKind;
      resolutionMeters?: number;
    } = {},
  ) {}

  async getDemGrid(input: TerrainProviderInput): Promise<DemSampleGrid> {
    const geometry = input.geometry as NormalizedGeometry;
    const resolution = this.options.resolutionMeters ?? 30;
    const profile = this.resolveProfile(input);
    const maxCells = profile === 'sparse' ? 4 : 40;
    const grid = createEmptyGrid(geometry, resolution, maxCells);

    const seed = hashString(
      `${input.centroid.longitude.toFixed(5)}|${input.centroid.latitude.toFixed(5)}|${profile}`,
    );
    const baseElevation = 820 + (seed % 40);

    let insideCount = 0;
    const totalCells = grid.width * grid.height;

    for (let row = 0; row < grid.height; row += 1) {
      for (let col = 0; col < grid.width; col += 1) {
        const { lon, lat } = cellCenter(grid, col, row);
        const inside = pointInGeometry(lon, lat, geometry);
        const idx = indexOf(grid.width, col, row);
        if (!inside) {
          grid.elevations[idx] = null;
          continue;
        }
        insideCount += 1;

        if (profile === 'low_coverage' && (col + row) % 3 !== 0) {
          grid.elevations[idx] = null;
          continue;
        }

        const nx = grid.width <= 1 ? 0 : col / (grid.width - 1);
        const ny = grid.height <= 1 ? 0 : row / (grid.height - 1);
        const undulation =
          Math.sin((seed % 97) * 0.01 + nx * 6) * 2 +
          Math.cos((seed % 53) * 0.02 + ny * 5) * 1.5;

        let elevation = baseElevation + undulation;
        if (profile === 'flat') {
          elevation = baseElevation + undulation * 0.15 + ny * 1.5;
        } else if (profile === 'gentle') {
          elevation = baseElevation + ny * 18 + nx * 6 + undulation;
        } else if (profile === 'steep') {
          elevation = baseElevation + ny * 55 + nx * 20 + undulation * 2;
        } else if (profile === 'sparse') {
          elevation = baseElevation + ny * 10 + undulation;
        } else {
          // auto: mild SE Anatolia undulation
          elevation = baseElevation + ny * 22 + nx * 8 + undulation;
        }

        grid.elevations[idx] = Math.round(elevation * 10) / 10;
      }
    }

    const validCount = grid.elevations.filter((v) => v != null).length;
    const coverageRatio = totalCells > 0 ? validCount / totalCells : 0;

    return {
      ...grid,
      provider: 'mock',
      providerStatus: 'ok',
      isMock: true,
      isEstimated: true,
      fallbackUsed: false,
      limitations: [
        'Bu arazi profili geliştirme amaçlı temsili DEM verisidir.',
        'Gerçek Copernicus DEM GLO-30 ölçümü değildir.',
      ],
      metadata: {
        source: 'mock-terrain-provider',
        provider: 'mock',
        providerMode: 'mock',
        generatedAt: new Date().toISOString(),
        isMock: true,
        isEstimated: true,
        mockProfile: profile,
        insideCellCount: insideCount,
        coverageRatio,
      },
    };
  }

  private resolveProfile(input: TerrainProviderInput): MockTerrainProfileKind {
    if (this.options.profile && this.options.profile !== 'auto') {
      return this.options.profile;
    }
    // Deterministic auto selection from centroid hash — default gentle-like
    const seed = hashString(
      `${input.centroid.longitude.toFixed(4)}:${input.centroid.latitude.toFixed(4)}`,
    );
    const bucket = seed % 10;
    if (bucket < 2) return 'flat';
    if (bucket < 8) return 'gentle';
    return 'steep';
  }
}
