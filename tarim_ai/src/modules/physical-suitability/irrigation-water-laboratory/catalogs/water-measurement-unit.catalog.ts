import type { MeasurementUnit } from '../../soil-laboratory/types/soil-parameter.types.js';
import type { MeasurementUnitSeedDef } from '../../soil-laboratory/catalogs/measurement-unit.catalog.js';
import {
  buildMeasurementUnit,
  unitIdForCode,
} from '../../soil-laboratory/catalogs/measurement-unit.catalog.js';

/**
 * Units needed for irrigation water laboratory (Phase 2.2G).
 * Reuses measurement-unit catalog IDs for overlapping codes (PH_UNIT, DS_PER_M, …).
 * mg/L ↔ meq/L is NOT auto-converted (ion-specific; handled in calculation service).
 */
export const WATER_MEASUREMENT_UNIT_SEED: readonly MeasurementUnitSeedDef[] = [
  {
    code: 'NONE',
    symbol: '—',
    name: 'None / dimensionless',
    quantityType: 'Dimensionless',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'PH_UNIT',
    symbol: 'pH',
    name: 'pH unit',
    quantityType: 'Acidity',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'DS_PER_M',
    symbol: 'dS/m',
    name: 'Decisiemens per metre',
    quantityType: 'ElectricalConductivity',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'MS_PER_CM',
    symbol: 'mS/cm',
    name: 'Millisiemens per centimetre',
    quantityType: 'ElectricalConductivity',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: 'DS_PER_M',
  },
  {
    code: 'PERCENT',
    symbol: '%',
    name: 'Percent',
    quantityType: 'Fraction',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'MG_PER_L',
    symbol: 'mg/L',
    name: 'Milligrams per litre',
    quantityType: 'MassConcentration',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'MEQ_PER_L',
    symbol: 'meq/L',
    name: 'Milliequivalents per litre',
    quantityType: 'ChargeConcentration',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'MG_PER_L_CACO3',
    symbol: 'mg/L CaCO₃',
    name: 'Milligrams per litre as calcium carbonate',
    quantityType: 'HardnessAsCaCO3',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'NTU',
    symbol: 'NTU',
    name: 'Nephelometric turbidity unit',
    quantityType: 'Turbidity',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'DEG_C',
    symbol: '°C',
    name: 'Degree Celsius',
    quantityType: 'Temperature',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
] as const;

export { unitIdForCode, buildMeasurementUnit };

export function buildWaterMeasurementUnits(now: string): MeasurementUnit[] {
  return WATER_MEASUREMENT_UNIT_SEED.map((def) => buildMeasurementUnit(def, now));
}
