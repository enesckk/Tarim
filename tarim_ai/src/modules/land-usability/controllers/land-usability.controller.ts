import type { Request, Response, NextFunction } from 'express';
import { landUsabilityRequestSchema } from '../schemas/land-usability.schemas.js';
import type { LandUsabilityService } from '../services/land-usability.service.js';
import { getEnv } from '../../../config/env.js';

export class LandUsabilityController {
  constructor(private readonly landUsabilityService: LandUsabilityService) {}

  analyze = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!getEnv().LAND_USABILITY_ENABLED) {
        res.status(503).json({
          error: 'Land usability decision engine is disabled',
          code: 'LAND_USABILITY_DISABLED',
        });
        return;
      }
      const body = landUsabilityRequestSchema.parse(req.body);
      const result = await this.landUsabilityService.analyze({
        geometry: body.geometry,
        parcelQuery: body.parcelQuery,
        includeTerrain: body.includeTerrain,
        includeSurfaceAnalysis: body.includeSurfaceAnalysis,
        includeSoil: body.includeSoil,
        includeClimate: body.includeClimate,
        surfaceAnalysisOptions: body.surfaceAnalysisOptions,
        fieldEvidence: body.fieldEvidence,
        fieldSurveyId: body.fieldSurveyId,
        useLatestApprovedFieldSurvey: body.useLatestApprovedFieldSurvey,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
