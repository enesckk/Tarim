import path from 'node:path';
import fs from 'node:fs/promises';
import type { Request, Response, NextFunction } from 'express';
import { satelliteSearchSchema, timeSeriesRequestSchema } from '../schemas/satellite.schema.js';
import { surfaceAnalysisRequestSchema } from '../modules/satellite/surface-analysis/surface-analysis.schemas.js';
import type { SurfaceAnalysisOrchestratorService } from '../modules/satellite/surface-analysis/surface-analysis-orchestrator.service.js';
import { surfaceAnalysisResponseSchema } from '../modules/satellite/surface-analysis/surface-analysis.schemas.js';
import { copernicusCatalogService } from '../services/copernicus-catalog.service.js';
import { copernicusProcessService } from '../services/copernicus-process.service.js';
import {
  selectAndSortProducts,
  selectBestProduct,
  selectLatestProduct,
} from '../services/satellite-selection.service.js';
import { agriculturalAnalysisService } from '../services/agricultural-analysis.service.js';
import { indexStatisticsService } from '../services/index-statistics.service.js';
import { ndviStatisticsService } from '../services/ndvi-statistics.service.js';
import { timeSeriesService } from '../services/time-series.service.js';
import { TRUE_COLOR_EVALSCRIPT } from '../evalscripts/true-color.evalscript.js';
import { NDVI_EVALSCRIPT } from '../evalscripts/ndvi.evalscript.js';
import {
  computeImageDimensions,
  normalizeGeoJsonGeometry,
} from '../utils/geometry.utils.js';
import { formatFilenameTimestamp } from '../utils/date.utils.js';
import { assertValidPngImage } from '../utils/png.utils.js';
import { ApiError } from '../utils/api-error.js';
import type {
  BestImageOutputResult,
  ImageOutputResult,
  SatelliteProduct,
} from '../types/satellite.types.js';
import type { NormalizedGeometry } from '../types/geojson.types.js';

const OUTPUTS_DIR = path.resolve(process.cwd(), 'outputs');

