import type { Request, Response, NextFunction } from 'express';
import { PhysicalSuitabilityDecisionEngine } from '../services/decision-engine.service.js';

export class DecisionEngineController {
  private readonly engine = new PhysicalSuitabilityDecisionEngine();

  analyzeParcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parcelId = req.query.parcelId as string;
      if (!parcelId) {
        res.status(400).json({ error: 'parcelId is required' });
        return;
      }
      
      const analysis = await this.engine.analyzeParcel(parcelId);
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  };
}
