import type { CropKnowledge } from '../types/crop.types.js';
import type { SoilProfile } from '../../environment/soil/types/soil.types.js';
import type { CategoryBreakdown, ScoreFactor } from '../types/suitability.types.js';
import { SCORING_WEIGHTS, TEXTURE_SCORE_RATIO } from '../rules/scoring-weights.js';
import { DRAINAGE_ORDINAL, RISK_COMPATIBILITY_TABLE } from '../rules/scoring-thresholds.js';
import { roundScore, scoreNumericRange } from '../rules/range-scoring.js';

export class SoilSuitabilityService {
  score(crop: CropKnowledge, soilProfile: SoilProfile): CategoryBreakdown {
    const w = SCORING_WEIGHTS.soil;
    const soil = soilProfile.soil;
    const factors: ScoreFactor[] = [];

    const phRatio = scoreNumericRange(soil.ph, crop.soil.ph);
    factors.push({
      code: 'PH',
      score: roundScore(phRatio * w.ph),
      maxScore: w.ph,
      observed: soil.ph,
      message: phMessage(phRatio, soil.ph),
    });

    const textureRatio = textureScoreRatio(crop, soil.texture);
    factors.push({
      code: 'TEXTURE',
      score: roundScore(textureRatio * w.texture),
      maxScore: w.texture,
      observed: soil.texture,
      message: textureMessage(textureRatio, soil.texture),
    });

    const drainageRatio = drainageScoreRatio(crop.soil.requiredDrainage, soil.drainage);
    factors.push({
      code: 'DRAINAGE',
      score: roundScore(drainageRatio * w.drainage),
      maxScore: w.drainage,
      observed: soil.drainage,
      message: drainageMessage(drainageRatio, soil.drainage, crop.soil.requiredDrainage),
    });

    const salinityRatio = combinedSalinityRatio(
      crop,
      soil.electricalConductivityDsM,
      soil.salinityRisk,
    );
    factors.push({
      code: 'SALINITY',
      score: roundScore(salinityRatio * w.salinity),
      maxScore: w.salinity,
      observed: soil.electricalConductivityDsM,
      message: salinityMessage(
        salinityRatio,
        soil.electricalConductivityDsM,
        soil.salinityRisk,
      ),
    });

    const omRatio = organicMatterRatio(
      soil.organicMatterPercent,
      crop.soil.minimumOrganicMatterPercent,
      crop.soil.preferredOrganicMatterPercent,
    );
    factors.push({
      code: 'ORGANIC_MATTER',
      score: roundScore(omRatio * w.organicMatter),
      maxScore: w.organicMatter,
      observed: soil.organicMatterPercent,
      message: organicMatterMessage(omRatio, soil.organicMatterPercent),
    });

    const depthRatio =
      soil.depthCm == null
        ? 0.4
        : soil.depthCm >= crop.soil.minimumSoilDepthCm
          ? 1
          : soil.depthCm <= 0
            ? 0
            : Math.max(0.25, soil.depthCm / crop.soil.minimumSoilDepthCm);
    factors.push({
      code: 'SOIL_DEPTH',
      score: roundScore(depthRatio * w.soilDepth),
      maxScore: w.soilDepth,
      observed: soil.depthCm,
      message: depthMessage(depthRatio, soil.depthCm, crop.soil.minimumSoilDepthCm),
    });

    const whcRatio = waterHoldingRatio(soil.waterHoldingCapacity, crop.climate.droughtTolerance);
    factors.push({
      code: 'WATER_HOLDING_CAPACITY',
      score: roundScore(whcRatio * w.waterHoldingCapacity),
      maxScore: w.waterHoldingCapacity,
      observed: soil.waterHoldingCapacity,
      message: `Su tutma kapasitesi (${soil.waterHoldingCapacity}) ön değerlendirme sinyalidir.`,
    });

    const caco3Ratio = calciumCarbonateRatio(
      soil.calciumCarbonatePercent,
      crop.soil.calciumCarbonateTolerance,
    );
    factors.push({
      code: 'CALCIUM_CARBONATE',
      score: roundScore(caco3Ratio * w.calciumCarbonate),
      maxScore: w.calciumCarbonate,
      observed: soil.calciumCarbonatePercent,
      message:
        soil.calciumCarbonatePercent == null
          ? 'Kalsiyum karbonat verisi mevcut değildir; bu alan için puan sınırlı tutulmuştur.'
          : `Kalsiyum karbonat düzeyi (${soil.calciumCarbonatePercent}%) ürün toleransı açısından değerlendirilmiştir.`,
    });

    const score = roundScore(factors.reduce((sum, factor) => sum + factor.score, 0));
    return { score, maxScore: w.total, factors };
  }
}

export function textureScoreRatio(
  crop: CropKnowledge,
  texture: SoilProfile['soil']['texture'],
): number {
  if (texture === 'unknown') {
    return TEXTURE_SCORE_RATIO.unknown;
  }
  if (crop.soil.preferredTextures.includes(texture)) {
    return TEXTURE_SCORE_RATIO.preferred;
  }
  if (crop.soil.acceptedTextures.includes(texture)) {
    return TEXTURE_SCORE_RATIO.accepted;
  }
  return TEXTURE_SCORE_RATIO.incompatible;
}

export function drainageScoreRatio(
  required: 'poor' | 'moderate' | 'good',
  observed: SoilProfile['soil']['drainage'],
): number {
  if (observed === 'unknown') {
    return 0.4;
  }
  const requiredOrd = DRAINAGE_ORDINAL[required];
  const observedOrd = DRAINAGE_ORDINAL[observed];
  if (observedOrd >= requiredOrd) {
    return 1;
  }
  const gap = requiredOrd - observedOrd;
  if (gap === 1) {
    return 0.55;
  }
  return 0.15;
}

