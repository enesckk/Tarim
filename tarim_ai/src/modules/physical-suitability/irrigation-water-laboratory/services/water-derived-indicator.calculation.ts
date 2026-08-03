import type { MeasurementUnit } from '../../soil-laboratory/types/soil-parameter.types.js';
import type {
  WaterAnalysisResult,
  WaterCalculationStatus,
  WaterDerivedIndicator,
  WaterDerivedIndicatorCode,
  WaterParameter,
} from '../types/irrigation-water.types.js';
import { unitIdForCode } from '../catalogs/water-measurement-unit.catalog.js';

/**
 * Formula versions — Phase 2.2G.
 * No irrigation suitability classification thresholds.
 *
 * SAR_v1_meqL: SAR = Na / sqrt((Ca + Mg) / 2)  [meq/L]
 * RSC_v1_meqL: RSC = (CO3 + HCO3) - (Ca + Mg)  [meq/L]
 * TOTAL_HARDNESS_v1_caco3: TH = (Ca + Mg) * 50  [mg/L as CaCO3] from meq/L
 * SODIUM_PERCENTAGE_v1: %Na = 100 * Na / (Na+Ca+Mg+K)  [meq/L]
 * ION_BALANCE_ERROR_v1: 100 * |Σcat − Σan| / (Σcat + Σan)
 * ADJUSTED_SAR_v1: deferred — Ca_x lookup table not seeded (returns INSUFFICIENT_DATA)
 */

export const FORMULA_VERSIONS = {
  SAR: 'SAR_v1_meqL',
  ADJUSTED_SAR: 'ADJUSTED_SAR_v1_deferred_cax',
  RSC: 'RSC_v1_meqL',
  TOTAL_HARDNESS: 'TOTAL_HARDNESS_v1_caco3',
  SODIUM_PERCENTAGE: 'SODIUM_PERCENTAGE_v1',
  ION_BALANCE_ERROR: 'ION_BALANCE_ERROR_v1',
} as const satisfies Record<WaterDerivedIndicatorCode, string>;

/** mg/L → meq/L equivalent weights (g/eq). Null = do not invent conversion. */
const MG_L_TO_MEQ_L: Record<string, number> = {
  SODIUM: 22.989769,
  CALCIUM: 20.039,
  MAGNESIUM: 12.1525,
  POTASSIUM: 39.0983,
  BICARBONATE: 61.0168,
  CARBONATE: 30.009,
  CHLORIDE: 35.453,
  SULFATE: 48.03,
  NITRATE: 62.0049,
  AMMONIUM: 18.038,
};

export type IonReading = {
  parameterCode: string;
  valueMeqL: number | null;
  valueMgL: number | null;
  source: 'normalized' | 'measured' | 'raw';
  resultId: string;
};

export type IndicatorCalculationOutcome = {
  indicatorCode: WaterDerivedIndicatorCode;
  calculatedValue: number | null;
  unitId: string | null;
  formulaVersion: string;
  inputParameters: Record<string, unknown>;
  calculationStatus: WaterCalculationStatus;
  calculationMessage: string | null;
};

