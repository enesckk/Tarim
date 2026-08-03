import { createParcelProvider } from './providers/create-parcel-provider.js';
import { ParcelController } from './controllers/parcel.controller.js';
import { createParcelRouter } from './routes/parcel.routes.js';
import { ParcelAnalyzeService } from './services/parcel-analyze.service.js';
import { ParcelQueryService } from './services/parcel-query.service.js';

/**
 * Wires parcel module dependencies (simple DI composition root).
 */
export function createParcelModule() {
  const provider = createParcelProvider();
  const parcelQueryService = new ParcelQueryService(provider);
  const parcelAnalyzeService = new ParcelAnalyzeService(parcelQueryService);
  const controller = new ParcelController(parcelQueryService, parcelAnalyzeService);
  const router = createParcelRouter(controller);

  return {
    router,
    provider,
    parcelQueryService,
    parcelAnalyzeService,
    controller,
  };
}
