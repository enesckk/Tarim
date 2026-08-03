import type { CropKnowledge } from '../types/crop.types.js';
import type { ClimateProfile } from '../../environment/climate/types/climate.types.js';
import type { CategoryBreakdown, ScoreFactor } from '../types/suitability.types.js';
import {
  IRRIGATION_COMPATIBILITY_TABLE,
  RISK_COMPATIBILITY_TABLE,
} from '../rules/scoring-thresholds.js';
import {
  roundScore,
  scorePrecipitationRange,
  scoreTemperatureRange,
} from '../rules/range-scoring.js';
import { ScoreCalibrationService } from '../calibration/score-calibration.service.js';
import { CropPhenologyService } from '../phenology/crop-phenology.service.js';
import type { PhenologyEvaluationResult, PlantingScenarioType } from '../phenology/phenology.types.js';
import type { IrrigationScenario } from '../scenarios/scenario.types.js';

export interface ClimateScoreOptions {
  plantingScenario?: PlantingScenarioType;
  customPlantingDate?: string;
  irrigationScenario?: IrrigationScenario;
  referenceYear?: number;
}

export interface ClimateScoreResult extends CategoryBreakdown {
  phenology?: PhenologyEvaluationResult;
}

export class ClimateSuitabilityService {
  constructor(
    private readonly calibration = new ScoreCalibrationService(),
    private readonly phenologyService = new CropPhenologyService(),
  ) {}

