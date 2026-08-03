export function isMissingClimateValue(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  if (typeof value !== 'number') {
    return true;
  }
  if (!Number.isFinite(value)) {
    return true;
  }
  if (value === -999 || value === -999.0) {
    return true;
  }
  return false;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function min(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return Math.min(...values);
}

export function max(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return Math.max(...values);
}

export function populationStdDev(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const avg = mean(values)!;
  const variance =
    values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface ParameterCompleteness {
  expectedDayCount: number;
  validDayCount: number;
  missingDayCount: number;
  validRatio: number;
}

export function computeCompleteness(
  expectedDayCount: number,
  validDayCount: number,
): ParameterCompleteness {
  const missingDayCount = Math.max(0, expectedDayCount - validDayCount);
  const validRatio =
    expectedDayCount <= 0 ? 0 : validDayCount / expectedDayCount;
  return {
    expectedDayCount,
    validDayCount,
    missingDayCount,
    validRatio: round2(validRatio),
  };
}
