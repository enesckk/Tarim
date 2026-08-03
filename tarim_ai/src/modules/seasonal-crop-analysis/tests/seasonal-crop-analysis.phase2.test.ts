import { beforeAll, describe, expect, it } from 'vitest';
import { createPhysicalSuitabilityModule } from '../../physical-suitability/index.js';
import type { PhysicalSuitabilityFacade } from '../../physical-suitability/services/physical-suitability.facade.js';
import { SeasonalCriticalBarrierService } from '../services/seasonal-critical-barrier.service.js';
import { SeasonalInputResolutionService } from '../services/seasonal-input-resolution.service.js';
import { SeasonalRankingService } from '../services/seasonal-ranking.service.js';
import { SeasonalOverallSuitabilityService } from '../services/seasonal-overall-suitability.service.js';
import { SeasonalComponentSuitabilityService } from '../services/seasonal-component-suitability.service.js';
import type { CropAnalysisResult, ResolvedInputValue } from '../types/seasonal-crop-analysis.types.js';

describe('seasonal-crop-analysis phase2 pipeline logic', () => {
  let facade: PhysicalSuitabilityFacade;
  let barrierService: SeasonalCriticalBarrierService;

  beforeAll(async () => {
    const module = createPhysicalSuitabilityModule();
    await module.ensureSeed();
    facade = module.facade;
    barrierService = new SeasonalCriticalBarrierService(facade);
  });

  describe('operational irrigation barrier', () => {
    it('blocks an irrigated scenario when applicant declared no irrigation water', async () => {
      const cornCrop = await facade.profiles.getCrop('corn');
      expect(cornCrop).toBeTruthy();
      const scenarios = (await facade.listScenarios(cornCrop!.id)).filter((s) => s.isActive);
      const irrigatedScenario = scenarios.find((s) => s.productionType === 'Irrigated');
      expect(irrigatedScenario).toBeTruthy();

      const result = await barrierService.evaluate({
        cropId: cornCrop!.id,
        scenario: irrigatedScenario!,
        resolvedByCriterion: new Map<string, ResolvedInputValue>(),
        irrigationAvailability: 'unavailable',
        hasIrrigationWaterReport: false,
      });

      expect(result.hasBlockingBarrier).toBe(true);
      expect(result.blockingBarrierCodes).toContain('irrigation_unavailable_for_irrigated_scenario');
    });

    it('does not block an irrigated scenario when sufficient water is declared, but flags quality as unknown without a report', async () => {
      const cornCrop = await facade.profiles.getCrop('corn');
      const scenarios = (await facade.listScenarios(cornCrop!.id)).filter((s) => s.isActive);
      const irrigatedScenario = scenarios.find((s) => s.productionType === 'Irrigated');

      const result = await barrierService.evaluate({
        cropId: cornCrop!.id,
        scenario: irrigatedScenario!,
        resolvedByCriterion: new Map<string, ResolvedInputValue>(),
        irrigationAvailability: 'available_and_sufficient',
        hasIrrigationWaterReport: false,
      });

      expect(result.hasBlockingBarrier).toBe(false);
      expect(result.limitations).toContain('irrigation_water_quality_unknown');
    });

    it('does not raise an irrigation barrier for a rainfed scenario regardless of declaration', async () => {
      const wheatCrop = await facade.profiles.getCrop('wheat');
      expect(wheatCrop).toBeTruthy();
      const scenarios = (await facade.listScenarios(wheatCrop!.id)).filter((s) => s.isActive);
      const rainfedScenario = scenarios.find((s) => s.productionType === 'Rainfed');
      expect(rainfedScenario).toBeTruthy();

      const result = await barrierService.evaluate({
        cropId: wheatCrop!.id,
        scenario: rainfedScenario!,
        resolvedByCriterion: new Map<string, ResolvedInputValue>(),
        irrigationAvailability: 'unavailable',
        hasIrrigationWaterReport: false,
      });

      expect(result.hasBlockingBarrier).toBe(false);
      expect(result.barriers.some((b) => b.code.includes('irrigation'))).toBe(false);
    });
  });

  describe('ExpertReviewed catalog barriers — scientific EC thresholds (seasonal-crop-scientific-profile-v1)', () => {
    it('promotes the wheat soil.ec barrier to ExpertReviewed with the CR-sourced threshold and blocks above it', async () => {
      const wheatCrop = await facade.profiles.getCrop('wheat');
      expect(wheatCrop).toBeTruthy();
      const scenarios = (await facade.listScenarios(wheatCrop!.id)).filter((s) => s.isActive);
      const rainfedScenario = scenarios.find((s) => s.productionType === 'Rainfed');
      expect(rainfedScenario).toBeTruthy();

      const { barriers } = await facade.matrix.getMatrix(wheatCrop!.id, rainfedScenario!.id);
      const ecBarrier = barriers.find((b) => b.criterionCode === 'soil.ec');
      expect(ecBarrier).toBeTruthy();
      expect(ecBarrier!.verificationStatus).toBe('ExpertReviewed');
      // Sourced verbatim from crop-recommendation/knowledge/crops/wheat.json (maximumElectricalConductivityDsM).
      expect(ecBarrier!.criticalMaximum).toBe(4);
      expect(ecBarrier!.sourceReferenceId).toBeTruthy();

      const aboveThreshold = await barrierService.evaluate({
        cropId: wheatCrop!.id,
        scenario: rainfedScenario!,
        resolvedByCriterion: new Map<string, ResolvedInputValue>([
          [
            'soil.ec',
            {
              criterionCode: 'soil.ec',
              value: 6,
              unit: 'dS/m',
              selectedSourceType: 'Laboratory',
              selectionReason: 'test',
              candidateCount: 1,
              candidates: [],
            },
          ],
        ]),
        irrigationAvailability: 'unavailable',
        hasIrrigationWaterReport: false,
      });
      expect(aboveThreshold.hasBlockingBarrier).toBe(true);
      expect(aboveThreshold.blockingBarrierCodes).toContain('wheat_rainfed_open__soil_ec__barrier');
      const triggeredOutcome = aboveThreshold.barriers.find(
        (b) => b.code === 'wheat_rainfed_open__soil_ec__barrier',
      );
      expect(triggeredOutcome?.threshold).toBe(4);
      expect(triggeredOutcome?.unit).toBe('dS/m');
      expect(triggeredOutcome?.sourceReference).toBe('Tarım AI Crop Recommendation Knowledge Package');

      const belowThreshold = await barrierService.evaluate({
        cropId: wheatCrop!.id,
        scenario: rainfedScenario!,
        resolvedByCriterion: new Map<string, ResolvedInputValue>([
          [
            'soil.ec',
            {
              criterionCode: 'soil.ec',
              value: 1.5,
              unit: 'dS/m',
              selectedSourceType: 'Laboratory',
              selectionReason: 'test',
              candidateCount: 1,
              candidates: [],
            },
          ],
        ]),
        irrigationAvailability: 'unavailable',
        hasIrrigationWaterReport: false,
      });
      expect(belowThreshold.hasBlockingBarrier).toBe(false);
    });

    it('promotes the corn irrigation-availability barrier to ExpertReviewed without inventing EC/pH numbers for melon', async () => {
      const cornCrop = await facade.profiles.getCrop('corn');
      const cornScenarios = (await facade.listScenarios(cornCrop!.id)).filter((s) => s.isActive);
      const irrigatedScenario = cornScenarios.find((s) => s.productionType === 'Irrigated');
      const { barriers: cornBarriers } = await facade.matrix.getMatrix(
        cornCrop!.id,
        irrigatedScenario!.id,
      );
      const irrigationBarrier = cornBarriers.find(
        (b) => b.criterionCode === 'water.irrigation_available',
      );
      expect(irrigationBarrier?.verificationStatus).toBe('ExpertReviewed');
      expect(irrigationBarrier?.booleanExpected).toBe(true);

      // Melon is irrigation-only in the scientific seed — its EC barrier must
      // remain Draft/null; no threshold was ever verified for it.
      const melonCrop = await facade.profiles.getCrop('melon');
      const melonScenarios = (await facade.listScenarios(melonCrop!.id)).filter((s) => s.isActive);
      const melonIrrigated = melonScenarios.find((s) => s.productionType === 'Irrigated');
      const { barriers: melonBarriers } = await facade.matrix.getMatrix(
        melonCrop!.id,
        melonIrrigated!.id,
      );
      const melonEcBarrier = melonBarriers.find((b) => b.criterionCode === 'soil.ec');
      expect(melonEcBarrier?.verificationStatus).toBe('Draft');
      expect(melonEcBarrier?.criticalMaximum).toBeNull();

      const melonIrrigationBarrier = melonBarriers.find(
        (b) => b.criterionCode === 'water.irrigation_available',
      );
      expect(melonIrrigationBarrier?.verificationStatus).toBe('ExpertReviewed');
    });
  });

  describe('catalog barrier rules — Draft never blocks', () => {
    it('never blocks on the Phase-1 seeded catalog barrier rules (all Draft)', async () => {
      // sunflower is a Phase-1 structural shell untouched by the
      // seasonal-crop-scientific-profile-v1 seed (no CR EC number was ever
      // sourced for it), so every one of its catalog rules is still Draft —
      // the cleanest crop for a "Draft never blocks" universal check.
      const sunflowerCrop = await facade.profiles.getCrop('sunflower');
      expect(sunflowerCrop).toBeTruthy();
      const scenarios = (await facade.listScenarios(sunflowerCrop!.id)).filter((s) => s.isActive);
      const rainfedScenario = scenarios.find((s) => s.productionType === 'Rainfed');
      expect(rainfedScenario).toBeTruthy();

      const { barriers: catalogBarrierRules } = await facade.matrix.getMatrix(
        sunflowerCrop!.id,
        rainfedScenario!.id,
      );
      // Sanity: Phase 1 barrier rules exist for this crop and are still Draft.
      expect(catalogBarrierRules.length).toBeGreaterThan(0);
      expect(catalogBarrierRules.every((r) => r.verificationStatus === 'Draft')).toBe(true);

      const result = await barrierService.evaluate({
        cropId: sunflowerCrop!.id,
        scenario: rainfedScenario!,
        resolvedByCriterion: new Map<string, ResolvedInputValue>(),
        irrigationAvailability: 'unavailable',
        hasIrrigationWaterReport: false,
      });

      // Extreme observed value that would trigger any numeric threshold if it were eligible.
      const withExtremeValue = await barrierService.evaluate({
        cropId: sunflowerCrop!.id,
        scenario: rainfedScenario!,
        resolvedByCriterion: new Map<string, ResolvedInputValue>([
          [
            'soil.ph',
            {
              criterionCode: 'soil.ph',
              value: -999,
              unit: 'pH',
              selectedSourceType: 'GlobalModel',
              selectionReason: 'test',
              candidateCount: 1,
              candidates: [],
            },
          ],
        ]),
        irrigationAvailability: 'unavailable',
        hasIrrigationWaterReport: false,
      });

      expect(result.barriers.filter((b) => b.source === 'catalog_rule')).toHaveLength(0);
      expect(withExtremeValue.hasBlockingBarrier).toBe(false);
    });
  });

  describe('input resolution — no invented values', () => {
    it('continues with modelled soil data (no lab results) and never invents EC when absent', async () => {
      const inputResolution = new SeasonalInputResolutionService(facade);
      const { resolved, byCriterion, limitations } = await inputResolution.resolve({
        climate: null,
        soil: {
          provider: 'mock',
          soil: {
            ph: 6.8,
            electricalConductivityDsM: null,
            organicMatterPercent: 1.4,
            texture: 'loam',
          },
          metadata: { textureFractions: { clay: 20, sand: 40, silt: 40 } },
        } as any,
        terrain: null,
        soilLabResults: null,
        irrigationAvailability: 'unavailable',
      });

      const ph = byCriterion.get('soil.ph');
      expect(ph).toBeTruthy();
      expect(ph!.selectedSourceType).toBe('GlobalModel');
      expect(ph!.value).toBe(6.8);

      // EC is null in the source profile — must be omitted, never fabricated as 0.
      expect(byCriterion.has('soil.ec')).toBe(false);
      expect(resolved.every((r) => r.criterionCode !== 'soil.ec')).toBe(true);
      expect(limitations).toContain('climate_profile_unavailable');
      expect(limitations).toContain('terrain_profile_unavailable');
    });
  });

  describe('component + overall suitability — null is not 0', () => {
    it('marks a crop insufficient_data with a null score when no scoring source has the crop', () => {
      const componentService = new SeasonalComponentSuitabilityService();
      const overallService = new SeasonalOverallSuitabilityService();

      const componentSuitability = componentService.build('okra', new Map());
      expect(componentSuitability[0]!.score).toBeNull();
      expect(componentSuitability[0]!.score).not.toBe(0);
      expect(componentSuitability[0]!.classification).toBe('insufficient_data');

      const overall = overallService.build({
        hasBlockingBarrier: false,
        blockingBarrierCodes: [],
        componentSuitability,
      });
      expect(overall.eligibleForRanking).toBe(false);
      expect(overall.score).toBeNull();
      expect(overall.classification).toBe('preliminary_only');
    });
  });

  describe('ranking — deterministic ordering', () => {
    function crop(
      code: string,
      score: number | null,
      confidence: 'low' | 'medium' | 'high',
      eligible = true,
    ): CropAnalysisResult {
      return {
        requestedCropCode: code,
        catalogCropCode: code,
        cropName: code,
        supported: true,
        scenarioCode: 'x',
        productionType: 'Rainfed',
        barriers: [],
        componentSuitability: [],
        overall: {
          eligibleForRanking: eligible,
          score,
          classification: eligible ? 'eligible' : 'preliminary_only',
          blockingBarrierCodes: [],
        },
        confidence: { level: confidence, reasons: [] },
        explanation: '',
        rank: null,
      };
    }

    it('sorts by score desc, then confidence desc, then cropCode asc — deterministically', () => {
      const ranking = new SeasonalRankingService();
      const input = [
        crop('barley', 70, 'low'),
        crop('wheat', 80, 'high'),
        crop('chickpea', 80, 'high'),
        crop('cotton', 80, 'medium'),
        crop('sunflower', null, 'low', false),
      ];

      const ranked = ranking.rank(input);
      const rankedCodes = ranked.filter((c) => c.rank != null).map((c) => c.requestedCropCode);

      // wheat and chickpea tie on score+confidence -> alphabetical tiebreak
      expect(rankedCodes).toEqual(['chickpea', 'wheat', 'cotton', 'barley']);
      expect(ranked.find((c) => c.requestedCropCode === 'sunflower')!.rank).toBeNull();

      // Re-running on a shuffled copy produces the identical order (determinism).
      const shuffled = [input[4]!, input[1]!, input[3]!, input[0]!, input[2]!];
      const rankedAgain = ranking.rank(shuffled);
      const rankedCodesAgain = rankedAgain.filter((c) => c.rank != null).map((c) => c.requestedCropCode);
      expect(rankedCodesAgain).toEqual(rankedCodes);
    });
  });
});
