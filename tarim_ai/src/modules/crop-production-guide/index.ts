import { getEnv } from '../../config/env.js';
import { PostgresCropGuideRepository, InMemoryCropGuideRepository, type CropGuideRepository } from './repositories/crop-guide.repository.js';
import { CropGuideService } from './services/crop-guide.service.js';
import { createCropGuideRouter } from './routes/crop-guide.routes.js';

let sharedRepository: CropGuideRepository | null = null;
let sharedService: CropGuideService | null = null;

export function getCropGuideRepository(): CropGuideRepository {
  if (!sharedRepository) {
    const env = getEnv();
    if (env.PERSISTENCE_PROVIDER === 'postgresql' && env.DATABASE_ENABLED) {
      sharedRepository = new PostgresCropGuideRepository();
    } else {
      sharedRepository = new InMemoryCropGuideRepository();
    }
  }
  return sharedRepository;
}

export function getCropGuideService(): CropGuideService {
  if (!sharedService) {
    sharedService = new CropGuideService(getCropGuideRepository());
  }
  return sharedService;
}

export function createCropGuideModule() {
  const service = getCropGuideService();
  return {
    service,
    router: createCropGuideRouter(service),
  };
}

export * from './types/crop-guide.types.js';
export { CropGuideService } from './services/crop-guide.service.js';
