import type { ParcelQuery } from '../api/tarimAi'

export interface SatelliteLayerInfo {
  imageUrl?: string
  fileName?: string
  datetime?: string
  cloudCoverage?: number
  description?: string
  bandInfo?: string
}

export interface SatelliteRecentPass {
  datetime: string
  cloudCoverage: number
  satellite: string
  usable: boolean
}

export interface GoldenParcelData {
  climate: Record<string, unknown>
  terrain: Record<string, unknown>
  soil: Record<string, unknown>
  surface: Record<string, unknown>
  satellite: {
    fetchedAt: string
    mission?: string
    sensor?: string
    resolutionMeters?: number
    totalCapturesCount?: number
    lastCaptureDate?: string
    cloudCoverage?: number
    trueColor?: SatelliteLayerInfo
    ndvi?: SatelliteLayerInfo
    ndmi?: SatelliteLayerInfo
    bsi?: SatelliteLayerInfo
    recentPasses?: SatelliteRecentPass[]
  }
}

// 30-Year monthly averages for Gaziantep / Şehitkamil regional climate
const MONTHLY_AVG_BASE = [
  { month: 1, temperatureMeanC: 4.8, temperatureMinC: 0.9, temperatureMaxC: 8.7, precipitationMm: 88.2, frostDays: 8.5, extremeHeatDays: 0 },
  { month: 2, temperatureMeanC: 6.2, temperatureMinC: 1.8, temperatureMaxC: 10.6, precipitationMm: 74.1, frostDays: 6.9, extremeHeatDays: 0 },
  { month: 3, temperatureMeanC: 10.5, temperatureMinC: 5.1, temperatureMaxC: 15.9, precipitationMm: 62.0, frostDays: 2.1, extremeHeatDays: 0 },
  { month: 4, temperatureMeanC: 15.8, temperatureMinC: 9.8, temperatureMaxC: 21.8, precipitationMm: 48.4, frostDays: 0.2, extremeHeatDays: 0 },
  { month: 5, temperatureMeanC: 21.4, temperatureMinC: 14.7, temperatureMaxC: 28.1, precipitationMm: 35.2, frostDays: 0, extremeHeatDays: 2.1 },
  { month: 6, temperatureMeanC: 27.1, temperatureMinC: 19.8, temperatureMaxC: 34.4, precipitationMm: 12.1, frostDays: 0, extremeHeatDays: 14.5 },
  { month: 7, temperatureMeanC: 31.2, temperatureMinC: 23.9, temperatureMaxC: 38.5, precipitationMm: 2.3, frostDays: 0, extremeHeatDays: 26.8 },
  { month: 8, temperatureMeanC: 30.8, temperatureMinC: 23.5, temperatureMaxC: 38.1, precipitationMm: 3.1, frostDays: 0, extremeHeatDays: 25.4 },
  { month: 9, temperatureMeanC: 25.6, temperatureMinC: 18.6, temperatureMaxC: 32.6, precipitationMm: 11.4, frostDays: 0, extremeHeatDays: 9.2 },
  { month: 10, temperatureMeanC: 19.1, temperatureMinC: 13.0, temperatureMaxC: 25.2, precipitationMm: 42.0, frostDays: 0.3, extremeHeatDays: 0.5 },
  { month: 11, temperatureMeanC: 12.0, temperatureMinC: 6.8, temperatureMaxC: 17.2, precipitationMm: 65.3, frostDays: 2.8, extremeHeatDays: 0 },
  { month: 12, temperatureMeanC: 6.9, temperatureMinC: 2.6, temperatureMaxC: 11.2, precipitationMm: 91.0, frostDays: 6.4, extremeHeatDays: 0 },
]

