import { getPool } from '../../database/database-client.js';
import type { ProductionPlan, ProductionTask, TaskAudit } from '../types/production-planning.types.js';

export interface ProductionPlanningRepository {
  createPlan(plan: ProductionPlan): Promise<ProductionPlan>;
  createTasks(tasks: ProductionTask[]): Promise<ProductionTask[]>;
  getPlanById(planId: string): Promise<ProductionPlan | null>;
  getTasksByPlanId(planId: string): Promise<ProductionTask[]>;
  getTaskById(taskId: string): Promise<ProductionTask | null>;
  updateTask(taskId: string, updates: Partial<ProductionTask>): Promise<ProductionTask>;
  addAuditLog(audit: TaskAudit): Promise<TaskAudit>;
}

export class PostgresProductionPlanningRepository implements ProductionPlanningRepository {
  async createPlan(plan: ProductionPlan): Promise<ProductionPlan> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO pp_production_plans (
        id, crop_code, parcel_id, planting_date, production_scenario, 
        rainfed_irrigated, region, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        plan.id, plan.cropCode, plan.parcelId, plan.plantingDate, plan.productionScenario,
        plan.rainfedIrrigated, plan.region, plan.status, plan.createdAt, plan.updatedAt
      ]
    );
    return plan;
  }

  async createTasks(tasks: ProductionTask[]): Promise<ProductionTask[]> {
    const pool = getPool();
    for (const task of tasks) {
      await pool.query(
        `INSERT INTO pp_production_tasks (
          id, plan_id, task_type, title, description, start_date, due_date,
          priority, estimated_duration, status, dependencies, source, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          task.id, task.planId, task.taskType, task.title, task.description,
          task.startDate, task.dueDate, task.priority, task.estimatedDuration,
          task.status, JSON.stringify(task.dependencies), task.source, task.createdAt, task.updatedAt
        ]
      );
    }
    return tasks;
  }

  async getPlanById(planId: string): Promise<ProductionPlan | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM pp_production_plans WHERE id = $1', [planId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      cropCode: row.crop_code,
      parcelId: row.parcel_id,
      plantingDate: row.planting_date.toISOString().split('T')[0],
      productionScenario: row.production_scenario,
      rainfedIrrigated: row.rainfed_irrigated,
      region: row.region,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async getTasksByPlanId(planId: string): Promise<ProductionTask[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM pp_production_tasks WHERE plan_id = $1 ORDER BY start_date ASC', [planId]);
    return result.rows.map(row => ({
      id: row.id,
      planId: row.plan_id,
      taskType: row.task_type,
      title: row.title,
      description: row.description,
      startDate: row.start_date.toISOString().split('T')[0],
      dueDate: row.due_date.toISOString().split('T')[0],
      priority: row.priority,
      estimatedDuration: row.estimated_duration,
      status: row.status,
      dependencies: row.dependencies,
      source: row.source,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async getTaskById(taskId: string): Promise<ProductionTask | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM pp_production_tasks WHERE id = $1', [taskId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      planId: row.plan_id,
      taskType: row.task_type,
      title: row.title,
      description: row.description,
      startDate: row.start_date.toISOString().split('T')[0],
      dueDate: row.due_date.toISOString().split('T')[0],
      priority: row.priority,
      estimatedDuration: row.estimated_duration,
      status: row.status,
      dependencies: row.dependencies,
      source: row.source,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async updateTask(taskId: string, updates: Partial<ProductionTask>): Promise<ProductionTask> {
    const pool = getPool();
    
    // In a real scenario, we would use a dynamic query builder here.
    // For simplicity, we fetch, update and save.
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');

    const updatedTask = { ...task, ...updates, updatedAt: new Date().toISOString() };
    
    await pool.query(
      `UPDATE pp_production_tasks SET 
        status = $1, start_date = $2, due_date = $3, updated_at = $4
       WHERE id = $5`,
      [updatedTask.status, updatedTask.startDate, updatedTask.dueDate, updatedTask.updatedAt, taskId]
    );

    return updatedTask;
  }

  async addAuditLog(audit: TaskAudit): Promise<TaskAudit> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO pp_task_audits (
        id, task_id, previous_status, new_status, previous_start_date,
        new_start_date, previous_due_date, new_due_date, reason, changed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        audit.id, audit.taskId, audit.previousStatus, audit.newStatus,
        audit.previousStartDate, audit.newStartDate, audit.previousDueDate,
        audit.newDueDate, audit.reason, audit.changedAt
      ]
    );
    return audit;
  }
}

export class InMemoryProductionPlanningRepository implements ProductionPlanningRepository {
  private plans: Map<string, ProductionPlan> = new Map();
  private tasks: Map<string, ProductionTask> = new Map();
  private audits: Map<string, TaskAudit> = new Map();

  async createPlan(plan: ProductionPlan): Promise<ProductionPlan> {
    this.plans.set(plan.id, plan);
    return plan;
  }

  async createTasks(tasks: ProductionTask[]): Promise<ProductionTask[]> {
    for (const task of tasks) {
      this.tasks.set(task.id, task);
    }
    return tasks;
  }

  async getPlanById(planId: string): Promise<ProductionPlan | null> {
    return this.plans.get(planId) || null;
  }

  async getTasksByPlanId(planId: string): Promise<ProductionTask[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.planId === planId)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  async getTaskById(taskId: string): Promise<ProductionTask | null> {
    return this.tasks.get(taskId) || null;
  }

  async updateTask(taskId: string, updates: Partial<ProductionTask>): Promise<ProductionTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    const updated = { ...task, ...updates, updatedAt: new Date().toISOString() };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async addAuditLog(audit: TaskAudit): Promise<TaskAudit> {
    this.audits.set(audit.id, audit);
    return audit;
  }
}
