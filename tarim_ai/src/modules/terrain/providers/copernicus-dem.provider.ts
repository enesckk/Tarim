import axios from 'axios';
import { getEnv, type Env } from '../../../config/env.js';
import { ApiError } from '../../../utils/api-error.js';
import { readFloatRasterBandWithMeta } from '../../../utils/geotiff.utils.js';
import { getPolygonAreaSqMeters } from '../../../utils/geometry.utils.js';
import type { NormalizedGeometry } from '../../../types/geojson.types.js';
import { copernicusAuthService } from '../../../services/copernicus-auth.service.js';
import type { DemSampleGrid, TerrainProviderInput } from '../types/terrain.types.js';
import type { TerrainProvider } from './terrain-provider.interface.js';
import {
  cellCenter,
  createEmptyGrid,
  pointInGeometry,
} from '../utils/dem-grid.utils.js';
import { isValidElevation } from '../utils/terrain-stats.utils.js';

const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';

const DEM_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: ["DEM"],
    output: { bands: 1, sampleType: "FLOAT32" }
  };
}
function evaluatePixel(sample) {
  return [sample.DEM];
}`;

export interface CopernicusDemConfig {
  baseUrl: string;
  demInstance: string;
  timeoutMs: number;
  enabled: boolean;
  maxRetries: number;
}

export function copernicusDemConfigFromEnv(env: Env = getEnv()): CopernicusDemConfig {
  return {
    baseUrl: env.COPERNICUS_BASE_URL,
    demInstance: env.TERRAIN_DEM_INSTANCE,
    timeoutMs: env.TERRAIN_DEM_TIMEOUT_MS,
    enabled: env.TERRAIN_DEM_ENABLED,
    maxRetries: 2,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Copernicus DEM GLO-30 via CDSE Sentinel Hub Process API.
 * Analysis grid dimensions match the Process API request 1:1; parcel mask applied.
 */
export class CopernicusDemProvider implements TerrainProvider {
  readonly name = 'copernicus-dem';

  constructor(private readonly config: CopernicusDemConfig = copernicusDemConfigFromEnv()) {}

  async getDemGrid(input: TerrainProviderInput): Promise<DemSampleGrid> {
    if (!this.config.enabled) {
      throw new ApiError(503, 'Copernicus DEM provider is not configured', {
        providerStatus: 'not_configured',
        hint: 'Set TERRAIN_DEM_ENABLED=true and ensure CDSE Process API DEM access is available',
      });
    }

    const geometry = input.geometry as NormalizedGeometry;
    const resolution = 30;
    // Align analysis grid with Process API output (1:1, no remapping).
    const grid = createEmptyGrid(geometry, resolution, 64);
    const width = grid.width;
    const height = grid.height;

    if (width < 3 || height < 3) {
      throw new ApiError(422, 'DEM raster dimensions are insufficient for terrain derivatives', {
        providerStatus: 'unavailable',
        width,
        height,
      });
    }

    const buffer = await this.fetchDemTiff(geometry, width, height);
    const band = await readFloatRasterBandWithMeta(buffer, 'Copernicus DEM');

    if (band.width * band.height < 1) {
      throw new ApiError(502, 'Copernicus DEM returned an empty raster');
    }

    // Prefer Process API requested dimensions; geotiff may report the same.
    const rasterWidth = band.width || width;
    const rasterHeight = band.height || height;
    if (rasterWidth !== width || rasterHeight !== height) {
      // Soft mismatch: still map by nearest index within Process API size we requested.
      console.warn('[CopernicusDEM] raster dimension mismatch', {
        requested: { width, height },
        received: { width: rasterWidth, height: rasterHeight },
      });
    }

    const elevations: Array<number | null> = [];
    let insideParcelCount = 0;
    let noDataInsideCount = 0;

    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const { lon, lat } = cellCenter(grid, col, row);
        if (!pointInGeometry(lon, lat, geometry)) {
          elevations.push(null);
          continue;
        }
        insideParcelCount += 1;

        const srcCol = Math.min(
          rasterWidth - 1,
          Math.max(0, Math.round((col / Math.max(1, width - 1)) * (rasterWidth - 1))),
        );
        const srcRow = Math.min(
          rasterHeight - 1,
          Math.max(0, Math.round((row / Math.max(1, height - 1)) * (rasterHeight - 1))),
        );
        const raw = band.values[srcRow * rasterWidth + srcCol];
        if (
          raw == null ||
          !Number.isFinite(raw) ||
          (band.noData != null && raw === band.noData) ||
          !isValidElevation(raw) ||
          raw < -500 ||
          raw > 9000
        ) {
          elevations.push(null);
          noDataInsideCount += 1;
        } else {
          elevations.push(raw);
        }
      }
    }

    const validCount = elevations.filter((v) => v != null).length;
    if (validCount < 1) {
      throw new ApiError(422, 'Copernicus DEM returned no valid elevation samples for parcel', {
        insideParcelCount,
        noDataInsideCount,
      });
    }

    const area = input.parcelAreaSquareMeters || getPolygonAreaSqMeters(geometry);

    return {
      ...grid,
      width,
      height,
      elevations,
      provider: 'copernicus-dem',
      providerStatus: 'ok',
      isMock: false,
      isEstimated: false,
      fallbackUsed: false,
      limitations: [
        `Rakım değerleri Copernicus DEM (${this.config.demInstance}, ~${resolution} m) kaynağındandır.`,
        'Küçük parsellerde örnek sayısı ve confidence düşebilir.',
        'Terrain türevleri parsel maskesi içindeki geçerli hücrelerden üretilir.',
      ],
      metadata: {
        source: 'copernicus-dem-process-api',
        provider: 'copernicus-dem',
        providerMode: 'copernicus-dem',
        generatedAt: new Date().toISOString(),
        isMock: false,
        isEstimated: false,
        demInstance: this.config.demInstance,
        dataset: this.config.demInstance,
        requestedResolutionMeters: resolution,
        effectiveResolutionMeters: resolution,
        processWidth: rasterWidth,
        processHeight: rasterHeight,
        insideParcelPixelCount: insideParcelCount,
        noDataPixelCount: noDataInsideCount,
        validPixelCount: validCount,
        parcelAreaSquareMeters: area,
      },
    };
  }

  private async fetchDemTiff(
    geometry: NormalizedGeometry,
    width: number,
    height: number,
  ): Promise<Buffer> {
    const requestBody = {
      input: {
        bounds: {
          geometry,
          properties: { crs: CRS84 },
        },
        data: [
          {
            type: 'dem',
            dataFilter: {
              demInstance: this.config.demInstance,
            },
          },
        ],
      },
      output: {
        width,
        height,
        responses: [
          {
            identifier: 'default',
            format: { type: 'image/tiff' },
          },
        ],
      },
      evalscript: DEM_EVALSCRIPT,
    };

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      try {
        const token = await copernicusAuthService.getAccessToken();
        const response = await axios.post(
          `${this.config.baseUrl}/api/v1/process`,
          requestBody,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'image/tiff',
            },
            responseType: 'arraybuffer',
            timeout: this.config.timeoutMs,
            validateStatus: () => true,
          },
        );

        if (response.status === 429) {
          if (attempt < this.config.maxRetries) {
            await sleep(500 * 2 ** attempt);
            continue;
          }
          throw new ApiError(429, 'Copernicus DEM rate limit exceeded', {
            providerStatus: 'unavailable',
          });
        }

        if (response.status === 401 || response.status === 403) {
          throw new ApiError(503, 'Copernicus DEM authentication/authorization failed', {
            providerStatus: 'unavailable',
            status: response.status,
          });
        }
        if (response.status === 400 || response.status === 404) {
          throw new ApiError(503, 'Copernicus DEM collection is not available for this account', {
            providerStatus: 'not_configured',
            status: response.status,
          });
        }
        if (response.status < 200 || response.status >= 300) {
          throw new ApiError(502, 'Copernicus DEM Process API request failed', {
            providerStatus: 'unavailable',
            status: response.status,
          });
        }

        const buffer = Buffer.from(response.data);
        if (buffer.length < 8) {
          throw new ApiError(502, 'Copernicus DEM response is empty');
        }
        return buffer;
      } catch (error) {
        lastError = error;
        if (error instanceof ApiError) {
          if (error.statusCode === 429 && attempt < this.config.maxRetries) {
            await sleep(500 * 2 ** attempt);
            continue;
          }
          throw error;
        }
        if (attempt < this.config.maxRetries) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
      }
    }

    if (lastError instanceof ApiError) {
      throw lastError;
    }
    throw new ApiError(502, 'Copernicus DEM request failed', {
      providerStatus: 'unavailable',
    });
  }
}
