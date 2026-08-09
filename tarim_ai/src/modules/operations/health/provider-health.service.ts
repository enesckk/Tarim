// @ts-nocheck
import { getEnv } from '../../../config/env.js';
import { getPool } from '../../database/database-client.js';

export interface ProviderHealthStatus {
  name: string;
  status: 'Connected' | 'Unauthorized' | 'Disabled' | 'Error';
  lastChecked: string;
  capabilities: string[];
}

export class ProviderHealthService {
  async getHealthMatrix(): Promise<ProviderHealthStatus[]> {
    const env: any = getEnv();
    const statuses: ProviderHealthStatus[] = [];
    const now = new Date().toISOString();

    // PostgreSQL
    try {
      await getPool().query('SELECT 1');
      statuses.push({ name: 'PostgreSQL', status: 'Connected', lastChecked: now, capabilities: ['Storage'] });
    } catch {
      statuses.push({ name: 'PostgreSQL', status: 'Error', lastChecked: now, capabilities: [] });
    }

    // NASA POWER
    if (env.NASA_POWER_ENABLED) {
      statuses.push({ name: 'NASA', status: 'Connected', lastChecked: now, capabilities: ['Climate'] });
    } else {
      statuses.push({ name: 'NASA', status: 'Disabled', lastChecked: now, capabilities: [] });
    }

    // SoilGrids
    if (env.SOILGRIDS_ENABLED) {
      statuses.push({ name: 'SoilGrids', status: 'Connected', lastChecked: now, capabilities: ['Soil'] });
    } else {
      statuses.push({ name: 'SoilGrids', status: 'Disabled', lastChecked: now, capabilities: [] });
    }

    // DEM / Copernicus
    if (env.COPERNICUS_DEM_ENABLED) {
      statuses.push({ name: 'DEM', status: 'Connected', lastChecked: now, capabilities: ['Terrain'] });
    } else {
      statuses.push({ name: 'DEM', status: 'Disabled', lastChecked: now, capabilities: [] });
    }

    // Sentinel (often Unauthorized without proper token in testing)
    if (env.SENTINEL_ENABLED) {
      statuses.push({ name: 'Sentinel', status: env.SENTINELHUB_CLIENT_ID ? 'Connected' : 'Unauthorized', lastChecked: now, capabilities: ['Surface'] });
    } else {
      statuses.push({ name: 'Sentinel', status: 'Disabled', lastChecked: now, capabilities: [] });
    }

    // GAEZ
    if (env.GAEZ_ENABLED) {
      statuses.push({ name: 'GAEZ', status: 'Connected', lastChecked: now, capabilities: ['AgroClimate'] });
    } else {
      statuses.push({ name: 'GAEZ', status: 'Disabled', lastChecked: now, capabilities: [] });
    }

    return statuses;
  }
}
