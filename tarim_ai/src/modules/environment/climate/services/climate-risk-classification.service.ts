import type { RiskLevel } from '../../shared/types/provider-metadata.types.js';
import {
  EXTREME_HEAT_RISK_THRESHOLDS,
  EXTREME_HEAT_TEMPERATURE_C,
  FROST_RISK_THRESHOLDS,
  FROST_TEMPERATURE_C,
} from '../config/season.config.js';

export interface DroughtInputs {
  annualTotalMm: number;
  growingSeasonTotalMm: number;
  summerTotalMm: number;
  wetDaysPerYear: number;
  annualPrecipitationCv: number;
}

export interface IrrigationInputs {
  summerTotalMm: number;
  growingSeasonTotalMm: number;
  extremeHeatDaysPerYear: number;
}

export class ClimateRiskClassificationService {
  classifyFrostRisk(frostDaysPerYear: number): RiskLevel {
    if (frostDaysPerYear <= FROST_RISK_THRESHOLDS.lowMaxDaysPerYear) {
      return 'low';
    }
    if (frostDaysPerYear <= FROST_RISK_THRESHOLDS.mediumMaxDaysPerYear) {
      return 'medium';
    }
    return 'high';
  }

  classifyExtremeHeatRisk(extremeHeatDaysPerYear: number): RiskLevel {
    if (extremeHeatDaysPerYear <= EXTREME_HEAT_RISK_THRESHOLDS.lowMaxDaysPerYear) {
      return 'low';
    }
    if (extremeHeatDaysPerYear <= EXTREME_HEAT_RISK_THRESHOLDS.mediumMaxDaysPerYear) {
      return 'medium';
    }
    return 'high';
  }

  classifySeasonality(cv: number): RiskLevel {
    if (cv < 0.4) {
      return 'low';
    }
    if (cv < 0.8) {
      return 'medium';
    }
    return 'high';
  }

  /**
   * Deterministic drought risk from multi-factor rule table.
   */
  classifyDroughtRisk(input: DroughtInputs): RiskLevel {
    let score = 0;
    if (input.annualTotalMm < 350) score += 2;
    else if (input.annualTotalMm < 500) score += 1;

    if (input.growingSeasonTotalMm < 180) score += 2;
    else if (input.growingSeasonTotalMm < 280) score += 1;

    if (input.summerTotalMm < 40) score += 2;
    else if (input.summerTotalMm < 80) score += 1;

    if (input.wetDaysPerYear < 40) score += 1;
    if (input.annualPrecipitationCv > 0.35) score += 1;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  classifyIrrigationNeed(input: IrrigationInputs): RiskLevel {
    let score = 0;
    if (input.summerTotalMm < 40) score += 2;
    else if (input.summerTotalMm < 80) score += 1;

    if (input.growingSeasonTotalMm < 220) score += 2;
    else if (input.growingSeasonTotalMm < 350) score += 1;

    if (input.extremeHeatDaysPerYear > 30) score += 2;
    else if (input.extremeHeatDaysPerYear > 10) score += 1;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  isFrostDay(t2mMin: number): boolean {
    return t2mMin < FROST_TEMPERATURE_C;
  }

  isExtremeHeatDay(t2mMax: number): boolean {
    return t2mMax > EXTREME_HEAT_TEMPERATURE_C;
  }
}