function preferNumeric(result: WaterAnalysisResult): number | null {
  if (result.normalizedValue != null) return result.normalizedValue;
  if (result.measuredValue != null) return result.measuredValue;
  if (result.rawValue != null && result.rawValue.trim() !== '') {
    const n = Number(result.rawValue);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function unitCodeOf(
  unitId: string | null,
  unitsById: Map<string, MeasurementUnit>,
): string | null {
  if (!unitId) return null;
  return unitsById.get(unitId)?.code ?? null;
}

/**
 * Resolve ion concentration to meq/L.
 * Does not treat null as 0. Zero is only used when explicitly measured as 0.
 */
export function toMeqL(
  parameterCode: string,
  value: number | null,
  unitCode: string | null,
): { meqL: number | null; message: string | null } {
  if (value == null) return { meqL: null, message: null };
  if (unitCode === 'MEQ_PER_L') return { meqL: value, message: null };
  if (unitCode === 'MG_PER_L') {
    const ew = MG_L_TO_MEQ_L[parameterCode];
    if (ew == null || ew === 0) {
      return {
        meqL: null,
        message: `No equivalent weight for ${parameterCode}; cannot convert mg/L to meq/L`,
      };
    }
    return { meqL: value / ew, message: null };
  }
  if (unitCode == null) {
    return { meqL: null, message: `Missing unit for ${parameterCode}` };
  }
  return {
    meqL: null,
    message: `Unsupported unit ${unitCode} for ionic conversion of ${parameterCode}`,
  };
}

export function collectIonReadings(
  results: WaterAnalysisResult[],
  parametersById: Map<string, WaterParameter>,
  unitsById: Map<string, MeasurementUnit>,
): Map<string, IonReading> {
  const out = new Map<string, IonReading>();
  for (const result of results) {
    if (!result.isActive) continue;
    const param = parametersById.get(result.parameterId);
    if (!param || !param.isActive) continue;
    const value = preferNumeric(result);
    const unitId = result.normalizedUnitId ?? result.measuredUnitId;
    const unitCode = unitCodeOf(unitId, unitsById) ?? result.rawUnit;
    const { meqL } = toMeqL(param.code, value, unitCode);
    const existing = out.get(param.code);
    // Prefer normalized/measured over raw; keep first complete meq reading
    if (existing?.valueMeqL != null && meqL == null) continue;
    out.set(param.code, {
      parameterCode: param.code,
      valueMeqL: meqL,
      valueMgL: unitCode === 'MG_PER_L' && value != null ? value : null,
      source:
        result.normalizedValue != null
          ? 'normalized'
          : result.measuredValue != null
            ? 'measured'
            : 'raw',
      resultId: result.id,
    });
  }
  return out;
}

function insufficient(
  code: WaterDerivedIndicatorCode,
  formulaVersion: string,
  unitId: string | null,
  inputs: Record<string, unknown>,
  message: string,
): IndicatorCalculationOutcome {
  return {
    indicatorCode: code,
    calculatedValue: null,
    unitId,
    formulaVersion,
    inputParameters: inputs,
    calculationStatus: 'INSUFFICIENT_DATA',
    calculationMessage: message,
  };
}

function calculated(
  code: WaterDerivedIndicatorCode,
  formulaVersion: string,
  unitId: string | null,
  value: number,
  inputs: Record<string, unknown>,
): IndicatorCalculationOutcome {
  return {
    indicatorCode: code,
    calculatedValue: value,
    unitId,
    formulaVersion,
    inputParameters: inputs,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateSar(
  ions: Map<string, IonReading>,
): IndicatorCalculationOutcome {
  const version = FORMULA_VERSIONS.SAR;
  const na = ions.get('SODIUM')?.valueMeqL ?? null;
  const ca = ions.get('CALCIUM')?.valueMeqL ?? null;
  const mg = ions.get('MAGNESIUM')?.valueMeqL ?? null;
  const inputs = { Na_meqL: na, Ca_meqL: ca, Mg_meqL: mg, formula: 'Na / sqrt((Ca+Mg)/2)' };
  if (na == null || ca == null || mg == null) {
    return insufficient(
      'SAR',
      version,
      unitIdForCode('NONE'),
      inputs,
      'SAR requires Na, Ca, and Mg in meq/L (or convertible mg/L); missing values are not assumed as zero',
    );
  }
  const denom = (ca + mg) / 2;
  if (denom < 0) {
    return {
      indicatorCode: 'SAR',
      calculatedValue: null,
      unitId: unitIdForCode('NONE'),
      formulaVersion: version,
      inputParameters: inputs,
      calculationStatus: 'INVALID_INPUT',
      calculationMessage: 'Ca + Mg must not be negative',
    };
  }
  if (denom === 0) {
    return {
      indicatorCode: 'SAR',
      calculatedValue: null,
      unitId: unitIdForCode('NONE'),
      formulaVersion: version,
      inputParameters: inputs,
      calculationStatus: 'INVALID_INPUT',
      calculationMessage: 'Ca + Mg is zero; SAR undefined',
    };
  }
  return calculated('SAR', version, unitIdForCode('NONE'), na / Math.sqrt(denom), inputs);
}

export function calculateAdjustedSar(
  ions: Map<string, IonReading>,
): IndicatorCalculationOutcome {
  const version = FORMULA_VERSIONS.ADJUSTED_SAR;
  const inputs = {
    Na_meqL: ions.get('SODIUM')?.valueMeqL ?? null,
    Ca_meqL: ions.get('CALCIUM')?.valueMeqL ?? null,
    Mg_meqL: ions.get('MAGNESIUM')?.valueMeqL ?? null,
    HCO3_meqL: ions.get('BICARBONATE')?.valueMeqL ?? null,
    note: 'Ca_x lookup table not seeded in Phase 2.2G',
  };
  return insufficient(
    'ADJUSTED_SAR',
    version,
    unitIdForCode('NONE'),
    inputs,
    'Adjusted SAR requires Ca_x lookup (Suarez/FAO); table intentionally not seeded — no invented thresholds',
  );
}

export function calculateRsc(ions: Map<string, IonReading>): IndicatorCalculationOutcome {
  const version = FORMULA_VERSIONS.RSC;
  const co3 = ions.get('CARBONATE')?.valueMeqL ?? null;
  const hco3 = ions.get('BICARBONATE')?.valueMeqL ?? null;
  const ca = ions.get('CALCIUM')?.valueMeqL ?? null;
  const mg = ions.get('MAGNESIUM')?.valueMeqL ?? null;
  const inputs = {
    CO3_meqL: co3,
    HCO3_meqL: hco3,
    Ca_meqL: ca,
    Mg_meqL: mg,
    formula: '(CO3+HCO3)-(Ca+Mg)',
  };
  // CO3 may be legitimately absent → treat only when both alkalinity ions missing
  if (hco3 == null && co3 == null) {
    return insufficient(
      'RSC',
      version,
      unitIdForCode('MEQ_PER_L'),
      inputs,
      'RSC requires HCO3 and/or CO3 plus Ca and Mg; alkalinity ions missing (null ≠ 0)',
    );
  }
  if (ca == null || mg == null) {
    return insufficient(
      'RSC',
      version,
      unitIdForCode('MEQ_PER_L'),
      inputs,
      'RSC requires Ca and Mg in meq/L; missing values are not assumed as zero',
    );
  }
  const alk = (co3 ?? 0) + (hco3 ?? 0);
  // Only use 0 for the missing alkalinity ion when the other is present (common lab practice for CO3=0)
  if (co3 == null && hco3 != null) {
    inputs.CO3_meqL = 0;
  }
  return calculated(
    'RSC',
    version,
    unitIdForCode('MEQ_PER_L'),
    alk - (ca + mg),
    { ...inputs, CO3_meqL_used: co3 ?? 0, HCO3_meqL_used: hco3 ?? 0 },
  );
}

export function calculateTotalHardness(
  ions: Map<string, IonReading>,
): IndicatorCalculationOutcome {
  const version = FORMULA_VERSIONS.TOTAL_HARDNESS;
  const ca = ions.get('CALCIUM')?.valueMeqL ?? null;
  const mg = ions.get('MAGNESIUM')?.valueMeqL ?? null;
  const inputs = { Ca_meqL: ca, Mg_meqL: mg, formula: '(Ca+Mg)*50 as CaCO3 mg/L' };
  if (ca == null || mg == null) {
    return insufficient(
      'TOTAL_HARDNESS',
      version,
      unitIdForCode('MG_PER_L_CACO3'),
      inputs,
      'Total hardness requires Ca and Mg in meq/L',
    );
  }
  return calculated(
    'TOTAL_HARDNESS',
    version,
    unitIdForCode('MG_PER_L_CACO3'),
    (ca + mg) * 50,
    inputs,
  );
}

export function calculateSodiumPercentage(
  ions: Map<string, IonReading>,
): IndicatorCalculationOutcome {
  const version = FORMULA_VERSIONS.SODIUM_PERCENTAGE;
  const na = ions.get('SODIUM')?.valueMeqL ?? null;
  const ca = ions.get('CALCIUM')?.valueMeqL ?? null;
  const mg = ions.get('MAGNESIUM')?.valueMeqL ?? null;
  const k = ions.get('POTASSIUM')?.valueMeqL ?? null;
  const inputs = { Na_meqL: na, Ca_meqL: ca, Mg_meqL: mg, K_meqL: k };
  if (na == null || ca == null || mg == null) {
    return insufficient(
      'SODIUM_PERCENTAGE',
      version,
      unitIdForCode('PERCENT'),
      inputs,
      'Sodium percentage requires Na, Ca, and Mg; K optional (null ≠ 0 unless measured)',
    );
  }
  const kUsed = k ?? 0;
  const denom = na + ca + mg + kUsed;
  if (denom === 0) {
    return {
      indicatorCode: 'SODIUM_PERCENTAGE',
      calculatedValue: null,
      unitId: unitIdForCode('PERCENT'),
      formulaVersion: version,
      inputParameters: { ...inputs, K_meqL_used: kUsed },
      calculationStatus: 'INVALID_INPUT',
      calculationMessage: 'Sum of cations is zero',
    };
  }
  return calculated(
    'SODIUM_PERCENTAGE',
    version,
    unitIdForCode('PERCENT'),
    (100 * na) / denom,
    { ...inputs, K_meqL_used: kUsed, K_assumed_zero: k == null },
  );
}

export function calculateIonBalanceError(
  ions: Map<string, IonReading>,
): IndicatorCalculationOutcome {
  const version = FORMULA_VERSIONS.ION_BALANCE_ERROR;
  const cations = ['SODIUM', 'CALCIUM', 'MAGNESIUM', 'POTASSIUM'] as const;
  const anions = ['BICARBONATE', 'CARBONATE', 'CHLORIDE', 'SULFATE'] as const;
  const catValues: Record<string, number | null> = {};
  const anValues: Record<string, number | null> = {};
  let catSum = 0;
  let anSum = 0;
  let missingCat = false;
  let missingAn = false;
  for (const c of cations) {
    const v = ions.get(c)?.valueMeqL ?? null;
    catValues[c] = v;
    if (v == null) {
      if (c !== 'POTASSIUM') missingCat = true;
    } else {
      catSum += v;
    }
  }
  for (const a of anions) {
    const v = ions.get(a)?.valueMeqL ?? null;
    anValues[a] = v;
    if (v == null) {
      if (a !== 'CARBONATE') missingAn = true;
    } else {
      anSum += v;
    }
  }
  const inputs = { cations: catValues, anions: anValues };
  if (missingCat || missingAn) {
    return insufficient(
      'ION_BALANCE_ERROR',
      version,
      unitIdForCode('PERCENT'),
      inputs,
      'Ion balance requires major cations (Na,Ca,Mg) and anions (HCO3,Cl,SO4); missing ≠ 0',
    );
  }
  const total = catSum + anSum;
  if (total === 0) {
    return {
      indicatorCode: 'ION_BALANCE_ERROR',
      calculatedValue: null,
      unitId: unitIdForCode('PERCENT'),
      formulaVersion: version,
      inputParameters: inputs,
      calculationStatus: 'INVALID_INPUT',
      calculationMessage: 'Cation + anion sum is zero',
    };
  }
  return calculated(
    'ION_BALANCE_ERROR',
    version,
    unitIdForCode('PERCENT'),
    (100 * Math.abs(catSum - anSum)) / total,
    { ...inputs, cationSum: catSum, anionSum: anSum },
  );
}

export function calculateAllIndicators(
  results: WaterAnalysisResult[],
  parameters: WaterParameter[],
  units: MeasurementUnit[],
): IndicatorCalculationOutcome[] {
  const parametersById = new Map(parameters.map((p) => [p.id, p]));
  const unitsById = new Map(units.map((u) => [u.id, u]));
  const ions = collectIonReadings(results, parametersById, unitsById);
  return [
    calculateSar(ions),
    calculateAdjustedSar(ions),
    calculateRsc(ions),
    calculateTotalHardness(ions),
    calculateSodiumPercentage(ions),
    calculateIonBalanceError(ions),
  ];
}

export function outcomeToDerivedIndicator(
  sampleId: string,
  outcome: IndicatorCalculationOutcome,
  now: string,
  id: string,
  existingVersion = 1,
): WaterDerivedIndicator {
  return {
    id,
    sampleId,
    indicatorCode: outcome.indicatorCode,
    calculatedValue: outcome.calculatedValue,
    unitId: outcome.unitId,
    formulaVersion: outcome.formulaVersion,
    inputParametersJson: JSON.stringify(outcome.inputParameters),
    calculationStatus: outcome.calculationStatus,
    calculationMessage: outcome.calculationMessage,
    calculatedAt: now,
    source: 'IrrigationWaterCalculationService',
    verificationStatus: 'Draft',
    version: existingVersion,
    isActive: true,
  };
}
