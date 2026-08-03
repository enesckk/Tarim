import type { Request, Response, NextFunction } from 'express';
import { soilRequestSchema } from '../schemas/soil.schema.js';
import type { SoilProfileService } from '../services/soil-profile.service.js';

export class SoilController {
  constructor(private readonly soilProfileService: SoilProfileService) {}

  profile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = soilRequestSchema.parse(req.body);
      const result = await this.soilProfileService.getProfile({
        geometry: body.geometry,
        parcelQuery: body.parcelQuery,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
