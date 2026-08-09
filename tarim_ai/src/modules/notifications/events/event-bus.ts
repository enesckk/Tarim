export type DomainEventType = 'PLAN_CREATED' | 'TASK_READY' | 'TASK_RESCHEDULED' | 'TASK_COMPLETED' | 'TASK_OVERDUE' | 'GENERAL_ANNOUNCEMENT';

export interface DomainEvent {
  type: DomainEventType;
  payload: any;
  occurredAt: string;
}

export type EventHandler = (event: DomainEvent) => Promise<void>;

export class EventBus {
  private handlers = new Map<DomainEventType, EventHandler[]>();

  subscribe(type: DomainEventType, handler: EventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    // We execute handlers asynchronously but we might want to wait for them depending on requirements.
    // For now we don't block the publisher heavily, just promise.all
    await Promise.allSettled(handlers.map(h => h(event).catch(err => {
      console.error(`[EventBus] Error handling event ${event.type}:`, err);
    })));
  }
}

export const sharedEventBus = new EventBus();
