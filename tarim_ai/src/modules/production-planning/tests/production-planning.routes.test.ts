import { describe, it, expect, beforeAll, vi } from 'vitest';
import { ProductionPlanningService } from '../services/production-planning.service.js';
import { InMemoryProductionPlanningRepository } from '../repositories/production-planning.repository.js';
import { createProductionPlanningRouter } from '../routes/production-planning.routes.js';
import type { CropGuideService } from '../../crop-production-guide/services/crop-guide.service.js';

describe('Production Planning Routes', () => {
  let repository: InMemoryProductionPlanningRepository;
  let service: ProductionPlanningService;
  let router: any;
  let cropGuideServiceMock: Partial<CropGuideService>;

  beforeAll(() => {
    repository = new InMemoryProductionPlanningRepository();
    
    cropGuideServiceMock = {
      getGuideByCropCode: vi.fn().mockResolvedValue({
        id: 'guide-id',
        cropCode: 'bugday',
        calendar: [
          {
            sequenceOrder: 1,
            taskName: 'Toprak Hazırlığı',
            description: 'Derin sürüm',
            priority: 'High',
          }
        ]
      })
    };

    service = new ProductionPlanningService(
      repository,
      cropGuideServiceMock as CropGuideService
    );
    router = createProductionPlanningRouter(service);
  });

  it('router should be defined', () => {
    expect(router).toBeDefined();
  });

  // we can add express request mocking here if necessary, but testing the service is enough for our logic.
});
