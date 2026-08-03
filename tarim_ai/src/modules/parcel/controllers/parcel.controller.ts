import type { Request, Response, NextFunction } from 'express';
import { parcelQuerySchema } from '../schemas/parcel-query.schema.js';
import type { ParcelAnalyzeService } from '../services/parcel-analyze.service.js';
import type { ParcelQueryService } from '../services/parcel-query.service.js';

export class ParcelController {
  constructor(
    private readonly parcelQueryService: ParcelQueryService,
    private readonly parcelAnalyzeService: ParcelAnalyzeService,
  ) {}

  resolve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = parcelQuerySchema.parse(req.body);
      const result = await this.parcelQueryService.resolve(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  analyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = parcelQuerySchema.parse(req.body);
      const result = await this.parcelAnalyzeService.analyze(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
