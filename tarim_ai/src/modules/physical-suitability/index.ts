import { Router } from 'express';
import {
  InMemoryPhysicalSuitabilityRepository,
  type PhysicalSuitabilityRepository,
} from './repositories/physical-suitability.repository.js';
import {
  InMemoryCropKnowledgeRepository,
  type CropKnowledgeRepository,
} from './crop-knowledge/repositories/crop-knowledge.repository.js';
import { seedPhysicalSuitabilityPhase1 } from './seed/phase1-seed.js';
import { seedSeasonalCropScientificProfileV1 } from './seed/seasonal-crop-scientific-profile-v1.seed.js';
import { seedCropKnowledgeGeneralInformation } from './crop-knowledge/seed/general-information.seed.js';
import { seedCropPhenologyEngine } from './crop-knowledge/phenology/crop-phenology-engine.service.js';
import { seedCropClimateRequirements } from './crop-knowledge/climate/crop-climate-requirements.service.js';
import { seedCropSoilRequirements } from './crop-knowledge/soil/crop-soil-requirements.service.js';
import { seedCropWaterRequirements } from './crop-knowledge/water/crop-water-requirements.service.js';
import { seedCropTerrainRequirements } from './crop-knowledge/terrain/crop-terrain-requirements.service.js';
import { seedCropRiskProfile } from './crop-knowledge/risk/crop-risk-profile.service.js';
import { seedCropProductionCalendar } from './crop-knowledge/calendar/crop-production-calendar.service.js';
import { seedScientificReferenceLibrary } from './crop-knowledge/references/scientific-reference-library.service.js';
import {
  InMemorySoilLaboratoryRepository,
  type SoilLaboratoryRepository,
} from './soil-laboratory/repositories/soil-laboratory.repository.js';
import { seedSoilLaboratoryCore } from './soil-laboratory/services/soil-laboratory.service.js';
import {
  InMemorySoilSamplingRepository,
  type SoilSamplingRepository,
} from './soil-sampling/repositories/soil-sampling.repository.js';
import { seedSoilSamplingManagement } from './soil-sampling/services/soil-sampling.service.js';
import {
  InMemoryIrrigationWaterRepository,
  type IrrigationWaterRepository,
} from './irrigation-water-laboratory/repositories/irrigation-water.repository.js';
import { seedIrrigationWaterLaboratory } from './irrigation-water-laboratory/services/irrigation-water.service.js';
import {
  InMemoryFieldObservationRepository,
  type FieldObservationRepository,
} from './field-observation/repositories/field-observation.repository.js';
import { seedFieldObservationModule } from './field-observation/services/field-observation.service.js';
import {
  InMemoryAgroClimateRepository,
  type AgroClimateRepository,
} from './agroclimate/repositories/agroclimate.repository.js';
import { seedAgroClimateModule } from './agroclimate/services/agroclimate.service.js';
import { PhysicalSuitabilityFacade } from './services/physical-suitability.facade.js';
import { PhysicalSuitabilityController } from './controllers/physical-suitability.controller.js';
import { createPhysicalSuitabilityRouter } from './routes/physical-suitability.routes.js';
import { createSoilCatalogRouter } from './routes/soil-catalog.routes.js';

export function createPhysicalSuitabilityModule(opts?: {
  repository?: PhysicalSuitabilityRepository;
  cropKnowledgeRepository?: CropKnowledgeRepository;
  soilLaboratoryRepository?: SoilLaboratoryRepository;
  soilSamplingRepository?: SoilSamplingRepository;
  irrigationWaterRepository?: IrrigationWaterRepository;
  fieldObservationRepository?: FieldObservationRepository;
  agroClimateRepository?: AgroClimateRepository;
  seed?: boolean;
}) {
  const repository = opts?.repository ?? new InMemoryPhysicalSuitabilityRepository();
  const cropKnowledgeRepository =
    opts?.cropKnowledgeRepository ?? new InMemoryCropKnowledgeRepository();
  const soilLaboratoryRepository =
    opts?.soilLaboratoryRepository ?? new InMemorySoilLaboratoryRepository();
  const soilSamplingRepository =
    opts?.soilSamplingRepository ?? new InMemorySoilSamplingRepository();
  const irrigationWaterRepository =
    opts?.irrigationWaterRepository ?? new InMemoryIrrigationWaterRepository();
  const fieldObservationRepository =
    opts?.fieldObservationRepository ?? new InMemoryFieldObservationRepository();
  const agroClimateRepository =
    opts?.agroClimateRepository ?? new InMemoryAgroClimateRepository();
  const shouldSeed = opts?.seed !== false;
  let seedPromise: Promise<void> | null = null;

  const ensureSeed = async () => {
    if (!shouldSeed) return;
    if (!seedPromise) {
      seedPromise = (async () => {
        const crops = await repository.listCrops();
        if (crops.length === 0) {
          await seedPhysicalSuitabilityPhase1(repository);
        }
        await seedSeasonalCropScientificProfileV1(repository);
        await seedCropKnowledgeGeneralInformation(cropKnowledgeRepository, repository);
        await seedCropPhenologyEngine(cropKnowledgeRepository);
        await seedCropClimateRequirements(cropKnowledgeRepository);
        await seedCropSoilRequirements(cropKnowledgeRepository);
        await seedCropWaterRequirements(cropKnowledgeRepository);
        await seedCropTerrainRequirements(cropKnowledgeRepository);
        await seedCropRiskProfile(cropKnowledgeRepository);
        await seedCropProductionCalendar(cropKnowledgeRepository);
        await seedScientificReferenceLibrary(cropKnowledgeRepository);
        await seedSoilLaboratoryCore(soilLaboratoryRepository);
        await seedSoilSamplingManagement(soilSamplingRepository);
        await seedIrrigationWaterLaboratory(irrigationWaterRepository);
        await seedFieldObservationModule(fieldObservationRepository);
        await seedAgroClimateModule(agroClimateRepository);
      })();
    }
    await seedPromise;
  };

  // Eager seed for in-memory (non-blocking start; first request waits if needed)
  void ensureSeed();

  const facade = new PhysicalSuitabilityFacade(
    repository,
    cropKnowledgeRepository,
    soilLaboratoryRepository,
    soilSamplingRepository,
    irrigationWaterRepository,
    fieldObservationRepository,
    agroClimateRepository,
  );
  const controller = new PhysicalSuitabilityController(facade);
  const inner = createPhysicalSuitabilityRouter(controller);
  const soilCatalogRouter = createSoilCatalogRouter(controller);

  const router = Router();
  router.use(async (_req, _res, next) => {
    try {
      await ensureSeed();
      next();
    } catch (err) {
      next(err);
    }
  });
  router.use(inner);

  const soilCatalog = Router();
  soilCatalog.use(async (_req, _res, next) => {
    try {
      await ensureSeed();
      next();
    } catch (err) {
      next(err);
    }
  });
  soilCatalog.use(soilCatalogRouter);

  return {
    router,
    soilCatalogRouter: soilCatalog,
    facade,
    controller,
    repository,
    cropKnowledgeRepository,
    soilLaboratoryRepository,
    soilSamplingRepository,
    irrigationWaterRepository,
    fieldObservationRepository,
    agroClimateRepository,
    ensureSeed,
  };
}

export type { PhysicalSuitabilityFacade };
export type { PhysicalSuitabilityRepository };
export type { CropKnowledgeRepository };
export type { SoilLaboratoryRepository };
export type { SoilSamplingRepository };
export type { IrrigationWaterRepository };
export type { FieldObservationRepository };
export type { AgroClimateRepository };
