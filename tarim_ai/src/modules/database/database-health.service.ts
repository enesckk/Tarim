import {
  checkConnectivity,
  getDatabaseConfig,
  getPool,
} from './database-client.js';
import { getMigrationStatus } from './migrations/runner.js';

export class DatabaseHealthService {
  async getStatus() {
    const config = getDatabaseConfig();
    if (!config.enabled || config.provider === 'in-memory') {
      return {
        status: 'disabled' as const,
        provider: 'in-memory' as const,
        connected: false,
        durable: false,
      };
    }

    const connectivity = await checkConnectivity();
    const migrationStatus = connectivity.connected
      ? await getMigrationStatus()
      : { status: 'unavailable' as const, pending: [] as string[], applied: [] as string[] };

    let pool = { total: 0, idle: 0, waiting: 0 };
    try {
      const p = getPool();
      pool = {
        total: p.totalCount,
        idle: p.idleCount,
        waiting: p.waitingCount,
      };
    } catch {
      // pool may be unavailable
    }

    return {
      status: connectivity.connected
        ? migrationStatus.status === 'up_to_date'
          ? ('healthy' as const)
          : ('degraded' as const)
        : ('unhealthy' as const),
      provider: 'postgresql' as const,
      connected: connectivity.connected,
      latencyMs: connectivity.latencyMs,
      migrationStatus: migrationStatus.status,
      pendingMigrations: migrationStatus.pending,
      pool,
      durable: true,
    };
  }
}
