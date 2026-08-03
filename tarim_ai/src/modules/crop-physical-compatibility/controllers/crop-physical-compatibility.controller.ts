import type { Request, Response, NextFunction } from 'express';
import { getEnv } from '../../../config/env.js';
import { cropPhysicalCompatibilityRequestSchema } from '../schemas/crop-physical-compatibility-request.schema.js';
import type { CropPhysicalCompatibilityService } from '../services/crop-physical-compatibility.service.js';

export class CropPhysicalCompatibilityController {
  constructor(private readonly service: CropPhysicalCompatibilityService) {}

  analyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!getEnv().CROP_PHYSICAL_COMPATIBILITY_ENABLED) {
        res.status(503).json({
          error: 'Crop physical compatibility is disabled',
          code: 'CROP_PHYSICAL_COMPATIBILITY_DISABLED',
        });
        return;
      }
      const body = cropPhysicalCompatibilityRequestSchema.parse(req.body);
      const result = await this.service.analyze(body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
