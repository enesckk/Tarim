import type { CropKnowledge } from '../types/crop.types.js';
import type {
  CropRecommendationItem,
  RecommendationInputSnapshot,
  RecommendationSignal,
} from '../types/recommendation.types.js';
import type { SuitabilityScoreResult } from '../types/suitability.types.js';
import {
  MAX_REQUIRED_VERIFICATIONS,
  MAX_RISKS,
  MAX_STRENGTHS,
} from '../rules/scoring-thresholds.js';

export class RecommendationExplanationService {
  build(
    crop: CropKnowledge,
    snapshot: RecommendationInputSnapshot,
    suitability: SuitabilityScoreResult,
  ): Pick<
    CropRecommendationItem,
    'strengths' | 'risks' | 'requiredVerifications' | 'explanation'
  > {
    const strengths = collectStrengths(crop, snapshot, suitability).slice(0, MAX_STRENGTHS);
    const risks = collectRisks(crop, snapshot, suitability).slice(0, MAX_RISKS);
    const requiredVerifications = collectVerifications(snapshot, suitability).slice(
      0,
      MAX_REQUIRED_VERIFICATIONS,
    );

    const whyRecommended = strengths.map((item) => item.message);
    const whyNotHigher = collectWhyNotHigher(suitability, risks).slice(0, MAX_RISKS);

    const mockNote =
      snapshot.climate.metadata.isMock || snapshot.soil.metadata.isMock
        ? ' Ancak sonuç temsili iklim ve/veya toprak verilerine dayandığı için saha doğrulaması gereklidir.'
        : ' Saha ve laboratuvar doğrulaması ile birlikte değerlendirilmelidir.';

    const summary = `${crop.name} için iklim ve toprak verilerinde ${
      suitability.final >= 70
        ? 'genel olarak olumlu sinyaller'
        : suitability.final >= 55
          ? 'karışık sinyaller'
          : 'sınırlı uygunluk sinyalleri'
    } görülmektedir.${mockNote}`;

    return {
      strengths,
      risks,
      requiredVerifications,
      explanation: {
        summary,
        whyRecommended,
        whyNotHigher,
      },
    };
  }
}

function collectStrengths(
  crop: CropKnowledge,
  snapshot: RecommendationInputSnapshot,
  suitability: SuitabilityScoreResult,
): RecommendationSignal[] {
  const out: RecommendationSignal[] = [];
  const climateFactors = suitability.breakdown.climate.factors;
  const soilFactors = suitability.breakdown.soil.factors;

  const temp = climateFactors.find((f) => f.code === 'TEMPERATURE');
  if (temp && temp.score / temp.maxScore >= 0.85) {
    out.push({
      code: 'CLIMATE_TEMPERATURE_MATCH',
      message: 'Sıcaklık profili ürün gereksinimleriyle genel olarak uyumludur.',
    });
  }

  const ph = soilFactors.find((f) => f.code === 'PH');
  if (ph && ph.score / ph.maxScore >= 0.85) {
    out.push({
      code: 'SOIL_PH_MATCH',
      message: 'Toprak pH değeri tercih edilen aralıkla uyumludur.',
    });
  }

  const texture = soilFactors.find((f) => f.code === 'TEXTURE');
  if (texture && texture.score / texture.maxScore >= 0.95) {
    out.push({
      code: 'SOIL_TEXTURE_PREFERRED',
      message: 'Toprak tekstürü tercih edilen sınıflar arasındadır.',
    });
  }

  const precip = climateFactors.find((f) => f.code === 'PRECIPITATION');
  if (precip && precip.score / precip.maxScore >= 0.75) {
    out.push({
      code: 'CLIMATE_PRECIPITATION_MATCH',
      message: 'Yağış profili ürün gereksinimleriyle genel olarak uyumludur.',
    });
  }

  if (
    crop.climate.droughtTolerance === 'high' &&
    snapshot.climate.water.droughtRisk !== 'high'
  ) {
    out.push({
      code: 'DROUGHT_TOLERANCE_FIT',
      message: 'Ürünün kuraklık toleransı mevcut iklim sinyalleriyle uyumludur.',
    });
  }

  return dedupeSignals(out);
}

