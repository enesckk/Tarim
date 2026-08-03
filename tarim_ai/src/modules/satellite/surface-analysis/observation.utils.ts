import type { TimeSeriesPoint, TimeSeriesResponse } from '../../../services/time-series.service.js';
import type {
  SeasonName,
  SuccessfulObservation,
} from './surface-analysis.types.js';

export function seasonFromMonth(month: number): SeasonName {
  if (month === 12 || month === 1 || month === 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  return 'autumn';
}

export function extractSuccessfulObservations(
  timeSeries: TimeSeriesResponse,
): SuccessfulObservation[] {
  return timeSeries.series
    .filter((point): point is TimeSeriesPoint & { status: 'success'; indices: NonNullable<TimeSeriesPoint['indices']> } =>
      point.status === 'success' && point.indices != null,
    )
    .map((point) => {
      const date = new Date(point.datetime);
      const month = date.getUTCMonth() + 1;
      return {
        datetime: point.datetime,
        month,
        season: seasonFromMonth(month),
        ndviMean: point.indices.ndviMean,
        ndmiMean: point.indices.ndmiMean,
        bsiMean: point.indices.bsiMean,
        validPixelRatio: point.validPixelRatio,
      };
    })
    .sort((a, b) => a.datetime.localeCompare(b.datetime));
}

export function share(
  observations: SuccessfulObservation[],
  predicate: (obs: SuccessfulObservation) => boolean,
): number {
  if (observations.length === 0) return 0;
  const count = observations.filter(predicate).length;
  return round3(count / observations.length);
}

export function meanOf(
  values: Array<number | null | undefined>,
): number | null {
  const valid = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
  if (valid.length === 0) return null;
  return round4(valid.reduce((a, b) => a + b, 0) / valid.length);
}

export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function levelFromShare(
  value: number,
  medium = 0.35,
  high = 0.6,
): 'low' | 'medium' | 'high' {
  if (value >= high) return 'high';
  if (value >= medium) return 'medium';
  return 'low';
}
