import type { Request, Response, NextFunction } from 'express';
import { environmentProfileRequestSchema } from '../../soil/schemas/soil.schema.js';
import type { EnvironmentProfileService } from '../services/environment-profile.service.js';

export class EnvironmentController {
  constructor(private readonly environmentProfileService: EnvironmentProfileService) {}

  profile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = environmentProfileRequestSchema.parse(req.body);
      const result = await this.environmentProfileService.getProfile({
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