/**
 * Combined salinity score from EC numeric limit and salinityRisk enum.
 * Null EC / unknown risk do not receive optimistic full points.
 */
export function combinedSalinityRatio(
  crop: CropKnowledge,
  ec: number | null,
  salinityRisk: SoilProfile['soil']['salinityRisk'],
): number {
  if (ec == null || salinityRisk === 'unknown') {
    return 0.4;
  }

  const maxEc = crop.soil.maximumElectricalConductivityDsM;
  let ecRatio: number;
  if (ec <= maxEc * 0.7) {
    ecRatio = 1;
  } else if (ec <= maxEc) {
    const span = maxEc - maxEc * 0.7;
    ecRatio = span <= 0 ? 0.7 : 0.4 + ((maxEc - ec) / span) * 0.6;
  } else if (ec <= maxEc * 1.5) {
    ecRatio = Math.max(0.1, 0.4 * (1 - (ec - maxEc) / (maxEc * 0.5)));
  } else {
    ecRatio = 0;
  }

  const riskRatio = RISK_COMPATIBILITY_TABLE[crop.soil.salinityTolerance][salinityRisk];
  return Math.min(ecRatio, riskRatio);
}

function organicMatterRatio(value: number, minimum: number, preferred: number): number {
  if (value >= preferred) {
    return 1;
  }
  if (value >= minimum) {
    const span = preferred - minimum;
    if (span <= 0) {
      return 0.85;
    }
    return 0.55 + ((value - minimum) / span) * 0.45;
  }
  if (value <= 0) {
    return 0;
  }
  return Math.max(0.15, (value / minimum) * 0.5);
}

function waterHoldingRatio(
  capacity: SoilProfile['soil']['waterHoldingCapacity'],
  droughtTolerance: 'low' | 'medium' | 'high',
): number {
  if (capacity === 'unknown') {
    return 0.4;
  }
  const base = { low: 0.4, medium: 0.75, high: 1 }[capacity];
  if (droughtTolerance === 'high' && capacity === 'low') {
    return Math.min(1, base + 0.2);
  }
  if (droughtTolerance === 'low' && capacity === 'low') {
    return 0.25;
  }
  return base;
}

function calciumCarbonateRatio(
  percent: number | null,
  tolerance: 'low' | 'medium' | 'high',
): number {
  if (percent == null) {
    return 0.4;
  }
  const limits = { low: 8, medium: 15, high: 25 };
  const limit = limits[tolerance];
  if (percent <= limit * 0.7) {
    return 1;
  }
  if (percent <= limit) {
    return 0.65;
  }
  if (percent <= limit * 1.4) {
    return 0.3;
  }
  return 0.1;
}

function phMessage(ratio: number, ph: number): string {
  if (ratio >= 1) {
    return `Toprak pH değeri (${ph}) tercih edilen aralık içindedir.`;
  }
  if (ratio >= 0.5) {
    return `Toprak pH değeri (${ph}) tercih edilen aralığın sınırındadır.`;
  }
  return `Toprak pH değeri (${ph}) ürün gereksinimlerinden sapma göstermektedir.`;
}

function textureMessage(ratio: number, texture: string): string {
  if (ratio >= 1) {
    return `Tekstür (${texture}) tercih edilen sınıflar arasındadır.`;
  }
  if (ratio >= 0.65) {
    return `Tekstür (${texture}) kabul edilebilir sınıflar arasındadır.`;
  }
  if (ratio >= 0.35) {
    return `Tekstür bilgisi belirsizdir; saha doğrulaması önerilir.`;
  }
  return `Tekstür (${texture}) ürün için uyumsuz bir sinyal vermektedir.`;
}

function drainageMessage(
  ratio: number,
  observed: string,
  required: string,
): string {
  if (ratio >= 1) {
    return `Drenaj (${observed}) ürün gereksinimi (${required}) ile uyumludur.`;
  }
  return `Drenaj (${observed}) ürün gereksinimine (${required}) göre sınırlı uyum göstermektedir.`;
}

function salinityMessage(
  ratio: number,
  ec: number | null,
  risk: string,
): string {
  if (ec == null || risk === 'unknown') {
    return 'Tuzluluk (EC) verisi mevcut değildir; bu faktör için olumlu varsayım yapılmamıştır.';
  }
  if (ratio >= 0.85) {
    return `Tuzluluk sinyali (EC ${ec} dS/m, risk ${risk}) ürün toleransı ile uyumludur.`;
  }
  if (ratio >= 0.4) {
    return `Tuzluluk sinyali (EC ${ec} dS/m, risk ${risk}) dikkat gerektirir.`;
  }
  return `Tuzluluk sinyali (EC ${ec} dS/m, risk ${risk}) ürün için zayıf uyum göstermektedir.`;
}

function organicMatterMessage(ratio: number, value: number): string {
  if (ratio >= 1) {
    return `Organik madde oranı (${value}%) tercih edilen düzeye yakındır.`;
  }
  if (ratio >= 0.5) {
    return `Organik madde oranı (${value}%) sınırlıdır; verimlilik yönetimi gerekebilir.`;
  }
  return `Organik madde oranı (${value}%) düşüktür.`;
}

function depthMessage(
  ratio: number,
  depth: number | null,
  minimum: number,
): string {
  if (depth == null) {
    return 'Gerçek köklenebilir toprak derinliği bilinmemektedir; bu alan için puan sınırlı tutulmuştur.';
  }
  if (ratio >= 1) {
    return `Toprak derinliği (${depth} cm) minimum gereksinimi (${minimum} cm) karşılamaktadır.`;
  }
  return `Toprak derinliği (${depth} cm) minimum gereksinimin (${minimum} cm) altındadır.`;
}
