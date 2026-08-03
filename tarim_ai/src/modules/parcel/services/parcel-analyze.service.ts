import { agriculturalAnalysisService } from '../../../services/agricultural-analysis.service.js';
import { timeSeriesService } from '../../../services/time-series.service.js';
import type { ParcelAnalyzeResponse, ParcelQuery } from '../types/parcel.types.js';
import { ParcelQueryService } from './parcel-query.service.js';

export class ParcelAnalyzeService {
  constructor(private readonly parcelQueryService: ParcelQueryService) {}

  async analyze(query: ParcelQuery): Promise<ParcelAnalyzeResponse> {
    const resolved = await this.parcelQueryService.resolve(query);
    const geometry = resolved.parcel.geometry;

    const [currentAnalysis, timeSeries] = await Promise.all([
      agriculturalAnalysisService.computeBestAnalysisSummary({
        geometry,
        days: 30,
      }),
      timeSeriesService.computeTimeSeries({
        geometry,
        months: 6,
        maxCloudCoverage: 20,
      }),
    ]);

    return {
      parcel: resolved.parcel,
      currentAnalysis,
      timeSeries,
    };
  }
}
