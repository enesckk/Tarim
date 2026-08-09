import { Router, type Request, type Response, type NextFunction } from 'express';
import type { ProductionPlanningService } from '../services/production-planning.service.js';

export function createProductionPlanningRouter(service: ProductionPlanningService): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    service.createPlan(req.body)
      .then((plan) => res.status(201).json(plan))
      .catch(next);
  });

  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    service.getPlanById(req.params.id as string)
      .then((plan) => res.json(plan))
      .catch(next);
  });

  router.get('/:id/tasks', (req: Request, res: Response, next: NextFunction) => {
    service.getTasksByPlanId(req.params.id as string)
      .then((tasks) => res.json(tasks))
      .catch(next);
  });

  router.patch('/tasks/:taskId', (req: Request, res: Response, next: NextFunction) => {
    service.updateTask(req.params.taskId as string, req.body)
      .then((task) => res.json(task))
      .catch(next);
  });

  return router;
}
