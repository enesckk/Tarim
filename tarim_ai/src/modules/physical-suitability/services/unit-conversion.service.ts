import { ApiError } from '../../../utils/api-error.js';

const TEMPERATURE: Record<string, (v: number) => number> = {
  c: (v) => v,
  '°c': (v) => v,
  celsius: (v) => v,
  f: (v) => ((v - 32) * 5) / 9,
  '°f': (v) => ((v - 32) * 5) / 9,
  fahrenheit: (v) => ((v - 32) * 5) / 9,
};

const LENGTH_TO_CM: Record<string, (v: number) => number> = {
  cm: (v) => v,
  m: (v) => v * 100,
  meter: (v) => v * 100,
  metres: (v) => v * 100,
  meters: (v) => v * 100,
  mm: (v) => v / 10,
};

const EC_TO_DS_M: Record<string, (v: number) => number> = {
  'ds/m': (v) => v,
  dsm: (v) => v,
  'ms/cm': (v) => v,
  mmhos: (v) => v,
  'µs/cm': (v) => v / 1000,
  'us/cm': (v) => v / 1000,
};

const SLOPE: Record<string, { to: 'percent' | 'degree'; fn: (v: number) => number }> = {
  percent: { to: 'percent', fn: (v) => v },
  '%': { to: 'percent', fn: (v) => v },
  degree: { to: 'degree', fn: (v) => v },
  deg: { to: 'degree', fn: (v) => v },
  '°': { to: 'degree', fn: (v) => v },
};

function normUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

/**
 * Convert a numeric value to the criterion's standard unit.
 * Throws ApiError on unsupported units — never silently ignores.
 */
export function convertToStandardUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
): number {
  if (!Number.isFinite(value)) {
    throw new ApiError(400, 'Value must be a finite number', {
      code: 'INVALID_NUMERIC_VALUE',
    });
  }
  const from = normUnit(fromUnit);
  const to = normUnit(toUnit);
  if (from === to) return value;

  // Temperature
  if (TEMPERATURE[from] && (to === 'c' || to === '°c' || to === 'celsius')) {
    return TEMPERATURE[from]!(value);
  }

  // Length → cm
  if (LENGTH_TO_CM[from] && (to === 'cm')) {
    return LENGTH_TO_CM[from]!(value);
  }
  if (LENGTH_TO_CM[from] && (to === 'm' || to === 'meter')) {
    return LENGTH_TO_CM[from]!(value) / 100;
  }

  // EC → dS/m
  if (EC_TO_DS_M[from] && (to === 'ds/m' || to === 'dsm' || to === 'ms/cm')) {
    return EC_TO_DS_M[from]!(value);
  }

  // Slope percent ↔ degree (approx)
  if (SLOPE[from] && SLOPE[to]) {
    const asFrom = SLOPE[from]!;
    const asTo = SLOPE[to]!;
    let percent: number;
    if (asFrom.to === 'percent') percent = asFrom.fn(value);
    else percent = Math.tan((asFrom.fn(value) * Math.PI) / 180) * 100;
    if (asTo.to === 'percent') return percent;
    return (Math.atan(percent / 100) * 180) / Math.PI;
  }

  // Precipitation mm identity
  if ((from === 'mm' || from === 'millimeter') && (to === 'mm' || to === 'millimeter')) {
    return value;
  }

  throw new ApiError(
    400,
    `Unsupported unit conversion from "${fromUnit}" to "${toUnit}"`,
    { code: 'UNSUPPORTED_UNIT', fromUnit, toUnit },
  );
}

export function normalizeCriterionValue(input: {
  value: unknown;
  fromUnit: string | null;
  standardUnit: string | null;
}): unknown {
  if (input.value == null) return null;
  if (typeof input.value === 'boolean' || typeof input.value === 'string') {
    return input.value;
  }
  if (typeof input.value !== 'number') {
    throw new ApiError(400, 'Unsupported value type for normalization', {
      code: 'INVALID_VALUE_TYPE',
    });
  }
  if (!input.standardUnit) return input.value;
  if (!input.fromUnit) {
    throw new ApiError(400, 'fromUnit is required when standardUnit is set', {
      code: 'UNIT_REQUIRED',
    });
  }
  return convertToStandardUnit(input.value, input.fromUnit, input.standardUnit);
}
