/* Temporary evidence-gathering script for the seasonal-crop-analysis V1
 * implementation report. Not part of the shipped module — safe to delete
 * after the report is written. Exercises scenarios A-H directly against the
 * real orchestrator (in-process, same code path as the HTTP layer) so the
 * report can cite genuine pipeline output instead of invented examples.
 */
import { createParcelModule } from '../src/modules/parcel/index.js';
import { createEnvironmentModule } from '../src/modules/environment/index.js';
import { createTerrainModule } from '../src/modules/terrain/index.js';
import { createPhysicalSuitabilityModule } from '../src/modules/physical-suitability/index.js';
import { SeasonalAnalysisOrchestratorService } from '../src/modules/seasonal-crop-analysis/services/seasonal-analysis-orchestrator.service.js';
import { InMemorySeasonalAnalysisRepository } from '../src/modules/seasonal-crop-analysis/repositories/in-memory-seasonal-analysis.repository.js';
import type { SeasonalCropAnalysisRequest } from '../src/modules/seasonal-crop-analysis/types/seasonal-crop-analysis.types.js';

process.env.PARCEL_PROVIDER = 'mock';
process.env.CLIMATE_PROVIDER = 'mock';
process.env.SOIL_PROVIDER = 'mock';
process.env.TERRAIN_PROVIDER = 'mock';

const GUNGURGE = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

