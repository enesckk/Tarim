import { Router, type Request, type Response, type NextFunction } from 'express';
import type { CropGuideService } from '../services/crop-guide.service.js';

export function createCropGuideRouter(service: CropGuideService): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response, next: NextFunction) => {
    service.getAllGuides()
      .then((guides) => res.json(guides))
      .catch(next);
  });

  router.get('/:cropCode', (req: Request, res: Response, next: NextFunction) => {
    const cropCode = req.params.cropCode as string;
    service.getGuideByCropCode(cropCode)
      .then((guide) => res.json(guide))
      .catch(next);
  });

  router.get('/:cropCode/calendar', (req: Request, res: Response, next: NextFunction) => {
    const cropCode = req.params.cropCode as string;
    service.getCalendarByCropCode(cropCode)
      .then((calendar) => res.json(calendar))
      .catch(next);
  });

  router.get('/:cropCode/tasks', (req: Request, res: Response, next: NextFunction) => {
    const cropCode = req.params.cropCode as string;
    service.getTasksByCropCode(cropCode)
      .then((tasks) => res.json(tasks))
      .catch(next);
  });

  return router;
}
