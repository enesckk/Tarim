import type {
  MeasurementUnit,
  NormalizationStatus,
  UnitConversionResult,
} from '../types/soil-parameter.types.js';

function toCanonical(value: number, unit: MeasurementUnit): number | null {
  if (unit.conversionType === 'Unsupported') return null;
  if (unit.conversionType === 'Identity') {
    return value * unit.conversionFactor + unit.conversionOffset;
  }
  if (unit.conversionType === 'Linear' || unit.conversionType === 'OffsetLinear') {
    return value * unit.conversionFactor + unit.conversionOffset;
  }
  return null;
}

function fromCanonical(canonicalValue: number, unit: MeasurementUnit): number | null {
  if (unit.conversionType === 'Unsupported') return null;
  if (unit.conversionFactor === 0) return null;
  if (unit.conversionType === 'Identity') {
    return (canonicalValue - unit.conversionOffset) / unit.conversionFactor;
  }
  if (unit.conversionType === 'Linear' || unit.conversionType === 'OffsetLinear') {
    return (canonicalValue - unit.conversionOffset) / unit.conversionFactor;
  }
  return null;
}

/**
 * Converts only between units that share QuantityType and have a defined
 * path via their quantity canonical unit. Context-dependent pairs fail.
 */
export function convertMeasurementValue(
  value: number,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit,
): UnitConversionResult {
  if (!fromUnit.isActive || !toUnit.isActive) {
    return fail(fromUnit, toUnit, 'UNSUPPORTED_UNIT', 'Inactive measurement unit');
  }
  if (fromUnit.id === toUnit.id || fromUnit.code === toUnit.code) {
    return {
      ok: true,
      value,
      fromUnitCode: fromUnit.code,
      toUnitCode: toUnit.code,
      status: 'NORMALIZED',
      message: null,
    };
  }
  if (fromUnit.quantityType !== toUnit.quantityType) {
    return fail(
      fromUnit,
      toUnit,
      'UNSUPPORTED_UNIT',
      `Incompatible quantity types: ${fromUnit.quantityType} vs ${toUnit.quantityType}`,
    );
  }
  if (
    fromUnit.conversionType === 'Unsupported' ||
    toUnit.conversionType === 'Unsupported'
  ) {
    return fail(
      fromUnit,
      toUnit,
      'UNSUPPORTED_UNIT',
      'Unit conversion requires laboratory/context-specific factors',
    );
  }

  const fromCanonicalId = fromUnit.canonicalUnitId ?? fromUnit.id;
  const toCanonicalId = toUnit.canonicalUnitId ?? toUnit.id;
  if (fromCanonicalId !== toCanonicalId) {
    return fail(
      fromUnit,
      toUnit,
      'UNSUPPORTED_UNIT',
      'Units do not share the same canonical reference',
    );
  }

  const asCanonical = toCanonical(value, fromUnit);
  if (asCanonical == null) {
    return fail(fromUnit, toUnit, 'FAILED', 'Failed to convert to canonical unit');
  }
  const converted = fromCanonical(asCanonical, toUnit);
  if (converted == null) {
    return fail(fromUnit, toUnit, 'FAILED', 'Failed to convert from canonical unit');
  }

  return {
    ok: true,
    value: converted,
    fromUnitCode: fromUnit.code,
    toUnitCode: toUnit.code,
    status: 'NORMALIZED',
    message: null,
  };
}

function fail(
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit,
  status: NormalizationStatus,
  message: string,
): UnitConversionResult {
  return {
    ok: false,
    value: null,
    fromUnitCode: fromUnit.code,
    toUnitCode: toUnit.code,
    status,
    message,
  };
}

export function resolveUnitByCodeOrSymbol(
  units: MeasurementUnit[],
  codeOrSymbol: string,
): MeasurementUnit | null {
  const key = codeOrSymbol.trim();
  const byCode = units.find((u) => u.isActive && u.code === key);
  if (byCode) return byCode;
  const lower = key.toLowerCase();
  return (
    units.find(
      (u) =>
        u.isActive &&
        (u.symbol.toLowerCase() === lower ||
          u.symbol.replace('³', '3').toLowerCase() === lower ||
          u.code.toLowerCase() === lower),
    ) ?? null
  );
}