export async function searchSatellite(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = satelliteSearchSchema.parse(req.body);
    const geometry = normalizeGeoJsonGeometry(body.geometry);
    const products = await copernicusCatalogService.search({
      geometry,
      days: body.days,
    });
    const result = selectAndSortProducts(products);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function latestTrueColor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = satelliteSearchSchema.parse(req.body);
    const geometry = normalizeGeoJsonGeometry(body.geometry);
    const result = await renderSelectedImage(geometry, body.days, 'true-color', 'latest');
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function latestNdvi(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = satelliteSearchSchema.parse(req.body);
    const geometry = normalizeGeoJsonGeometry(body.geometry);
    const result = await renderSelectedImage(geometry, body.days, 'ndvi', 'latest');
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function bestTrueColor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = satelliteSearchSchema.parse(req.body);
    const geometry = normalizeGeoJsonGeometry(body.geometry);
    const result = await renderSelectedImage(geometry, body.days, 'true-color', 'best');
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function bestNdvi(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = satelliteSearchSchema.parse(req.body);
    const geometry = normalizeGeoJsonGeometry(body.geometry);
    const result = await renderSelectedImage(geometry, body.days, 'ndvi', 'best');
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function bestNdviStatistics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = satelliteSearchSchema.parse(req.body);
    const geometry = normalizeGeoJsonGeometry(body.geometry);
    const result = await ndviStatisticsService.computeBestNdviStatistics({
      geometry,
      days: body.days,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function bestNdmiStatistics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = satelliteSearchSchema.parse(req.body);
    const geometry = normalizeGeoJsonGeometry(body.geometry);
    const result = await indexStatisticsService.computeBestNdmiStatistics({
      geometry,
      days: body.days,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function bestBsiStatistics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = satelliteSearchSchema.parse(req.body);
    const geometry = normalizeGeoJsonGeometry(body.geometry);
    const result = await indexStatisticsService.computeBestBsiStatistics({
      geometry,
      days: body.days,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function bestAnalysisSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = satelliteSearchSchema.parse(req.body);
    const geometry = normalizeGeoJsonGeometry(body.geometry);
    const result = await agriculturalAnalysisService.computeBestAnalysisSummary({
      geometry,
      days: body.days,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function timeSeries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = timeSeriesRequestSchema.parse(req.body);
    const geometry = normalizeGeoJsonGeometry(body.geometry);
    const result = await timeSeriesService.computeTimeSeries({
      geometry,
      months: body.months,
      maxCloudCoverage: body.maxCloudCoverage,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export function createSurfaceAnalysisHandlers(
  orchestrator: SurfaceAnalysisOrchestratorService,
) {
  const surfaceAnalysis = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = surfaceAnalysisRequestSchema.parse(req.body);
      const result = await orchestrator.analyze({
        geometry: body.geometry,
        parcelQuery: body.parcelQuery,
        months: body.months,
        maxCloudCoverage: body.maxCloudCoverage,
      });
      res.json(surfaceAnalysisResponseSchema.parse(result));
    } catch (error) {
      next(error);
    }
  };

  const surfacePersistence = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = surfaceAnalysisRequestSchema.parse(req.body);
      const full = await orchestrator.analyze({
        geometry: body.geometry,
        parcelQuery: body.parcelQuery,
        months: body.months,
        maxCloudCoverage: body.maxCloudCoverage,
      });
      res.json({
        period: full.period,
        dataQuality: full.dataQuality,
        surfacePersistence: full.surfacePersistence,
        continuousBareSurface: full.continuousBareSurface,
        probableRockOrShallowSoil: full.probableRockOrShallowSoil,
        audit: full.audit,
        limitations: full.limitations,
      });
    } catch (error) {
      next(error);
    }
  };

  return { surfaceAnalysis, surfacePersistence };
}

async function renderSelectedImage(
  geometry: NormalizedGeometry,
  days: number,
  type: 'true-color' | 'ndvi',
  mode: 'latest' | 'best',
): Promise<ImageOutputResult | BestImageOutputResult> {
  const products = await copernicusCatalogService.search({ geometry, days });

  let selected: SatelliteProduct;
  let selectionReason: string | undefined;

  if (mode === 'best') {
    const best = selectBestProduct(products);
    if (!best) {
      throw new ApiError(
        404,
        'No Sentinel-2 L2A products found for the given geometry and date range',
      );
    }
    selected = best.product;
    selectionReason = best.selectionReason;
  } else {
    const latest = selectLatestProduct(products);
    if (!latest) {
      throw new ApiError(
        404,
        'No Sentinel-2 L2A products found for the given geometry and date range',
      );
    }
    selected = latest;
  }

  const { width, height } = computeImageDimensions(geometry);
  const evalscript = type === 'true-color' ? TRUE_COLOR_EVALSCRIPT : NDVI_EVALSCRIPT;

  const imageBuffer = await copernicusProcessService.processImage({
    geometry,
    datetime: selected.datetime,
    productId: selected.id,
    tile: selected.tile,
    cloudCoverage: selected.cloudCoverage,
    evalscript,
    width,
    height,
  });

  const pngInfo = assertValidPngImage(imageBuffer, `${type} PNG`);

  await fs.mkdir(OUTPUTS_DIR, { recursive: true });

  const prefix = mode === 'best' ? `best-${type}` : type;
  const fileName = `${prefix}-${formatFilenameTimestamp(selected.datetime)}.png`;
  const filePath = path.join(OUTPUTS_DIR, fileName);
  await fs.writeFile(filePath, imageBuffer);

  const stat = await fs.stat(filePath);

  const base: ImageOutputResult = {
    productId: selected.id,
    datetime: selected.datetime,
    satellite: selected.satellite,
    tile: selected.tile,
    cloudCoverage: selected.cloudCoverage,
    fileName,
    filePath,
    imageUrl: `/outputs/${fileName}`,
    fileSizeBytes: stat.size,
    width: pngInfo.width,
    height: pngInfo.height,
    type,
  };

  if (mode === 'best') {
    return {
      ...base,
      selectionType: 'best',
      selectionReason: selectionReason ?? '',
    };
  }

  return base;
}
