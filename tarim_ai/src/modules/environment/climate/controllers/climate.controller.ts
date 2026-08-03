import type { Request, Response, NextFunction } from 'express';
import { climateRequestSchema } from '../schemas/climate.schema.js';
import type { ClimateProfileService } from '../services/climate-profile.service.js';

export class ClimateController {
  constructor(private readonly climateProfileService: ClimateProfileService) {}

  profile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = climateRequestSchema.parse(req.body);
      const result = await this.climateProfileService.getProfile({
        geometry: body.geometry,
        parcelQuery: body.parcelQuery,
        years: body.years,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
