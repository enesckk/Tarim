import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../../utils/api-error.js';
import type { SeasonalCropAnalysisService } from '../services/seasonal-crop-analysis.service.js';
import {
  seasonalCropAnalysisRequestSchema,
  seasonalDemoRequestSchema,
} from '../schemas/seasonal-crop-analysis.schemas.js';

function getCorrelationId(req: Request): string | null {
  return req.observability?.correlationId ?? null;
}

export class SeasonalCropAnalysisController {
  constructor(private readonly service: SeasonalCropAnalysisService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = seasonalCropAnalysisRequestSchema.parse(req.body);
      const result = await this.service.create(parsed, getCorrelationId(req));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  demo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = seasonalDemoRequestSchema.parse(req.body);
      const result = await this.service.demo(parsed, getCorrelationId(req));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id ?? '');
      const record = await this.service.getRecord(id);
      if (!record) {
        throw new ApiError(404, `Seasonal crop analysis not found: ${id}`, {
          code: 'SEASONAL_ANALYSIS_NOT_FOUND',
        });
      }
      if (record.status === 'processing') {
        res.status(202).json({
          analysisId: record.id,
          status: record.status,
          progress: record.progress,
          message: 'Analiz devam ediyor.',
        });
        return;
      }
      res.json(record.result);
    } catch (err) {
      next(err);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id ?? '');
      const status = await this.service.getStatus(id);
      if (!status) {
        throw new ApiError(404, `Seasonal crop analysis not found: ${id}`, {
          code: 'SEASONAL_ANALYSIS_NOT_FOUND',
        });
      }
      res.json(status);
    } catch (err) {
      next(err);
    }
  };

  listByParcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const raw = String(req.params.parcelId ?? '');
      const parcelKey = decodeURIComponent(raw);
      const items = await this.service.listByParcelKey(parcelKey);
      res.json({ items, count: items.length });
    } catch (err) {
      next(err);
    }
  };
}
