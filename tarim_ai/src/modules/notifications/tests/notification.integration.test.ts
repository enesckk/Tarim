import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createNotificationModule } from '../index.js';

describe('Notification API Integration Tests', () => {
  let moduleInstance: any;

  beforeEach(() => {
    process.env.DATABASE_ENABLED = 'false';
    process.env.PERSISTENCE_PROVIDER = 'in-memory';
    moduleInstance = createNotificationModule();
  });

  afterEach(() => {
    if (moduleInstance?.scheduler) {
      moduleInstance.scheduler.stop();
    }
  });

  it('module exposes router and scheduler', () => {
    expect(moduleInstance.router).toBeDefined();
    expect(moduleInstance.scheduler).toBeDefined();
  });
});