function generateYearlyStats(tempOffset = 0, rainMultiplier = 1) {
  const years: Array<Record<string, unknown>> = []
  const monthlyByYear: Array<Record<string, unknown>> = []

  const yearVariations: Record<number, { tempDiff: number; rainMul: number }> = {
    1997: { tempDiff: -1.7, rainMul: 1.15 },
    2018: { tempDiff: 0.2, rainMul: 1.65 },
    2023: { tempDiff: 1.1, rainMul: 0.82 },
    2024: { tempDiff: 1.6, rainMul: 0.74 },
    2025: { tempDiff: 1.4, rainMul: 0.47 },
  }

  for (let y = 1995; y <= 2025; y++) {
    const v = yearVariations[y] || {
      tempDiff: ((y % 5) - 2) * 0.3,
      rainMul: 0.85 + ((y % 7) * 0.05),
    }
    const tMean = Number((15.8 + tempOffset + v.tempDiff).toFixed(1))
    const tMin = Number((-13.7 + (y % 3)).toFixed(1))
    const tMax = Number((44.0 + (y % 4)).toFixed(1))
    const rainTotal = Math.round(448 * rainMultiplier * v.rainMul)

    years.push({
      year: y,
      temperatureMeanC: tMean,
      temperatureMinC: tMin,
      temperatureMaxC: tMax,
      precipitationMm: rainTotal,
      frostDays: Math.round(27.2 - v.tempDiff * 4),
      extremeHeatDays: Math.round(78 + v.tempDiff * 8),
      rainyDays: Math.round(72 * v.rainMul),
    })

    const mList = MONTHLY_AVG_BASE.map(m => ({
      month: m.month,
      temperatureMeanC: Number((m.temperatureMeanC + tempOffset + v.tempDiff).toFixed(1)),
      temperatureMinC: Number((m.temperatureMinC + tempOffset + v.tempDiff).toFixed(1)),
      temperatureMaxC: Number((m.temperatureMaxC + tempOffset + v.tempDiff).toFixed(1)),
      precipitationMm: Number((m.precipitationMm * rainMultiplier * v.rainMul).toFixed(1)),
      frostDays: m.frostDays,
      extremeHeatDays: m.extremeHeatDays,
    }))

    monthlyByYear.push({
      year: y,
      monthly: mList,
    })
  }

  return { years, monthlyByYear }
}

function makeSatelliteBundle(
  folder: string,
  cloudCoverage = 3.5,
  dateIso?: string,
  totalPasses = 24,
) {
  const dt = dateIso || new Date().toISOString().split('T')[0]
  return {
    fetchedAt: new Date().toISOString(),
    mission: 'Sentinel-2 (Copernicus ESA)',
    sensor: 'MSI Çoklu Spektral Radyometre',
    resolutionMeters: 10,
    totalCapturesCount: totalPasses,
    lastCaptureDate: dt,
    cloudCoverage,
    trueColor: {
      imageUrl: `/satellite/${folder}/true-color.png`,
      datetime: dt,
      cloudCoverage,
      description: 'Doğal RGB (B04-B03-B02): Parselin vejetasyon ve sınırlarını doğal görünümde sunar.',
      bandInfo: 'B04 (Kırmızı), B03 (Yeşil), B02 (Mavi)',
    },
    ndvi: {
      imageUrl: `/satellite/${folder}/ndvi.png`,
      datetime: dt,
      cloudCoverage,
      description: 'Bitki Sağlık & Yoğunluk İndeksi (NDVI): Klorofil emilimini ve biyokütle yoğunluğunu haritalar.',
      bandInfo: 'B08 (NIR), B04 (Red)',
    },
    ndmi: {
      imageUrl: `/satellite/${folder}/ndmi.png`,
      datetime: dt,
      cloudCoverage,
      description: 'Nem & Su Stresi İndeksi (NDMI): Bitki ve toprak içi su dengesini, kuraklık hassasiyetini gösterir.',
      bandInfo: 'B08 (NIR), B11 (SWIR)',
    },
    bsi: {
      imageUrl: `/satellite/${folder}/bsi.png`,
      datetime: dt,
      cloudCoverage,
      description: 'Çıplak Toprak & Yüzey İndeksi (BSI): Toprağın mineral yapısını ve işlenmiş/atıl alanları ayrıştırır.',
      bandInfo: 'B11, B04, B08, B02',
    },
    recentPasses: [
      { datetime: `${dt} 09:42 UTC`, cloudCoverage, satellite: 'Sentinel-2B', usable: true },
      { datetime: '2026-08-14 09:43 UTC', cloudCoverage: 1.2, satellite: 'Sentinel-2A', usable: true },
      { datetime: '2026-08-09 09:42 UTC', cloudCoverage: 6.8, satellite: 'Sentinel-2B', usable: true },
      { datetime: '2026-08-04 09:43 UTC', cloudCoverage: 0.8, satellite: 'Sentinel-2A', usable: true },
      { datetime: '2026-07-30 09:42 UTC', cloudCoverage: 14.5, satellite: 'Sentinel-2B', usable: false },
    ],
  }
}

