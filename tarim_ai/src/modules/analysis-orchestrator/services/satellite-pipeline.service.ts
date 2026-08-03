import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { NormalizedGeometry } from '../../../types/geojson.types.js';
import type { SatelliteProduct } from '../../../types/satellite.types.js';
import { ApiError } from '../../../utils/api-error.js';
import { computeImageDimensions } from '../../../utils/geometry.utils.js';
import { assertValidPngImage } from '../../../utils/png.utils.js';
import { TRUE_COLOR_EVALSCRIPT } from '../../../evalscripts/true-color.evalscript.js';
import { NDVI_EVALSCRIPT } from '../../../evalscripts/ndvi.evalscript.js';
import { NDMI_EVALSCRIPT } from '../../../evalscripts/ndmi.evalscript.js';
import { BSI_EVALSCRIPT } from '../../../evalscripts/bsi.evalscript.js';
import { copernicusCatalogService } from '../../../services/copernicus-catalog.service.js';
import { copernicusProcessService } from '../../../services/copernicus-process.service.js';
import { selectBestProduct } from '../../../services/satellite-selection.service.js';
import {
  agriculturalAnalysisService,
  type AnalysisSummaryResponse,
} from '../../../services/agricultural-analysis.service.js';
import {
  timeSeriesService,
  type TimeSeriesResponse,
} from '../../../services/time-series.service.js';
import { getEnv } from '../../../config/env.js';

export interface SatellitePipelineResult {
  catalogProducts: SatelliteProduct[];
  candidateObservationCount: number;
  usableObservationCount: number;
  rejectedObservationCount: number;
  selected: SatelliteProduct | null;
  summary: AnalysisSummaryResponse | null;
  timeSeries: TimeSeriesResponse | null;
  images: {
    trueColor: { path: string; mimeType: string; url: string } | null;
    ndvi: { path: string; mimeType: string; url: string } | null;
    ndmi: { path: string; mimeType: string; url: string } | null;
    bsi: { path: string; mimeType: string; url: string } | null;
  };
  dateRange: { from: string; to: string } | null;
  warnings: string[];
}

function hasCopernicusCredentials(): boolean {
  const env = getEnv();
  return Boolean(env.COPERNICUS_CLIENT_ID?.trim() && env.COPERNICUS_CLIENT_SECRET?.trim());
}

export function isSentinelConfigured(): boolean {
  return hasCopernicusCredentials();
}

async function renderLayer(
  geometry: NormalizedGeometry,
  product: SatelliteProduct,
  type: 'true-color' | 'ndvi' | 'ndmi' | 'bsi',
  outDir: string,
  analysisId: string,
): Promise<{ path: string; mimeType: string; url: string }> {
  const evalscript =
    type === 'true-color'
      ? TRUE_COLOR_EVALSCRIPT
      : type === 'ndvi'
        ? NDVI_EVALSCRIPT
        : type === 'ndmi'
          ? NDMI_EVALSCRIPT
          : BSI_EVALSCRIPT;

  const { width, height } = computeImageDimensions(geometry);
  const imageBuffer = await copernicusProcessService.processImage({
    geometry,
    datetime: product.datetime,
    productId: product.id,
    tile: product.tile,
    cloudCoverage: product.cloudCoverage,
    evalscript,
    width,
    height,
  });

  assertValidPngImage(imageBuffer, `${type} PNG`);
  await mkdir(outDir, { recursive: true });
  const fileName = `${type}.png`;
  const filePath = join(outDir, fileName);
  await writeFile(filePath, imageBuffer);

  return {
    path: filePath,
    mimeType: 'image/png',
    url: `/api/analyses/${analysisId}/images/${type}`,
  };
}

export async function runSatellitePipeline(input: {
  geometry: NormalizedGeometry;
  analysisId: string;
  months?: number;
  days?: number;
  maxCloudCoverage?: number;
}): Promise<SatellitePipelineResult> {
  const warnings: string[] = [];
  const months = input.months ?? 6;
  const days = input.days ?? 90;
  const maxCloud = input.maxCloudCoverage ?? 30;
  const outDir = join(process.cwd(), 'storage', 'analyses', input.analysisId);

  if (!hasCopernicusCredentials()) {
    throw new ApiError(503, 'Sentinel credentials not configured', {
      code: 'SENTINEL_AUTH_FAILED',
    });
  }

  const products = await copernicusCatalogService.search({
    geometry: input.geometry,
    months,
  });

  const candidateObservationCount = products.length;
  const best = selectBestProduct(products);
  const usable = products.filter(
    (p) => p.cloudCoverage == null || p.cloudCoverage <= maxCloud,
  );
  const usableObservationCount = usable.length;
  const rejectedObservationCount = Math.max(
    0,
    candidateObservationCount - usableObservationCount,
  );

  if (!best) {
    throw new ApiError(422, 'No usable Sentinel observation found', {
      code: 'SENTINEL_NO_USABLE_OBSERVATION',
    });
  }

  const selected = best.product;
  const dateRange =
    products.length > 0
      ? {
          from: [...products].sort((a, b) => a.datetime.localeCompare(b.datetime))[0]!
            .datetime,
          to: [...products].sort((a, b) => b.datetime.localeCompare(a.datetime))[0]!
            .datetime,
        }
      : null;

  let summary: AnalysisSummaryResponse | null = null;
  try {
    summary = await agriculturalAnalysisService.computeBestAnalysisSummary({
      geometry: input.geometry,
      days,
    });
  } catch (err) {
    warnings.push(
      err instanceof Error ? `statistics: ${err.message}` : 'statistics failed',
    );
  }

  let timeSeries: TimeSeriesResponse | null = null;
  try {
    timeSeries = await timeSeriesService.computeTimeSeries({
      geometry: input.geometry,
      months,
      maxCloudCoverage: maxCloud,
    });
  } catch (err) {
    warnings.push(
      err instanceof Error ? `time_series: ${err.message}` : 'time_series failed',
    );
  }

  const images: SatellitePipelineResult['images'] = {
    trueColor: null,
    ndvi: null,
    ndmi: null,
    bsi: null,
  };

  for (const layer of ['true-color', 'ndvi', 'ndmi', 'bsi'] as const) {
    try {
      const rendered = await renderLayer(
        input.geometry,
        selected,
        layer,
        outDir,
        input.analysisId,
      );
      if (layer === 'true-color') images.trueColor = rendered;
      if (layer === 'ndvi') images.ndvi = rendered;
      if (layer === 'ndmi') images.ndmi = rendered;
      if (layer === 'bsi') images.bsi = rendered;
    } catch (err) {
      warnings.push(
        err instanceof Error
          ? `image_${layer}: ${err.message}`
          : `image_${layer} failed`,
      );
    }
  }

  return {
    catalogProducts: products,
    candidateObservationCount,
    usableObservationCount,
    rejectedObservationCount,
    selected,
    summary,
    timeSeries,
    images,
    dateRange,
    warnings,
  };
}

export function hashSafeSummary(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value ?? null))
    .digest('hex')
    .slice(0, 32);
}
