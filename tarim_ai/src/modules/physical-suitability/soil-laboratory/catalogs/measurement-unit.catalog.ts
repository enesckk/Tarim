import type {
  MeasurementQuantityType,
  MeasurementUnit,
  UnitConversionType,
} from '../types/soil-parameter.types.js';
import { catalogUuid } from './catalog-ids.js';

export type MeasurementUnitSeedDef = {
  code: string;
  symbol: string;
  name: string;
  quantityType: MeasurementQuantityType;
  conversionType: UnitConversionType;
  /** Factor/offset relative to the quantity's canonical unit. */
  conversionFactor: number;
  conversionOffset: number;
  /** Code of the quantity canonical unit; null = this unit is canonical. */
  canonicalUnitCode: string | null;
};

/**
 * Supported units — Phase 2.2C.
 * Conversion only for scientifically 1:1 (or fixed linear) pairs.
 * Context-dependent pairs (e.g. % ↔ g/kg) are NOT auto-converted.
 */
export const MEASUREMENT_UNIT_SEED: readonly MeasurementUnitSeedDef[] = [
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
    code: 'G_PER_KG',
    symbol: 'g/kg',
    name: 'Grams per kilogram',
    quantityType: 'MassConcentration',
    conversionType: 'Unsupported',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'MG_PER_KG',
    symbol: 'mg/kg',
    name: 'Milligrams per kilogram',
    quantityType: 'MassConcentration',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'CMOL_PER_KG',
    symbol: 'cmol/kg',
    name: 'Centimoles of charge per kilogram',
    quantityType: 'ExchangeCapacity',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'MEQ_PER_100G',
    symbol: 'meq/100g',
    name: 'Milliequivalents per 100 grams',
    quantityType: 'ExchangeCapacity',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: 'CMOL_PER_KG',
  },
  {
    code: 'G_PER_CM3',
    symbol: 'g/cm³',
    name: 'Grams per cubic centimetre',
    quantityType: 'Density',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'CM',
    symbol: 'cm',
    name: 'Centimetre',
    quantityType: 'Length',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'MM',
    symbol: 'mm',
    name: 'Millimetre',
    quantityType: 'Length',
    conversionType: 'Linear',
    conversionFactor: 0.1,
    conversionOffset: 0,
    canonicalUnitCode: 'CM',
  },
  {
    code: 'MM_PER_HOUR',
    symbol: 'mm/h',
    name: 'Millimetres per hour',
    quantityType: 'Velocity',
    conversionType: 'Identity',
    conversionFactor: 1,
    conversionOffset: 0,
    canonicalUnitCode: null,
  },
  {
    code: 'CM_PER_HOUR',
    symbol: 'cm/h',
    name: 'Centimetres per hour',
    quantityType: 'Velocity',
    conversionType: 'Linear',
    conversionFactor: 10,
    conversionOffset: 0,
    canonicalUnitCode: 'MM_PER_HOUR',
  },
] as const;

export function unitIdForCode(code: string): string {
  return catalogUuid('measurement-unit', code);
}

export function buildMeasurementUnit(
  def: MeasurementUnitSeedDef,
  now: string,
): MeasurementUnit {
  const id = unitIdForCode(def.code);
  return {
    id,
    code: def.code,
    symbol: def.symbol,
    name: def.name,
    quantityType: def.quantityType,
    conversionType: def.conversionType,
    conversionFactor: def.conversionFactor,
    conversionOffset: def.conversionOffset,
    canonicalUnitId: def.canonicalUnitCode ? unitIdForCode(def.canonicalUnitCode) : id,
    createdAt: now,
    updatedAt: now,
    version: 1,
    isActive: true,
  };
}
