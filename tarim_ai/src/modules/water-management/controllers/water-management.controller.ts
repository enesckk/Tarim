import type { Request, Response, NextFunction } from 'express';
import { WaterManagementService } from '../services/water-management.service.js';

export class WaterManagementController {
  private readonly service = new WaterManagementService();

  getSources = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parcelId = req.query.parcelId as string;
      if (!parcelId) {
        res.status(400).json({ error: 'parcelId is required' });
        return;
      }
      
      const sources = await this.service.getSourcesByParcel(parcelId);
      res.json(sources);
    } catch (error) {
      next(error);
    }
  };
}
