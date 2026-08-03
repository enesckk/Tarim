import type { PhysicalSuitabilityFacade } from '../../physical-suitability/services/physical-suitability.facade.js';
import type { DataSourceRecord } from '../../physical-suitability/types/physical-suitability.types.js';
import type { ClimateProfile } from '../../environment/climate/types/climate.types.js';
import type { SoilProfile } from '../../environment/soil/types/soil.types.js';
import type { TerrainProfileResponse } from '../../terrain/types/terrain.types.js';
import type { SoilAnalysisResult } from '../../physical-suitability/soil-laboratory/types/soil-laboratory.types.js';
import type { IrrigationAvailabilityInput, ResolvedInputValue } from '../types/seasonal-crop-analysis.types.js';

export interface InputResolutionSources {
  climate: ClimateProfile | null;
  soil: SoilProfile | null;
  terrain: TerrainProfileResponse | null;
  soilLabResults: SoilAnalysisResult[] | null;
  irrigationAvailability: IrrigationAvailabilityInput;
}

function record(
  sourceType: DataSourceRecord['sourceType'],
  provider: string,
  value: unknown,
  unit: string | null,
  isVerified: boolean,
): DataSourceRecord {
  return {
    sourceType,
    provider,
    observationDate: new Date().toISOString(),
    retrievedAt: new Date().toISOString(),
    spatialResolution: null,
    temporalResolution: null,
    measurementMethod: null,
    isVerified,
    verificationStatus: isVerified ? 'SourceVerified' : 'Draft',
    confidence: isVerified ? 'high' : 'medium',
    originalValue: value,
    originalUnit: unit,
    normalizedValue: value,
    unit,
    metadata: {},
  };
}

/** Best-effort heuristic match of a lab parameter code/name to a canonical soil criterion. */
function matchLabResult(
  results: SoilAnalysisResult[],
  patterns: RegExp[],
): SoilAnalysisResult | null {
  for (const pattern of patterns) {
    const found = results.find(
      (r) =>
        r.isActive &&
        r.measuredValue != null &&
        (pattern.test(r.parameterCode) || pattern.test(r.parameterName)),
    );
    if (found) return found;
  }
  return null;
}

const PH_PATTERNS = [/(^|[_\s])ph([_\s]|$)/i];
const EC_PATTERNS = [/(^|[_\s])ec([_\s]|$)/i, /conductivity/i];
const OM_PATTERNS = [/organic/i];
const CLAY_PATTERNS = [/clay/i];
const SAND_PATTERNS = [/sand/i];
const SILT_PATTERNS = [/silt/i];

/**
 * Resolves ResolvedInputValue[] for the criteria used by the seasonal
 * critical-barrier and component-suitability services. Never invents a
 * value: a criterion is simply omitted when no candidate exists.
 */
export class SeasonalInputResolutionService {
  constructor(private readonly facade: PhysicalSuitabilityFacade) {}

