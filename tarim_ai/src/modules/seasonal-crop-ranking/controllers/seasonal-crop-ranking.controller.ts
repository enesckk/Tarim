import type { Request, Response, NextFunction } from 'express';
import { SeasonalCropRankingService } from '../services/seasonal-crop-ranking.service.js';
import type { RankedCropResult } from '../types/ranking.types.js';

export class SeasonalCropRankingController {
  private readonly service = new SeasonalCropRankingService();

  getRanking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parcelId = req.params.parcelId as string;
      const topStr = typeof req.query.top === 'string' ? req.query.top : undefined;
      const top = topStr ? parseInt(topStr, 10) : 10;
      const suitability = typeof req.query.suitability === 'string' ? req.query.suitability : undefined;
      const confidence = typeof req.query.confidence === 'string' ? req.query.confidence : undefined;

      const ranking = await this.service.rankCropsForParcel(parcelId, { top, suitability, confidence });
      res.json(ranking);
    } catch (error) {
      next(error);
    }
  };

  exportRanking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parcelId = req.params.parcelId as string;
      const format = typeof req.query.format === 'string' ? req.query.format : 'json';
      const topStr = typeof req.query.top === 'string' ? req.query.top : undefined;
      const top = topStr ? parseInt(topStr, 10) : undefined;
      const ranking = await this.service.rankCropsForParcel(parcelId, { top });

      if (format === 'csv' || format === 'excel') {
        const header = ['Rank', 'Crop', 'Suitability', 'Confidence', 'Critical Constraints', 'Missing Data', 'Explainability'];
        const rows = ranking.results.map((r: RankedCropResult) => [
          r.rank,
          r.cropName,
          r.suitability,
          r.confidence,
          r.criticalConstraints.length,
          r.missingData.length,
          r.explainabilitySummary
        ]);

        const csvContent = [
          header.join(','),
          ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ].join('\\n');

        // Note: For Excel, returning CSV with UTF-8 BOM helps Excel open it natively without encoding issues
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="ranking-${parcelId}.csv"`);
        res.send('\\uFEFF' + csvContent);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="ranking-${parcelId}.json"`);
        res.json(ranking);
      }
    } catch (error) {
      next(error);
    }
  };
}
