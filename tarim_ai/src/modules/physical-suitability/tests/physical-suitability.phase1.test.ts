import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryPhysicalSuitabilityRepository,
  newId,
} from '../repositories/physical-suitability.repository.js';
import { seedPhysicalSuitabilityPhase1 } from '../seed/phase1-seed.js';
import { PhysicalSuitabilityFacade } from '../services/physical-suitability.facade.js';
import { convertToStandardUnit } from '../services/unit-conversion.service.js';
import { ApiError } from '../../../utils/api-error.js';
import type {
  CriticalBarrierRule,
  CropCriterionRule,
  DataSourceRecord,
} from '../types/physical-suitability.types.js';

describe('physical-suitability Phase 1', () => {
  let repo: InMemoryPhysicalSuitabilityRepository;
  let facade: PhysicalSuitabilityFacade;

  beforeEach(async () => {
    repo = new InMemoryPhysicalSuitabilityRepository();
    await seedPhysicalSuitabilityPhase1(repo);
    facade = new PhysicalSuitabilityFacade(repo);
  });

  it('seeds 17 pilot crops as Seasonal', async () => {
    const crops = await facade.profiles.listCrops();
    expect(crops).toHaveLength(17);
    expect(crops.every((c) => c.lifecycleType === 'Seasonal')).toBe(true);
    expect(crops.map((c) => c.code).sort()).toEqual(
      [
        'barley',
        'chickpea',
        'corn',
        'cotton',
        'cucumber',
        'eggplant',
        'garlic',
        'melon',
        'onion',
        'pepper',
        'potato',
        'red_lentil',
        'sunflower',
        'tomato',
        'watermelon',
        'wheat',
        'zucchini',
      ].sort(),
    );
  });

  it('1) irrigation false triggers critical barrier for irrigated scenario', async () => {
    const tomato = await facade.profiles.getCrop('tomato');
    expect(tomato).toBeTruthy();
    const scenarios = await facade.listScenarios(tomato!.id);
    const irrigated = scenarios.find((s) => s.productionType === 'Irrigated')!;
    const barriers = await repo.listBarrierRules({
      cropId: tomato!.id,
      productionScenarioId: irrigated.id,
      activeOnly: true,
    });
    const irrigationBarrier = barriers.find(
      (b) => b.criterionCode === 'water.irrigation_available',
    )!;
    expect(irrigationBarrier.booleanExpected).toBe(true);
    const result = facade.evaluateBarrier(irrigationBarrier, false);
    expect(result.isTriggered).toBe(true);
    expect(result.severity).toBe('Blocking');
  });

  it('2) irrigation null is not assumed unsuitable — missing-data path', async () => {
    const tomato = await facade.profiles.getCrop('tomato');
    const scenarios = await facade.listScenarios(tomato!.id);
    const irrigated = scenarios[0]!;
    const { rules, barriers } = await facade.matrix.getMatrix(tomato!.id, irrigated.id);
    const rule = rules.find((r) => r.criterionCode === 'water.irrigation_available')!;
    const barrier = barriers.find((b) => b.criterionCode === 'water.irrigation_available')!;

    const barrierResult = facade.evaluateBarrier(barrier, null);
    expect(barrierResult.isTriggered).toBe(false);

    const missing = facade.evaluateMissingData({
      criterionCode: rule.criterionCode,
      requirementLevel: rule.requirementLevel,
      missingDataBehavior: rule.missingDataBehavior,
      observedValue: null,
    });
    expect(missing?.missingDataBehavior).toBe('MarkInsufficientData');
    expect(missing?.message).toMatch(/must not be assumed/i);
  });

  it('3) missing soil EC is not treated as zero', async () => {
    const missing = facade.evaluateMissingData({
      criterionCode: 'soil.ec',
      requirementLevel: 'Important',
      missingDataBehavior: 'ContinueWithReducedConfidence',
      observedValue: null,
    });
    expect(missing).toBeTruthy();
    expect(missing?.impact).toMatch(/reduced confidence/i);
    const barrier: CriticalBarrierRule = {
      id: newId(),
      code: 'test_ec',
      cropId: 'x',
      productionScenarioId: 'y',
      criterionCode: 'soil.ec',
      cropCriterionRuleId: null,
      severity: 'Blocking',
      evaluationType: 'Threshold',
      criticalMinimum: null,
      criticalMaximum: 4,
      booleanExpected: null,
      allowedValues: null,
      disallowedValues: null,
      explanationTemplate: 'EC too high',
      sourceReferenceId: null,
      isActive: true,
      verificationStatus: 'SourceVerified',
      version: 1,
    };
    expect(facade.evaluateBarrier(barrier, null).isTriggered).toBe(false);
    expect(facade.evaluateBarrier(barrier, 0).isTriggered).toBe(false);
  });

  it('4) laboratory pH outranks SoilGrids pH', async () => {
    const candidates: DataSourceRecord[] = [
      {
        sourceType: 'GlobalModel',
        provider: 'SoilGrids',
        observationDate: '2024-01-01',
        retrievedAt: new Date().toISOString(),
        spatialResolution: '250m',
        temporalResolution: null,
        measurementMethod: 'model',
        isVerified: false,
        verificationStatus: 'Draft',
        confidence: 'low',
        originalValue: 8.1,
        originalUnit: 'pH',
        normalizedValue: 8.1,
        unit: 'pH',
        metadata: {},
      },
      {
        sourceType: 'Laboratory',
        provider: 'Lab-A',
        observationDate: '2025-06-01',
        retrievedAt: new Date().toISOString(),
        spatialResolution: 'point',
        temporalResolution: null,
        measurementMethod: 'lab',
        isVerified: true,
        verificationStatus: 'SourceVerified',
        confidence: 'high',
        originalValue: 7.2,
        originalUnit: 'pH',
        normalizedValue: 7.2,
        unit: 'pH',
        metadata: {},
      },
    ];
    const resolved = await facade.resolveDataSource('soil.ph', candidates);
    expect(resolved.selected.sourceType).toBe('Laboratory');
    expect(resolved.selected.originalValue).toBe(7.2);
    expect(resolved.selectionReason).toMatch(/Laboratory/i);
  });

  it('5) stale / unverified sources remain traceable in candidates', async () => {
    const candidates: DataSourceRecord[] = [
      {
        sourceType: 'FieldMeasurement',
        provider: 'Field',
        observationDate: '2018-01-01',
        retrievedAt: '2018-01-02T00:00:00.000Z',
        spatialResolution: null,
        temporalResolution: null,
        measurementMethod: null,
        isVerified: false,
        verificationStatus: 'Draft',
        confidence: 'low',
        originalValue: 7.0,
        originalUnit: 'pH',
        normalizedValue: 7.0,
        unit: 'pH',
        metadata: { note: 'old' },
      },
      {
        sourceType: 'Laboratory',
        provider: 'Lab',
        observationDate: '2025-01-01',
        retrievedAt: new Date().toISOString(),
        spatialResolution: null,
        temporalResolution: null,
        measurementMethod: null,
        isVerified: true,
        verificationStatus: 'SourceVerified',
        confidence: 'high',
        originalValue: 7.1,
        originalUnit: 'pH',
        normalizedValue: 7.1,
        unit: 'pH',
        metadata: {},
      },
    ];
    const resolved = await facade.resolveDataSource('soil.ph', candidates);
    expect(resolved.candidates).toHaveLength(2);
    expect(resolved.candidates.find((c) => c.observationDate === '2018-01-01')).toBeTruthy();
    expect(resolved.selected.isVerified).toBe(true);
  });

  it('6) unsupported unit raises validation error', () => {
    expect(() => convertToStandardUnit(10, 'stone', 'cm')).toThrow(ApiError);
  });

  it('7) optimal range outside acceptable fails validation', async () => {
    const tomato = await facade.profiles.getCrop('tomato');
    const scenarios = await facade.listScenarios(tomato!.id);
    const { rules } = await facade.matrix.getMatrix(tomato!.id, scenarios[0]!.id);
    const phRule = rules.find((r) => r.criterionCode === 'soil.ph')!;
    const bad: CropCriterionRule = {
      ...phRule,
      optimalRange: { min: 5, max: 9, unit: 'pH' },
      acceptableRange: { min: 6, max: 7.5, unit: 'pH' },
    };
    await repo.upsertRule(bad);
    const result = await facade.validateCrop(tomato!.id);
    expect(result.issues.some((i) => i.code === 'OPTIMAL_OUTSIDE_ACCEPTABLE')).toBe(true);
    expect(result.valid).toBe(false);
  });

  it('8) rule without source cannot be treated as publishable', async () => {
    const tomato = await facade.profiles.getCrop('tomato');
    const scenarios = await facade.listScenarios(tomato!.id);
    const { rules } = await facade.matrix.getMatrix(tomato!.id, scenarios[0]!.id);
    const rule = { ...rules[0]!, sourceReferenceId: null };
    await repo.upsertRule(rule);
    const result = await facade.validateCrop(tomato!.id);
    expect(result.issues.some((i) => i.code === 'SOURCE_REFERENCE_MISSING')).toBe(true);
  });

  it('9) Draft rules are not Approved', async () => {
    const crops = await facade.profiles.listCrops();
    const result = await facade.validateCrop(crops[0]!.id);
    expect(result.issues.some((i) => i.code === 'DRAFT_RULE')).toBe(true);
    const rules = await repo.listRules({ cropId: crops[0]!.id, activeOnly: true });
    expect(rules.every((r) => r.verificationStatus !== 'Approved')).toBe(true);
  });

  it('10) inactive crop/rules are excluded from active matrix', async () => {
    const tomato = await facade.profiles.getCrop('tomato');
    const scenarios = await facade.listScenarios(tomato!.id);
    const { rules } = await facade.matrix.getMatrix(tomato!.id, scenarios[0]!.id);
    await facade.deactivateRule(rules[0]!.id, 'tester', 'test deactivate');
    const after = await facade.matrix.getMatrix(tomato!.id, scenarios[0]!.id);
    expect(after.rules.find((r) => r.id === rules[0]!.id)).toBeUndefined();
  });

  it('11) conflicting active rules are detected', async () => {
    const tomato = await facade.profiles.getCrop('tomato');
    const scenarios = await facade.listScenarios(tomato!.id);
    const { rules } = await facade.matrix.getMatrix(tomato!.id, scenarios[0]!.id);
    const base = rules[0]!;
    await repo.upsertRule({ ...base, id: newId() });
    const conflicts = await facade.matrix.detectConflicts(tomato!.id, scenarios[0]!.id);
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('12) Required vs Supporting missing data produce different impacts', () => {
    const required = facade.evaluateMissingData({
      criterionCode: 'soil.drainage',
      requirementLevel: 'Required',
      missingDataBehavior: 'MarkInsufficientData',
      observedValue: null,
    });
    const supporting = facade.evaluateMissingData({
      criterionCode: 'terrain.aspect',
      requirementLevel: 'Supporting',
      missingDataBehavior: 'WarningOnly',
      observedValue: null,
    });
    expect(required?.message).toMatch(/Required/i);
    expect(supporting?.message).toMatch(/Supporting/i);
    expect(required?.missingDataBehavior).not.toBe(supporting?.missingDataBehavior);
  });

  it('13) different production scenarios select different matrices', async () => {
    const wheat = await facade.profiles.getCrop('wheat');
    const scenarios = await facade.listScenarios(wheat!.id);
    expect(scenarios.length).toBeGreaterThanOrEqual(2);
    const rainfed = scenarios.find((s) => s.productionType === 'Rainfed')!;
    const irrigated = scenarios.find((s) => s.productionType === 'Irrigated')!;
    const m1 = await facade.matrix.getMatrix(wheat!.id, rainfed.id);
    const m2 = await facade.matrix.getMatrix(wheat!.id, irrigated.id);
    const rainfedHasIrrigation = m1.rules.some(
      (r) => r.criterionCode === 'water.irrigation_available',
    );
    const irrigatedHasIrrigation = m2.rules.some(
      (r) => r.criterionCode === 'water.irrigation_available',
    );
    expect(rainfedHasIrrigation).toBe(false);
    expect(irrigatedHasIrrigation).toBe(true);
  });

  it('14) values are converted to standard units before rule use', () => {
    const cm = convertToStandardUnit(1.2, 'm', 'cm');
    expect(cm).toBeCloseTo(120);
    const dsm = convertToStandardUnit(2000, 'µS/cm', 'dS/m');
    expect(dsm).toBeCloseTo(2);
  });

  it('15) triggered barrier is not hidden by other criteria being fine', async () => {
    const tomato = await facade.profiles.getCrop('tomato');
    const scenarios = await facade.listScenarios(tomato!.id);
    const barriers = await repo.listBarrierRules({
      cropId: tomato!.id,
      productionScenarioId: scenarios[0]!.id,
      activeOnly: true,
    });
    const irrigationBarrier = barriers.find(
      (b) => b.criterionCode === 'water.irrigation_available',
    )!;
    const triggered = facade.evaluateBarrier(irrigationBarrier, false);
    expect(triggered.isTriggered).toBe(true);
    // Other criteria "ok" does not clear barrier
    const other = facade.evaluateBarrier(
      barriers.find((b) => b.criterionCode === 'soil.drainage')!,
      'good',
    );
    expect(other.isTriggered).toBe(false);
    expect(triggered.isTriggered).toBe(true);
  });

  it('does not invent numeric agronomic thresholds in seed', async () => {
    const rules = await repo.listRules({ activeOnly: true });
    expect(rules.length).toBeGreaterThan(0);
    expect(
      rules.every(
        (r) =>
          r.optimalRange == null &&
          r.acceptableRange == null &&
          r.criticalMinimum == null &&
          r.criticalMaximum == null,
      ),
    ).toBe(true);
  });
});