  async resolve(sources: InputResolutionSources): Promise<{
    resolved: ResolvedInputValue[];
    byCriterion: Map<string, ResolvedInputValue>;
    limitations: string[];
  }> {
    const limitations: string[] = [];
    const candidatesByCriterion = new Map<string, DataSourceRecord[]>();

    const push = (code: string, rec: DataSourceRecord | null) => {
      if (!rec) return;
      const list = candidatesByCriterion.get(code) ?? [];
      list.push(rec);
      candidatesByCriterion.set(code, list);
    };

    const lab = sources.soilLabResults ?? [];

    if (sources.soil) {
      push('soil.ph', record('GlobalModel', sources.soil.provider, sources.soil.soil.ph, 'pH', false));
      if (sources.soil.soil.electricalConductivityDsM != null) {
        push(
          'soil.ec',
          record(
            'GlobalModel',
            sources.soil.provider,
            sources.soil.soil.electricalConductivityDsM,
            'dS/m',
            false,
          ),
        );
      }
      push(
        'soil.organic_matter',
        record(
          'GlobalModel',
          sources.soil.provider,
          sources.soil.soil.organicMatterPercent,
          '%',
          false,
        ),
      );
      push(
        'soil.texture',
        record('GlobalModel', sources.soil.provider, sources.soil.soil.texture, null, false),
      );

      const fractions = sources.soil.metadata?.textureFractions as
        | { sand?: number; silt?: number; clay?: number }
        | undefined;
      if (fractions?.clay != null) {
        push('soil.clay_percent', record('GlobalModel', sources.soil.provider, fractions.clay, '%', false));
      }
      if (fractions?.sand != null) {
        push('soil.sand_percent', record('GlobalModel', sources.soil.provider, fractions.sand, '%', false));
      }
      if (fractions?.silt != null) {
        push('soil.silt_percent', record('GlobalModel', sources.soil.provider, fractions.silt, '%', false));
      }
    } else {
      limitations.push('soil_profile_unavailable');
    }

    if (lab.length > 0) {
      // Lab results carry the soil-laboratory module's internal canonical unit
      // codes (e.g. "PH_UNIT", "DS_PER_M"), which are a different vocabulary
      // from the physical-suitability criterion units ("pH", "dS/m"). Since
      // the criterion is already known at each push site, the criterion's own
      // unit is used directly rather than re-deriving it from the lab code.
      const ph = matchLabResult(lab, PH_PATTERNS);
      if (ph) push('soil.ph', record('Laboratory', 'soil_laboratory', ph.measuredValue, 'pH', true));
      const ec = matchLabResult(lab, EC_PATTERNS);
      if (ec) push('soil.ec', record('Laboratory', 'soil_laboratory', ec.measuredValue, 'dS/m', true));
      const om = matchLabResult(lab, OM_PATTERNS);
      if (om) push('soil.organic_matter', record('Laboratory', 'soil_laboratory', om.measuredValue, '%', true));
      const clay = matchLabResult(lab, CLAY_PATTERNS);
      if (clay) push('soil.clay_percent', record('Laboratory', 'soil_laboratory', clay.measuredValue, '%', true));
      const sand = matchLabResult(lab, SAND_PATTERNS);
      if (sand) push('soil.sand_percent', record('Laboratory', 'soil_laboratory', sand.measuredValue, '%', true));
      const silt = matchLabResult(lab, SILT_PATTERNS);
      if (silt) push('soil.silt_percent', record('Laboratory', 'soil_laboratory', silt.measuredValue, '%', true));
    }

    if (sources.climate) {
      push(
        'climate.minimum_temperature',
        record('GlobalModel', sources.climate.provider, sources.climate.temperature.annualMinC, '°C', false),
      );
      push(
        'climate.maximum_temperature',
        record('GlobalModel', sources.climate.provider, sources.climate.temperature.annualMaxC, '°C', false),
      );
      push(
        'climate.seasonal_rainfall',
        record(
          'GlobalModel',
          sources.climate.provider,
          sources.climate.precipitation.growingSeasonTotalMm,
          'mm',
          false,
        ),
      );
      limitations.push('climate_gdd_unavailable');
    } else {
      limitations.push('climate_profile_unavailable');
    }

    if (sources.terrain) {
      push(
        'terrain.mean_slope',
        record(
          'RemoteSensing',
          sources.terrain.metadata.provider,
          sources.terrain.terrain.slope.meanPercent,
          'percent',
          !sources.terrain.metadata.isMock,
        ),
      );
    } else {
      limitations.push('terrain_profile_unavailable');
    }

    // Irrigation availability is always a user declaration in V1 (never invented).
    push(
      'water.irrigation_available',
      record(
        'UserDeclared',
        'applicant_declaration',
        sources.irrigationAvailability !== 'unavailable',
        null,
        false,
      ),
    );

    const resolved: ResolvedInputValue[] = [];
    const byCriterion = new Map<string, ResolvedInputValue>();

    for (const [criterionCode, candidates] of candidatesByCriterion) {
      const result = await this.facade.resolveDataSource(criterionCode, candidates);
      const value: ResolvedInputValue = {
        criterionCode,
        value: result.selected.normalizedValue,
        unit: result.selected.unit,
        selectedSourceType: result.selected.sourceType,
        selectionReason: result.selectionReason,
        candidateCount: candidates.length,
        candidates: candidates.map((c) => ({
          sourceType: c.sourceType,
          provider: c.provider,
          value: c.originalValue,
          unit: c.originalUnit,
          isVerified: c.isVerified,
          verificationStatus: c.verificationStatus,
          observationDate: c.observationDate,
        })),
      };
      resolved.push(value);
      byCriterion.set(criterionCode, value);
    }

    resolved.sort((a, b) => a.criterionCode.localeCompare(b.criterionCode));

    return { resolved, byCriterion, limitations };
  }
}
