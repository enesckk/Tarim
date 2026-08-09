import { randomUUID } from 'crypto';
import type { ProductionPlanningRepository } from '../repositories/production-planning.repository.js';
import type { CreatePlanRequest, ProductionPlan, ProductionTask, UpdateTaskRequest } from '../types/production-planning.types.js';
import type { CropGuideService } from '../../crop-production-guide/services/crop-guide.service.js';
import { ApiError } from '../../../utils/api-error.js';
import { sharedEventBus } from '../../notifications/events/event-bus.js';

export class ProductionPlanningService {
  constructor(
    private readonly repository: ProductionPlanningRepository,
    private readonly cropGuideService: CropGuideService
  ) {}

  async createPlan(request: CreatePlanRequest): Promise<ProductionPlan> {
    const guide = await this.cropGuideService.getGuideByCropCode(request.cropCode);
    if (!guide) {
      throw new ApiError(404, `Guide not found for crop: ${request.cropCode}`);
    }

    const planId = randomUUID();
    const now = new Date().toISOString();
    
    const plan: ProductionPlan = {
      id: planId,
      cropCode: request.cropCode,
      parcelId: request.parcelId || null,
      plantingDate: request.plantingDate,
      productionScenario: request.productionScenario || null,
      rainfedIrrigated: request.rainfedIrrigated || null,
      region: request.region || null,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdPlan = await this.repository.createPlan(plan);

    // Emit PLAN_CREATED event
    await sharedEventBus.publish({
      type: 'PLAN_CREATED',
      payload: { planId: createdPlan.id, cropCode: plan.cropCode, userId: 'default-user-id' },
      occurredAt: new Date().toISOString()
    });

    const baseDate = new Date(request.plantingDate);
    
    // We will generate tasks from guide.calendar
    // In a real scenario, task duration and gaps would be based on precise agronomic models.
    // Here we use a simple linear progression: each task starts 7 days after the previous one.
    const tasks: ProductionTask[] = [];
    let currentDate = new Date(baseDate);
    let previousTaskId: string | null = null;
    const nowTime = new Date().toISOString();

    for (const step of guide.calendar) {
      const taskId = randomUUID();
      const duration = 5; // default 5 days
      
      const startDate = new Date(currentDate);
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + duration);

      const task: ProductionTask = {
        id: taskId,
        planId,
        taskType: step.taskName,
        title: step.taskName,
        description: step.description,
        startDate: startDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        priority: step.priority,
        estimatedDuration: duration,
        status: 'Planned',
        dependencies: previousTaskId ? [previousTaskId] : [],
        source: 'CropGuide',
        createdAt: nowTime,
        updatedAt: nowTime,
      };

      tasks.push(task);
      
      // Advance by 7 days for the next task
      currentDate.setDate(currentDate.getDate() + 7);
      previousTaskId = taskId;
    }

    // Add harvest task if harvestInfo exists
    if (guide.harvestInfo) {
      const taskId = randomUUID();
      const startDate = new Date(currentDate);
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + 10);

      tasks.push({
        id: taskId,
        planId,
        taskType: 'Hasat',
        title: `Hasat: ${guide.harvestInfo.harvestTime}`,
        description: `Yöntem: ${guide.harvestInfo.harvestMethod}`,
        startDate: startDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        priority: 'High',
        estimatedDuration: 10,
        status: 'Planned',
        dependencies: previousTaskId ? [previousTaskId] : [],
        source: 'CropGuide',
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.repository.createTasks(tasks);

    return plan;
  }

  async getPlanById(planId: string): Promise<ProductionPlan> {
    const plan = await this.repository.getPlanById(planId);
    if (!plan) throw new ApiError(404, 'Plan not found');
    return plan;
  }

  async getTasksByPlanId(planId: string): Promise<ProductionTask[]> {
    return this.repository.getTasksByPlanId(planId);
  }

  async updateTask(taskId: string, updateReq: UpdateTaskRequest): Promise<ProductionTask> {
    const existingTask = await this.repository.getTaskById(taskId);
    if (!existingTask) throw new ApiError(404, 'Task not found');

    const updatedTask = await this.repository.updateTask(taskId, {
      status: updateReq.status,
      startDate: updateReq.startDate,
      dueDate: updateReq.dueDate,
    });

    const dateChanged = (updateReq.startDate && updateReq.startDate !== existingTask.startDate) || 
                        (updateReq.dueDate && updateReq.dueDate !== existingTask.dueDate);

    // Audit log
    const auditId = randomUUID();
    const now = new Date().toISOString();
    
    await this.repository.addAuditLog({
      id: auditId,
      taskId,
      previousStatus: existingTask.status,
      newStatus: updateReq.status || null,
      previousStartDate: existingTask.startDate,
      newStartDate: updateReq.startDate || null,
      previousDueDate: existingTask.dueDate,
      newDueDate: updateReq.dueDate || null,
      reason: updateReq.reason || null,
      changedAt: now,
    });

    if (dateChanged) {
        // Emit TASK_RESCHEDULED event
        await sharedEventBus.publish({
          type: 'TASK_RESCHEDULED',
          payload: { 
            planId: updatedTask.planId, 
            taskId: updatedTask.id, 
            taskName: updatedTask.title,
            userId: 'default-user-id' 
          },
          occurredAt: new Date().toISOString()
        });
    }

    if (updateReq.status === 'Completed') {
        await sharedEventBus.publish({
          type: 'TASK_COMPLETED',
          payload: { 
            planId: updatedTask.planId, 
            taskId: updatedTask.id, 
            taskName: updatedTask.title,
            userId: 'default-user-id' 
          },
          occurredAt: new Date().toISOString()
        });
    }

    // Handle cascading delays if dates changed
    if (updateReq.startDate || updateReq.dueDate) {
      await this.handleCascadingDelays(updatedTask.planId);
    }

    return updatedTask;
  }

  private async handleCascadingDelays(planId: string) {
    const tasks = await this.repository.getTasksByPlanId(planId);
    // Build dependency map
    const taskMap = new Map<string, ProductionTask>();
    tasks.forEach(t => taskMap.set(t.id, t));

    for (const task of tasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        let maxDepDueDate = new Date('1970-01-01');
        for (const depId of task.dependencies) {
          const depTask = taskMap.get(depId);
          if (depTask) {
            const depDue = new Date(depTask.dueDate);
            if (depDue > maxDepDueDate) {
              maxDepDueDate = depDue;
            }
          }
        }

        const currentStart = new Date(task.startDate);
        // If the task starts before its dependencies finish, push it forward
        if (currentStart <= maxDepDueDate) {
          // Push start date to maxDepDueDate + 2 days
          const newStart = new Date(maxDepDueDate);
          newStart.setDate(newStart.getDate() + 2);
          
          const newDue = new Date(newStart);
          newDue.setDate(newDue.getDate() + (task.estimatedDuration || 5));

          const newStartStr = newStart.toISOString().split('T')[0];
          const newDueStr = newDue.toISOString().split('T')[0];

          await this.repository.updateTask(task.id, {
            startDate: newStartStr,
            dueDate: newDueStr,
          });

          // Audit the cascade
          await this.repository.addAuditLog({
            id: randomUUID(),
            taskId: task.id,
            previousStatus: task.status,
            newStatus: task.status,
            previousStartDate: task.startDate,
            newStartDate: newStartStr,
            previousDueDate: task.dueDate,
            newDueDate: newDueStr,
            reason: 'Cascading delay from dependencies',
            changedAt: new Date().toISOString(),
          });

          // Emit EVENT for the cascaded task
          await sharedEventBus.publish({
            type: 'TASK_RESCHEDULED',
            payload: { 
              planId: task.planId, 
              taskId: task.id, 
              taskName: task.title,
              userId: 'default-user-id' 
            },
            occurredAt: new Date().toISOString()
          });

          // update our map so subsequent tasks see the new dates
          taskMap.set(task.id, { ...task, startDate: newStartStr, dueDate: newDueStr });
        }
      }
    }
  }
}
