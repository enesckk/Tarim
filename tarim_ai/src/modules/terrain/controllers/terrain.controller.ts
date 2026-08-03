import type { Request, Response, NextFunction } from 'express';
import { terrainRequestSchema } from '../schemas/terrain-request.schema.js';
import type { TerrainProfileService } from '../services/terrain-profile.service.js';

export class TerrainController {
  constructor(private readonly terrainProfileService: TerrainProfileService) {}

  profile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = terrainRequestSchema.parse(req.body);
      const result = await this.terrainProfileService.getProfile({
        geometry: body.geometry as never,
        parcelQuery: body.parcelQuery,
        options: body.options,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
