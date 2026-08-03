import type {
  BsiStatistics,
  NdmiStatistics,
  NdviStatistics,
} from '../utils/statistics.utils.js';
import {
  indexStatisticsService,
  toProductSummary,
  type IndexStatisticsRequest,
  type ProductSummary,
} from './index-statistics.service.js';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface AgriculturalInterpretation {
  vegetationStatus: string;
  moistureStatus: string;
  soilSurfaceStatus: string;
  summary: string;
  confidence: ConfidenceLevel;
}

export interface AnalysisSummaryResponse {
  selectionType: 'best';
  selectionReason: string;
  product: ProductSummary;
  indices: {
    ndvi: NdviStatistics;
    ndmi: NdmiStatistics;
    bsi: BsiStatistics;
  };
  interpretation: AgriculturalInterpretation;
}

class AgriculturalAnalysisService {
  async computeBestAnalysisSummary(
    request: IndexStatisticsRequest,
  ): Promise<AnalysisSummaryResponse> {
    const best = await indexStatisticsService.selectBestAcquisition(request);

    const [ndvi, ndmi, bsi] = await Promise.all([
      indexStatisticsService.computeIndexForProduct(
        'ndvi',
        request.geometry,
        best.product,
      ) as Promise<NdviStatistics>,
      indexStatisticsService.computeIndexForProduct(
        'ndmi',
        request.geometry,
        best.product,
      ) as Promise<NdmiStatistics>,
      indexStatisticsService.computeIndexForProduct(
        'bsi',
        request.geometry,
        best.product,
      ) as Promise<BsiStatistics>,
    ]);

    const interpretation = buildInterpretation({
      ndvi,
      ndmi,
      bsi,
      cloudCoverage: best.product.cloudCoverage,
    });

    return {
      selectionType: 'best',
      selectionReason: best.selectionReason,
      product: toProductSummary(best.product),
      indices: { ndvi, ndmi, bsi },
      interpretation,
    };
  }
}

export function interpretVegetationStatus(ndviMean: number): string {
  if (ndviMean >= 0.5) {
    return 'Yoğun bitki örtüsü sinyali görülmektedir.';
  }
  if (ndviMean >= 0.3) {
    return 'Orta seviyede bitki örtüsü sinyali görülmektedir.';
  }
  if (ndviMean >= 0.2) {
    return 'Düşük veya seyrek bitki örtüsü sinyali görülmektedir.';
  }
  return 'Çok düşük bitki örtüsü veya çıplak yüzey sinyali görülmektedir.';
}

export function interpretMoistureStatus(ndmiMean: number): string {
  if (ndmiMean >= 0.2) {
    return 'Yüksek nem sinyali görülmektedir.';
  }
  if (ndmiMean >= 0) {
    return 'Orta nem sinyali görülmektedir.';
  }
  return 'Düşük nem sinyali görülmektedir.';
}

export function interpretSoilSurfaceStatus(bsiMean: number): string {
  if (bsiMean >= 0.2) {
    return 'Belirgin çıplak toprak sinyali görülmektedir; çıplak toprak etkisi baskın olabilir.';
  }
  if (bsiMean >= 0) {
    return 'Orta düzey çıplak toprak sinyali görülmektedir.';
  }
  return 'Çıplak toprak sinyali düşük görünmektedir.';
}

export function resolveConfidence(
  cloudCoverage: number | null,
  validPixelRatio: number,
): ConfidenceLevel {
  const cloud = cloudCoverage ?? 100;

  if (cloud <= 5 && validPixelRatio >= 0.4) {
    return 'high';
  }
  if (cloud <= 15 && validPixelRatio >= 0.25) {
    return 'medium';
  }
  return 'low';
}

export function buildInterpretation(input: {
  ndvi: NdviStatistics;
  ndmi: NdmiStatistics;
  bsi: BsiStatistics;
  cloudCoverage: number | null;
}): AgriculturalInterpretation {
  const vegetationStatus = interpretVegetationStatus(input.ndvi.mean);
  const moistureStatus = interpretMoistureStatus(input.ndmi.mean);
  const soilSurfaceStatus = interpretSoilSurfaceStatus(input.bsi.mean);

  const validPixelRatio =
    input.ndvi.totalPixelCount > 0
      ? input.ndvi.validPixelCount / input.ndvi.totalPixelCount
      : 0;

  const confidence = resolveConfidence(input.cloudCoverage, validPixelRatio);

  const summary = [
    vegetationStatus,
    moistureStatus,
    soilSurfaceStatus,
    'Bu bulgular uydu göstergelerine dayanır ve saha ile toprak analiziyle doğrulanmalıdır.',
  ].join(' ');

  return {
    vegetationStatus,
    moistureStatus,
    soilSurfaceStatus,
    summary,
    confidence,
  };
}

export const agriculturalAnalysisService = new AgriculturalAnalysisService();
