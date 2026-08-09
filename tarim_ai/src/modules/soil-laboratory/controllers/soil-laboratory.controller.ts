// @ts-nocheck
import type { Request, Response, NextFunction } from 'express';
import { SoilLaboratoryService } from '../services/soil-laboratory.service.js';

export class SoilLaboratoryController {
  private readonly service = new SoilLaboratoryService();

  getLatestReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parcelId = req.query.parcelId as string;
      if (!parcelId) {
        res.status(400).json({ error: 'parcelId is required' });
        return;
      }
      
      const report = await this.service.getLatestReport(parcelId);
      if (!report) {
        res.status(404).json({ error: 'No report found for this parcel' });
        return;
      }
      
      res.json(report);
    } catch (error) {
      next(error);
    }
  };

  uploadReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Stub for future PDF parsing & saving logic
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (error) {
      next(error);
    }
  };
}