  score(
    crop: CropKnowledge,
    climate: ClimateProfile,
    options: ClimateScoreOptions = {},
  ): ClimateScoreResult {
    const w = this.calibration.getProfile().climateSubWeights;
    const climateTotal = this.calibration.getProfile().climateWeight;
    const irrigationScenario = options.irrigationScenario ?? 'unknown';
    const plantingScenario = options.plantingScenario ?? 'automatic';

    const phenology = this.phenologyService.evaluate({
      crop,
      climate,
      plantingScenario,
      customPlantingDate: options.customPlantingDate,
      referenceYear: options.referenceYear,
    });

    const factors: ScoreFactor[] = [];
    const hasMonthly = (climate.climatology?.monthly?.length ?? 0) >= 12;

    let tempRatio: number;
    let precipRatio: number;
    let frostRatio: number;
    let heatRatio: number;

    if (hasMonthly && phenology.stageResults.length > 0) {
      tempRatio = weightedComponent(phenology, crop, 'temperature');
      precipRatio = weightedComponent(phenology, crop, 'precipitation');
      frostRatio = weightedComponent(phenology, crop, 'frost');
      heatRatio = weightedComponent(phenology, crop, 'heat');

      factors.push({
        code: 'TEMPERATURE',
        score: roundScore(tempRatio * w.growingSeasonTemperature),
        maxScore: w.growingSeasonTemperature,
        observed: climate.temperature.growingSeasonMeanC,
        message:
          'Sıcaklık uygunluğu ürün phenology aşamalarına göre ağırlıklandırılmıştır.',
      });
      factors.push({
        code: 'PRECIPITATION',
        score: roundScore(precipRatio * w.precipitation),
        maxScore: w.precipitation,
        observed: climate.precipitation.growingSeasonTotalMm,
        message:
          'Yağış uygunluğu kritik gelişme dönemleri üzerinden değerlendirilmiştir.',
      });
    } else {
      tempRatio = scoreTemperatureRange(
        climate.temperature.growingSeasonMeanC,
        crop.climate.temperature,
      );
      const annualRatio = scorePrecipitationRange(
        climate.precipitation.annualTotalMm,
        crop.climate.annualPrecipitationMm,
      );
      const seasonRatio = scorePrecipitationRange(
        climate.precipitation.growingSeasonTotalMm,
        crop.climate.growingSeasonPrecipitationMm,
      );
      precipRatio = (annualRatio + seasonRatio) / 2;
      frostRatio =
        RISK_COMPATIBILITY_TABLE[crop.climate.frostTolerance][
          climate.temperature.frostRisk
        ];
      heatRatio =
        RISK_COMPATIBILITY_TABLE[crop.climate.heatTolerance][
          climate.temperature.extremeHeatRisk
        ];

      factors.push({
        code: 'TEMPERATURE',
        score: roundScore(tempRatio * w.growingSeasonTemperature),
        maxScore: w.growingSeasonTemperature,
        observed: climate.temperature.growingSeasonMeanC,
        message: temperatureMessage(tempRatio),
      });
      factors.push({
        code: 'PRECIPITATION',
        score: roundScore(precipRatio * w.precipitation),
        maxScore: w.precipitation,
        observed: climate.precipitation.growingSeasonTotalMm,
        message: precipitationMessage(precipRatio),
      });
    }

    factors.push({
      code: 'FROST_COMPATIBILITY',
      score: roundScore(frostRatio * w.frostCompatibility),
      maxScore: w.frostCompatibility,
      observed: climate.temperature.frostRisk,
      message: frostMessage(frostRatio, climate.temperature.frostRisk),
    });
    factors.push({
      code: 'EXTREME_HEAT_COMPATIBILITY',
      score: roundScore(heatRatio * w.extremeHeatCompatibility),
      maxScore: w.extremeHeatCompatibility,
      observed: climate.temperature.extremeHeatRisk,
      message: heatMessage(heatRatio, climate.temperature.extremeHeatRisk),
    });

    const droughtRatio =
      RISK_COMPATIBILITY_TABLE[crop.climate.droughtTolerance][climate.water.droughtRisk];
    factors.push({
      code: 'DROUGHT_COMPATIBILITY',
      score: roundScore(droughtRatio * w.droughtCompatibility),
      maxScore: w.droughtCompatibility,
      observed: climate.water.droughtRisk,
      message: droughtMessage(droughtRatio, climate.water.droughtRisk),
    });

    let irrigationRatio =
      IRRIGATION_COMPATIBILITY_TABLE[crop.climate.irrigationDependency][
        climate.water.estimatedIrrigationNeed
      ];
    irrigationRatio = applyIrrigationScenario(
      irrigationRatio,
      precipRatio,
      crop.climate.irrigationDependency,
      crop.climate.droughtTolerance,
      irrigationScenario,
    );

    factors.push({
      code: 'IRRIGATION_COMPATIBILITY',
      score: roundScore(irrigationRatio * w.irrigationCompatibility),
      maxScore: w.irrigationCompatibility,
      observed: climate.water.estimatedIrrigationNeed,
      message: irrigationScenarioMessage(
        irrigationScenario,
        crop.climate.irrigationDependency,
      ),
    });

    // Adjust precipitation factor under irrigation scenarios without erasing climate risks
    if (irrigationScenario === 'full' || irrigationScenario === 'limited') {
      const precipFactor = factors.find((f) => f.code === 'PRECIPITATION');
      if (precipFactor) {
        const boost = irrigationScenario === 'full' ? 0.85 : 0.55;
        const adjusted = Math.min(
          1,
          precipRatio + (1 - precipRatio) * boost,
        );
        precipFactor.score = roundScore(adjusted * w.precipitation);
        precipFactor.message =
          irrigationScenario === 'full'
            ? 'Düzenli sulama senaryosunda düşük yağış cezası kısmen azaltılmıştır; kuraklık bağlamı korunur.'
            : 'Sınırlı sulama senaryosunda kritik dönem su açığı kısmen azaltılmıştır.';
      }
    }

    if (irrigationScenario === 'rainfed' && crop.climate.irrigationDependency === 'high') {
      const precipFactor = factors.find((f) => f.code === 'PRECIPITATION');
      if (precipFactor) {
        precipFactor.score = roundScore(Math.min(precipRatio, 0.35) * w.precipitation);
        precipFactor.message =
          'Sulamasız senaryoda yüksek sulama bağımlılığı nedeniyle yağış uygunluğu düşük tutulmuştur.';
      }
    }

    const score = roundScore(factors.reduce((sum, factor) => sum + factor.score, 0));
    return {
      score,
      maxScore: climateTotal,
      factors,
      phenology,
    };
  }
}

