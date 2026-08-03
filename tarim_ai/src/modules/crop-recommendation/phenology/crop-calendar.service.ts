import type { PlantingWindowDef } from '../knowledge/schemas/crop-knowledge.schema.js';
import type { PlantingScenarioType, SelectedPlantingScenario } from './phenology.types.js';

/**
 * Resolves planting/establishment date from crop windows and scenario preference.
 * Cross-year windows (e.g. Nov–Feb) are supported.
 */
export class CropCalendarService {
  resolvePlantingDate(input: {
    windows: PlantingWindowDef[];
    scenario: PlantingScenarioType;
    customPlantingDate?: string;
    referenceYear?: number;
  }): SelectedPlantingScenario {
    const year = input.referenceYear ?? new Date().getUTCFullYear();
    const windows = input.windows;
    if (windows.length === 0) {
      throw new Error('Crop has no planting windows');
    }

    const warnings: string[] = [];

    if (input.scenario === 'custom' && input.customPlantingDate) {
      const date = parseIsoDate(input.customPlantingDate);
      const within = windows.some((window) =>
        isDateInWindow(date, window, year),
      );
      if (!within) {
        warnings.push(
          'Seçilen ekim/tesis tarihi ürünün önerilen planting window aralığının dışındadır.',
        );
      }
      const windowLabel =
        windows.find((window) => isDateInWindow(date, window, year))?.label ??
        windows[0].label;
      return {
        type: 'custom',
        selectedDate: toIso(date),
        windowLabel,
        withinRecommendedWindow: within,
        warnings,
      };
    }

    if (input.scenario === 'earliest') {
      const window = windows[0];
      const date = dateFromMonthDay(year, window.startMonth, 15);
      return {
        type: 'earliest',
        selectedDate: toIso(date),
        windowLabel: window.label,
        withinRecommendedWindow: true,
        warnings,
      };
    }

    if (input.scenario === 'latest') {
      const window = windows[windows.length - 1];
      const date = dateFromMonthDay(year, window.endMonth, 15);
      return {
        type: 'latest',
        selectedDate: toIso(date),
        windowLabel: window.label,
        withinRecommendedWindow: true,
        warnings,
      };
    }

    // automatic: midpoint of first window (ranking across windows done by phenology service)
    const window = windows[0];
    const date = midpointOfWindow(year, window);
    return {
      type: 'automatic',
      selectedDate: toIso(date),
      windowLabel: window.label,
      withinRecommendedWindow: true,
      warnings,
    };
  }

  candidateDatesForAutomatic(
    windows: PlantingWindowDef[],
    referenceYear = new Date().getUTCFullYear(),
  ): Array<{ date: Date; window: PlantingWindowDef }> {
    return windows.map((window) => ({
      date: midpointOfWindow(referenceYear, window),
      window,
    }));
  }
}

export function midpointOfWindow(year: number, window: PlantingWindowDef): Date {
  const start = dateFromMonthDay(year, window.startMonth, 1);
  let end = dateFromMonthDay(year, window.endMonth, 28);
  if (window.endMonth < window.startMonth) {
    end = dateFromMonthDay(year + 1, window.endMonth, 28);
  }
  const midMs = start.getTime() + (end.getTime() - start.getTime()) / 2;
  return new Date(midMs);
}

export function isDateInWindow(
  date: Date,
  window: PlantingWindowDef,
  referenceYear: number,
): boolean {
  const month = date.getUTCMonth() + 1;
  if (window.startMonth <= window.endMonth) {
    return month >= window.startMonth && month <= window.endMonth;
  }
  // cross-year
  return month >= window.startMonth || month <= window.endMonth ||
    (date.getUTCFullYear() === referenceYear + 1 && month <= window.endMonth);
}

function dateFromMonthDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, Math.min(day, 28)));
}

function parseIsoDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid customPlantingDate: ${value}`);
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