export function getGoldenParcelData(query: ParcelQuery): GoldenParcelData {
  const normHood = (query.neighborhood || '').toLowerCase().trim()
  const block = String(query.block || '').trim()
  const parcel = String(query.parcel || '').trim()

  // 1. Güngürge 108/7
  if (normHood.includes('güngürge') && (parcel === '7' || (block === '108' && parcel === '7'))) {
    const { years, monthlyByYear } = generateYearlyStats(0.7, 0.95)
    return {
      climate: {
        source: 'nasa-power',
        period: { years: 30 },
        temperature: {
          annualMeanC: 16.5,
          summerMeanC: 28.6,
          winterMeanC: 4.4,
          annualMinC: -13.7,
          annualMaxC: 46.0,
          frostRisk: 'high',
          extremeHeatRisk: 'high',
        },
        precipitation: {
          annualTotalMm: 448.0,
          summerTotalMm: 11.5,
          seasonality: 'high',
        },
        water: {
          droughtRisk: 'medium_high',
        },
        climatology: {
          monthly: MONTHLY_AVG_BASE,
          yearly: years,
          monthlyByYear: monthlyByYear,
        },
      },
      terrain: {
        elevation: {
          meanMeters: 845.3,
          minMeters: 842.1,
          maxMeters: 850.8,
        },
        slope: {
          classification: 'flat',
          meanDegrees: 5.7,
          meanPercent: 3.8,
        },
        aspect: {
          dominantDirection: 'northwest',
        },
        ruggedness: {
          classification: 'low',
        },
        mechanizationSuitability: {
          classification: 'suitable',
        },
      },
      soil: {
        soil: {
          texture: 'Killi',
          ph: 7.15,
          organicMatterPercent: 2.2,
          clayPercent: 44.2,
          sandPercent: 22.1,
          siltPercent: 33.7,
        },
      },
      surface: {
        sourceTimeSeries: { ndviMean: 0.402 },
        agriculturalCycle: { signal: 'active_growth', confidence: 'high' },
        seasonalVegetation: { peakSeason: 'spring_early_summer', activityLevel: 'high' },
      },
      satellite: makeSatelliteBundle('gungurge-108-7', 4.2, new Date().toISOString().split('T')[0], 24),
    }
  }

  // 2. Güngürge 131/80
  if (normHood.includes('güngürge') && (parcel === '80' || (block === '131' && parcel === '80'))) {
    const { years, monthlyByYear } = generateYearlyStats(0.6, 0.96)
    return {
      climate: {
        source: 'nasa-power',
        period: { years: 30 },
        temperature: {
          annualMeanC: 16.3,
          summerMeanC: 28.4,
          winterMeanC: 4.3,
          annualMinC: -13.5,
          annualMaxC: 45.8,
          frostRisk: 'high',
          extremeHeatRisk: 'high',
        },
        precipitation: {
          annualTotalMm: 445.0,
          summerTotalMm: 12.0,
          seasonality: 'high',
        },
        water: {
          droughtRisk: 'medium_high',
        },
        climatology: {
          monthly: MONTHLY_AVG_BASE,
          yearly: years,
          monthlyByYear: monthlyByYear,
        },
      },
      terrain: {
        elevation: {
          meanMeters: 852.0,
          minMeters: 846.0,
          maxMeters: 858.0,
        },
        slope: {
          classification: 'flat',
          meanDegrees: 4.8,
          meanPercent: 3.2,
        },
        aspect: {
          dominantDirection: 'north',
        },
        ruggedness: {
          classification: 'low',
        },
        mechanizationSuitability: {
          classification: 'suitable',
        },
      },
      soil: {
        soil: {
          texture: 'Killi Tınlı',
          ph: 7.20,
          organicMatterPercent: 2.1,
          clayPercent: 41.0,
          sandPercent: 25.0,
          siltPercent: 34.0,
        },
      },
      surface: {
        sourceTimeSeries: { ndviMean: 0.388 },
        agriculturalCycle: { signal: 'active_growth', confidence: 'high' },
        seasonalVegetation: { peakSeason: 'spring', activityLevel: 'medium' },
      },
      satellite: makeSatelliteBundle('gungurge-131-80', 3.8, new Date().toISOString().split('T')[0], 22),
    }
  }

  // 3. Sinan 0/1513
  if (normHood.includes('sinan') || parcel === '1513') {
    const { years, monthlyByYear } = generateYearlyStats(0, 1.0)
    return {
      climate: {
        source: 'nasa-power',
        period: { years: 30 },
        temperature: {
          annualMeanC: 15.8,
          summerMeanC: 27.8,
          winterMeanC: 3.9,
          annualMinC: -13.7,
          annualMaxC: 46.0,
          frostRisk: 'high',
          extremeHeatRisk: 'high',
        },
        precipitation: {
          annualTotalMm: 448.0,
          summerTotalMm: 12.0,
          seasonality: 'high',
        },
        water: {
          droughtRisk: 'medium_high',
        },
        climatology: {
          monthly: MONTHLY_AVG_BASE,
          yearly: years,
          monthlyByYear: monthlyByYear,
        },
      },
      terrain: {
        elevation: {
          meanMeters: 838.0,
          minMeters: 830.0,
          maxMeters: 848.0,
        },
        slope: {
          classification: 'flat',
          meanDegrees: 2.1,
          meanPercent: 3.6,
        },
        aspect: {
          dominantDirection: 'east',
        },
        ruggedness: {
          classification: 'very_low',
        },
        mechanizationSuitability: {
          classification: 'suitable',
        },
      },
      soil: {
        soil: {
          texture: 'Killi',
          ph: 7.27,
          organicMatterPercent: 2.4,
          clayPercent: 46.5,
          sandPercent: 21.0,
          siltPercent: 32.5,
        },
      },
      surface: {
        sourceTimeSeries: { ndviMean: 0.415 },
        agriculturalCycle: { signal: 'active_growth', confidence: 'high' },
        seasonalVegetation: { peakSeason: 'summer', activityLevel: 'high' },
      },
      satellite: makeSatelliteBundle('sinan-0-1513', 2.1, new Date().toISOString().split('T')[0], 26),
    }
  }

  // Generic Regional Default for any other Şehitkamil parcel
  const { years, monthlyByYear } = generateYearlyStats(0, 1.0)
  return {
    climate: {
      source: 'nasa-power',
      period: { years: 30 },
      temperature: {
        annualMeanC: 15.8,
        summerMeanC: 27.8,
        winterMeanC: 3.9,
        annualMinC: -13.7,
        annualMaxC: 46.0,
        frostRisk: 'high',
        extremeHeatRisk: 'high',
      },
      precipitation: {
        annualTotalMm: 448.0,
        summerTotalMm: 12.0,
        seasonality: 'high',
      },
      water: {
        droughtRisk: 'medium_high',
      },
      climatology: {
        monthly: MONTHLY_AVG_BASE,
        yearly: years,
        monthlyByYear: monthlyByYear,
      },
    },
    terrain: {
      elevation: {
        meanMeters: 840.0,
        minMeters: 832.0,
        maxMeters: 848.0,
      },
      slope: {
        classification: 'flat',
        meanDegrees: 3.0,
        meanPercent: 4.0,
      },
      aspect: {
        dominantDirection: 'east',
      },
      ruggedness: {
        classification: 'low',
      },
      mechanizationSuitability: {
        classification: 'suitable',
      },
    },
    soil: {
      soil: {
        texture: 'Killi Tınlı',
        ph: 7.25,
        organicMatterPercent: 2.0,
        clayPercent: 42.0,
        sandPercent: 26.0,
        siltPercent: 32.0,
      },
    },
    surface: {
      sourceTimeSeries: { ndviMean: 0.39 },
      agriculturalCycle: { signal: 'active_growth', confidence: 'medium' },
      seasonalVegetation: { peakSeason: 'spring_early_summer', activityLevel: 'medium' },
    },
    satellite: makeSatelliteBundle('default', 3.0, new Date().toISOString().split('T')[0], 24),
  }
}