function applyIrrigationScenario(
  baseIrrigationRatio: number,
  precipRatio: number,
  dependency: 'low' | 'medium' | 'high',
  droughtTolerance: 'low' | 'medium' | 'high',
  scenario: IrrigationScenario,
): number {
  if (scenario === 'unknown') {
    return baseIrrigationRatio;
  }
  if (scenario === 'rainfed') {
    if (dependency === 'high') {
      return Math.min(baseIrrigationRatio, droughtTolerance === 'high' ? 0.45 : 0.25);
    }
    if (dependency === 'medium') {
      return Math.min(baseIrrigationRatio, droughtTolerance === 'high' ? 0.7 : 0.55);
    }
    // low dependency: keep baseline; do not invent a rainfed bonus
    return Math.min(baseIrrigationRatio, Math.max(0.75, precipRatio));
  }
  if (scenario === 'limited') {
    if (dependency === 'high') {
      return Math.max(baseIrrigationRatio, 0.55);
    }
    if (dependency === 'medium') {
      return Math.max(baseIrrigationRatio, 0.7);
    }
    return Math.max(baseIrrigationRatio, 0.8);
  }
  // full — improves irrigation compatibility but does not force 1.0
  if (dependency === 'high') {
    return Math.max(baseIrrigationRatio, 0.85);
  }
  if (dependency === 'medium') {
    return Math.max(baseIrrigationRatio, 0.8);
  }
  return Math.max(baseIrrigationRatio, 0.85);
}

function weightedComponent(
  phenology: PhenologyEvaluationResult,
  crop: CropKnowledge,
  key: 'temperature' | 'precipitation' | 'frost' | 'heat',
): number {
  let sum = 0;
  let weightSum = 0;
  for (let index = 0; index < phenology.stageResults.length; index += 1) {
    const weight = crop.phenology.growthStages[index]?.weight ?? 0;
    sum += phenology.stageResults[index].components[key] * weight;
    weightSum += weight;
  }
  if (weightSum <= 0) {
    return 0.5;
  }
  return sum / weightSum;
}

function temperatureMessage(ratio: number): string {
  if (ratio >= 1) return 'Büyüme dönemi sıcaklığı tercih edilen aralık içindedir.';
  if (ratio >= 0.5) return 'Büyüme dönemi sıcaklığı tercih edilen aralığa yakındır.';
  if (ratio > 0) return 'Büyüme dönemi sıcaklığı ürün için sınırlı uyum göstermektedir.';
  return 'Büyüme dönemi sıcaklığı ürün için mutlak sınırların dışındadır.';
}

function precipitationMessage(ratio: number): string {
  if (ratio >= 1) return 'Yağış profili ürün gereksinimleriyle genel olarak uyumludur.';
  if (ratio >= 0.5) return 'Yağış profili kısmen uyumludur; sulama ihtiyacı değerlendirilmelidir.';
  if (ratio > 0) return 'Yağış profili ürün gereksinimlerinden sapma göstermektedir.';
  return 'Yağış profili ürün için mutlak sınırların dışındadır.';
}

function frostMessage(ratio: number, risk: string): string {
  if (ratio >= 0.85) return `Don riski (${risk}) ürün toleransı ile uyumlu görünmektedir.`;
  if (ratio >= 0.4) return `Don riski (${risk}) ürün için dikkat gerektiren bir sinyaldir.`;
  return `Don riski (${risk}) ürün toleransına göre zayıf uyum göstermektedir.`;
}

function heatMessage(ratio: number, risk: string): string {
  if (ratio >= 0.85) return `Aşırı sıcaklık riski (${risk}) ürün toleransı ile uyumlu görünmektedir.`;
  if (ratio >= 0.4) return `Aşırı sıcaklık riski (${risk}) ürün için dikkat gerektiren bir sinyaldir.`;
  return `Aşırı sıcaklık riski (${risk}) ürün toleransına göre zayıf uyum göstermektedir.`;
}

function droughtMessage(ratio: number, risk: string): string {
  if (ratio >= 0.85) return `Kuraklık riski (${risk}) ürün toleransı ile uyumlu görünmektedir.`;
  if (ratio >= 0.4) return `Kuraklık riski (${risk}) ürün için dikkat gerektiren bir sinyaldir.`;
  return `Kuraklık riski (${risk}) ürün toleransına göre zayıf uyum göstermektedir.`;
}

function irrigationScenarioMessage(
  scenario: IrrigationScenario,
  dependency: string,
): string {
  if (scenario === 'rainfed') {
    return `Sulamasız senaryo: ürün sulama bağımlılığı (${dependency}) dikkate alınmıştır.`;
  }
  if (scenario === 'limited') {
    return 'Sınırlı sulama senaryosu: kritik dönemlerde kısmi su desteği varsayılmıştır.';
  }
  if (scenario === 'full') {
    return 'Düzenli sulama senaryosu: su ihtiyacı karşılanabilir varsayılmıştır; su kalitesi bilinmemektedir.';
  }
  return `Sulama ihtiyacı ürün bağımlılığı (${dependency}) ile birlikte değerlendirilmiştir.`;
}
