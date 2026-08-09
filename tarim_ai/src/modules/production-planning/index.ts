import { getEnv } from '../../config/env.js';
import { PostgresProductionPlanningRepository, InMemoryProductionPlanningRepository, type ProductionPlanningRepository } from './repositories/production-planning.repository.js';
import { ProductionPlanningService } from './services/production-planning.service.js';
import { createProductionPlanningRouter } from './routes/production-planning.routes.js';
import { getCropGuideService } from '../crop-production-guide/index.js';

let sharedRepository: ProductionPlanningRepository | null = null;
let sharedService: ProductionPlanningService | null = null;

export function getProductionPlanningRepository(): ProductionPlanningRepository {
  if (!sharedRepository) {
    const env = getEnv();
    if (env.PERSISTENCE_PROVIDER === 'postgresql' && env.DATABASE_ENABLED) {
      sharedRepository = new PostgresProductionPlanningRepository();
    } else {
      sharedRepository = new InMemoryProductionPlanningRepository();
    }
  }
  return sharedRepository;
}

export function getProductionPlanningService(): ProductionPlanningService {
  if (!sharedService) {
    sharedService = new ProductionPlanningService(
      getProductionPlanningRepository(),
      getCropGuideService()
    );
  }
  return sharedService;
}

export function createProductionPlanningModule() {
  const service = getProductionPlanningService();
  return {
    service,
    router: createProductionPlanningRouter(service),
  };
}

export * from './types/production-planning.types.js';
export { ProductionPlanningService } from './services/production-planning.service.js';
