import { describe, it, expect, beforeAll, vi } from 'vitest';
import { ProductionPlanningService } from '../services/production-planning.service.js';
import { InMemoryProductionPlanningRepository } from '../repositories/production-planning.repository.js';
import type { CropGuideService } from '../../crop-production-guide/services/crop-guide.service.js';

describe('Production Planning Service', () => {
  let repository: InMemoryProductionPlanningRepository;
  let cropGuideServiceMock: Partial<CropGuideService>;
  let service: ProductionPlanningService;

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
          },
          {
            sequenceOrder: 2,
            taskName: 'Ekim',
            description: 'Mibzer ile ekim',
            priority: 'Critical',
          }
        ],
        harvestInfo: {
          harvestTime: 'Yaz',
          harvestMethod: 'Biçerdöver'
        }
      })
    };

    service = new ProductionPlanningService(
      repository,
      cropGuideServiceMock as CropGuideService
    );
  });

  it('should create a plan and tasks based on crop guide', async () => {
    const plan = await service.createPlan({
      cropCode: 'bugday',
      plantingDate: '2026-10-01',
    });

    expect(plan.cropCode).toBe('bugday');
    expect(plan.plantingDate).toBe('2026-10-01');

    const tasks = await service.getTasksByPlanId(plan.id);
    expect(tasks.length).toBe(3); // 2 steps + 1 harvest

    expect(tasks[0].title).toBe('Toprak Hazırlığı');
    expect(tasks[0].startDate).toBe('2026-10-01');
    expect(tasks[0].status).toBe('Planned');

    expect(tasks[1].title).toBe('Ekim');
    expect(tasks[1].startDate).toBe('2026-10-08'); // +7 days from previous
    expect(tasks[1].dependencies?.length).toBe(1);
    expect(tasks[1].dependencies?.[0]).toBe(tasks[0].id);

    expect(tasks[2].taskType).toBe('Hasat');
    expect(tasks[2].startDate).toBe('2026-10-15'); // +7 days from previous
  });

  it('should handle cascading delays', async () => {
    const plan = await service.createPlan({
      cropCode: 'bugday',
      plantingDate: '2026-10-01',
    });

    const tasks = await service.getTasksByPlanId(plan.id);
    const firstTask = tasks[0];
    const secondTask = tasks[1];

    // Delay the first task's due date
    await service.updateTask(firstTask.id, {
      dueDate: '2026-10-15'
    });

    // The second task should be pushed forward to 2026-10-17 (maxDepDue + 2)
    const updatedTasks = await service.getTasksByPlanId(plan.id);
    const updatedSecondTask = updatedTasks.find(t => t.id === secondTask.id);

    expect(updatedSecondTask?.startDate).toBe('2026-10-17');
    expect(updatedSecondTask?.dueDate).toBe('2026-10-22');
  });
});
