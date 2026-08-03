import type { ParcelQueryService } from '../parcel/services/parcel-query.service.js';
import { createTerrainProvider } from './providers/create-terrain-provider.js';
import { TerrainProfileService } from './services/terrain-profile.service.js';
import { TerrainController } from './controllers/terrain.controller.js';
import { createTerrainRouter } from './routes/terrain.routes.js';

export function createTerrainModule(parcelQueryService: ParcelQueryService) {
  const provider = createTerrainProvider();
  const terrainProfileService = new TerrainProfileService(provider, parcelQueryService);
  const controller = new TerrainController(terrainProfileService);
  const router = createTerrainRouter(controller);

  return {
    router,
    terrainProfileService,
    provider,
    controller,
  };
}