function collectRisks(
  crop: CropKnowledge,
  snapshot: RecommendationInputSnapshot,
  suitability: SuitabilityScoreResult,
): RecommendationSignal[] {
  const out: RecommendationSignal[] = [];

  if (
    crop.climate.irrigationDependency === 'high' ||
    snapshot.climate.water.estimatedIrrigationNeed === 'high'
  ) {
    out.push({
      code: 'IRRIGATION_NEED_HIGH',
      severity: 'major',
      message: 'Düşük yaz yağışı nedeniyle düzenli sulama gerekebilir.',
    });
  }

  const ph = suitability.breakdown.soil.factors.find((f) => f.code === 'PH');
  if (ph && ph.score / ph.maxScore < 0.7) {
    out.push({
      code: 'PH_OUT_OF_OPTIMUM',
      severity: 'moderate',
      message: 'Toprak pH değeri ürünün tercih ettiği aralığın dışındadır.',
    });
  }

  const om = suitability.breakdown.soil.factors.find((f) => f.code === 'ORGANIC_MATTER');
  if (om && om.score / om.maxScore < 0.6) {
    out.push({
      code: 'ORGANIC_MATTER_LOW',
      severity: 'moderate',
      message: 'Organik madde oranı düşük görünmektedir.',
    });
  }

  const drainage = suitability.breakdown.soil.factors.find((f) => f.code === 'DRAINAGE');
  if (drainage && drainage.score / drainage.maxScore < 0.6) {
    out.push({
      code: 'DRAINAGE_LIMITED',
      severity: 'major',
      message: 'Drenaj koşulları ürün gereksinimine göre sınırlıdır.',
    });
  }

  const salinity = suitability.breakdown.soil.factors.find((f) => f.code === 'SALINITY');
  if (salinity && salinity.score / salinity.maxScore < 0.65) {
    out.push({
      code: 'SALINITY_NEAR_LIMIT',
      severity: 'major',
      message: 'Tuzluluk sinyali ürün tolerans sınırına yakındır.',
    });
  }

  for (const constraint of suitability.constraints) {
    out.push({
      code: constraint.code,
      severity: constraint.severity,
      message: constraint.message,
    });
  }

  return dedupeSignals(out);
}

function collectVerifications(
  snapshot: RecommendationInputSnapshot,
  suitability: SuitabilityScoreResult,
): string[] {
  const items: string[] = [];

  if (snapshot.soil.metadata.isMock) {
    items.push(
      'Toprak pH ve tuzluluk değerleri laboratuvar analiziyle doğrulanmalıdır.',
    );
  }
  if (snapshot.climate.metadata.isMock) {
    items.push('İklim ve sulama ihtiyacı yerel ölçümlerle doğrulanmalıdır.');
  }
  if (
    snapshot.climate.water.estimatedIrrigationNeed === 'high' ||
    suitability.breakdown.climate.factors.some(
      (f) => f.code === 'IRRIGATION_COMPATIBILITY' && f.score / f.maxScore < 0.8,
    )
  ) {
    items.push('Sulama suyu miktarı ve kalitesi kontrol edilmelidir.');
  }
  items.push(
    'Uydu verileri yüzey sinyallerini gösterir; karar öncesi saha gözlemi yapılmalıdır.',
  );

  return [...new Set(items)];
}

function collectWhyNotHigher(
  suitability: SuitabilityScoreResult,
  risks: RecommendationSignal[],
): string[] {
  const reasons: string[] = [];

  const weakFactors = [
    ...suitability.breakdown.climate.factors,
    ...suitability.breakdown.soil.factors,
    ...suitability.breakdown.reliability.factors,
  ]
    .filter((f) => f.maxScore > 0 && f.score / f.maxScore < 0.7)
    .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore);

  for (const factor of weakFactors.slice(0, 3)) {
    reasons.push(factor.message);
  }

  for (const risk of risks.slice(0, 2)) {
    if (!reasons.includes(risk.message)) {
      reasons.push(risk.message);
    }
  }

  if (suitability.constraintPenalty > 0) {
    reasons.push(
      `Hard constraint cezası (${suitability.constraintPenalty} puan) nihai skoru düşürmüştür.`,
    );
  }

  return [...new Set(reasons)].slice(0, MAX_RISKS);
}

function dedupeSignals(signals: RecommendationSignal[]): RecommendationSignal[] {
  const seen = new Set<string>();
  const out: RecommendationSignal[] = [];
  for (const signal of signals) {
    const key = `${signal.code}|${signal.message}`;
    if (seen.has(key) || seen.has(signal.message)) {
      continue;
    }
    seen.add(key);
    seen.add(signal.message);
    out.push(signal);
  }
  return out;
}