async function main() {
  const parcelModule = createParcelModule();
  const environmentModule = createEnvironmentModule(parcelModule.parcelQueryService);
  const terrainModule = createTerrainModule(parcelModule.parcelQueryService);
  const psModule = createPhysicalSuitabilityModule();
  await psModule.ensureSeed();

  const orchestrator = new SeasonalAnalysisOrchestratorService(
    new InMemorySeasonalAnalysisRepository(),
    {
      parcelQueryService: parcelModule.parcelQueryService,
      climateProfileService: environmentModule.climateProfileService,
      soilProfileService: environmentModule.soilProfileService,
      terrainProfileService: terrainModule.terrainProfileService,
      physicalSuitabilityFacade: psModule.facade,
      cropRecommendationService: null, // isolate barrier/confidence/ranking logic from network-bound scoring
    },
  );

  function baseRequest(
    overrides: Partial<SeasonalCropAnalysisRequest>,
  ): SeasonalCropAnalysisRequest {
    return {
      parcelQuery: GUNGURGE,
      seasonYear: 2026,
      productionMode: 'auto',
      irrigationAvailability: 'unavailable',
      targetCropCodes: ['wheat', 'maize'],
      ...overrides,
    };
  }

  console.log('\n=== Scenario A: Rainfed / irrigation unavailable (wheat, maize) ===');
  const a = await orchestrator.createAnalysis(
    baseRequest({ productionMode: 'rainfed', irrigationAvailability: 'unavailable' }),
    'scenario-a',
  );
  console.log(JSON.stringify(a.result?.crops, null, 2));

  console.log('\n=== Scenario B: Water available & sufficient (maize irrigated) ===');
  const b = await orchestrator.createAnalysis(
    baseRequest({
      productionMode: 'irrigated',
      irrigationAvailability: 'available_and_sufficient',
      targetCropCodes: ['maize'],
    }),
    'scenario-b',
  );
  console.log(JSON.stringify(b.result?.crops, null, 2));
  console.log('limitations:', b.result?.limitations);

  console.log('\n=== Scenario C: Water limited (maize irrigated) ===');
  const c = await orchestrator.createAnalysis(
    baseRequest({
      productionMode: 'irrigated',
      irrigationAvailability: 'available_limited',
      targetCropCodes: ['maize'],
    }),
    'scenario-c',
  );
  console.log(JSON.stringify(c.result?.crops, null, 2));

  console.log('\n=== Scenario D: No soil lab report (wheat) — modelled soil only ===');
  const d = await orchestrator.createAnalysis(
    baseRequest({ productionMode: 'rainfed', irrigationAvailability: 'unavailable', targetCropCodes: ['wheat'] }),
    'scenario-d',
  );
  console.log('resolvedInputs (soil.*):', JSON.stringify(d.result?.resolvedInputs.filter((r) => r.criterionCode.startsWith('soil.')), null, 2));

  console.log('\n=== Scenario E: Approved soil lab report present (wheat) ===');
  const lab = await psModule.facade.createLaboratory({ name: 'Report Lab TR', country: 'TR' });
  const sample = await psModule.facade.createSoilSample({
    parcelId: 'seasonal-scenario-parcel',
    sampleCode: `SCN-E-${Date.now()}`,
    latitude: 37.2066,
    longitude: 37.4752,
  });
  await psModule.facade.createSoilAnalysisResult(sample.id, {
    parameterCode: 'SOIL_PH',
    parameterName: 'pH (H2O)',
    measuredValue: 7.1,
    unit: 'pH',
    valueSourceType: 'Measured',
  });
  await psModule.facade.createSoilAnalysisResult(sample.id, {
    parameterCode: 'SOIL_EC',
    parameterName: 'Electrical Conductivity',
    measuredValue: 0.9,
    unit: 'dS/m',
    valueSourceType: 'Measured',
  });
  const report = await psModule.facade.createLaboratoryReport({
    reportNumber: `SCN-E-${Date.now()}`,
    laboratoryId: lab.id,
    sampleId: sample.id,
  });
  await psModule.facade.addLaboratoryApproval(report.id, {
    approvedBy: 'evidence-script',
    approvalStatus: 'APPROVED',
  });
  const e = await orchestrator.createAnalysis(
    baseRequest({
      productionMode: 'rainfed',
      irrigationAvailability: 'unavailable',
      targetCropCodes: ['wheat'],
      soilLaboratoryReportId: report.id,
    }),
    'scenario-e',
  );
  console.log('resolvedInputs (soil.*):', JSON.stringify(e.result?.resolvedInputs.filter((r) => r.criterionCode.startsWith('soil.')), null, 2));
  console.log('confidence:', JSON.stringify(e.result?.crops[0]?.confidence));

  console.log('\n=== Scenario F: Draft catalog thresholds never block (wheat, extreme conditions) ===');
  const f = await orchestrator.createAnalysis(
    baseRequest({ productionMode: 'rainfed', irrigationAvailability: 'unavailable', targetCropCodes: ['wheat'] }),
    'scenario-f',
  );
  console.log('barriers:', JSON.stringify(f.result?.crops[0]?.barriers, null, 2));

  console.log('\n=== Scenario G: Unsupported crop code (sunflower — not in PS catalog) ===');
  const g = await orchestrator.createAnalysis(
    baseRequest({ productionMode: 'rainfed', irrigationAvailability: 'unavailable', targetCropCodes: ['sunflower'] }),
    'scenario-g',
  );
  console.log('unsupportedCrops:', JSON.stringify(g.result?.unsupportedCrops));

  console.log('\n=== Scenario H: Provider failure (terrain provider throws) — partial_completed ===');
  const failingOrchestrator = new SeasonalAnalysisOrchestratorService(
    new InMemorySeasonalAnalysisRepository(),
    {
      parcelQueryService: parcelModule.parcelQueryService,
      climateProfileService: environmentModule.climateProfileService,
      soilProfileService: environmentModule.soilProfileService,
      terrainProfileService: {
        // @ts-expect-error intentional minimal stub to force a provider failure
        getProfile: async () => {
          throw new Error('synthetic DEM outage');
        },
      },
      physicalSuitabilityFacade: psModule.facade,
      cropRecommendationService: null,
    },
  );
  const h = await failingOrchestrator.createAnalysis(
    baseRequest({ productionMode: 'rainfed', irrigationAvailability: 'unavailable', targetCropCodes: ['wheat'] }),
    'scenario-h',
  );
  console.log('status:', h.status);
  console.log('steps:', JSON.stringify(h.result?.steps.find((s) => s.key === 'terrain')));
  console.log('limitations:', h.result?.limitations);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  if (err?.details) console.error(JSON.stringify(err.details, null, 2));
  process.exit(1);
});
