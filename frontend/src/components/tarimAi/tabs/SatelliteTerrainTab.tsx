import { useState } from 'react'
import type { AnalysisResult } from '../../../api/tarimAi'
import { satelliteLayerImageUrl } from '../../../api/tarimAi'
import { cn } from '../../../lib/utils'
import {
  asRecord,
  firstNumber,
  formatDateTr,
  formatFactorItem,
  formatLabel,
  formatNumber,
  formatSource,
  formatUsabilityClassification,
  LAYER_META,
  pick,
  satelliteCaptureInfo,
  statusTone,
  unwrapSection,
} from '../../../utils/tarimAiFormat'
import { StatusBadge } from '../StatusBadge'

type LayerId = (typeof LAYER_META)[number]['id']

const LAYER_LEGENDS: Partial<Record<LayerId, { gradient: string; low: string; high: string; hint: string }>> = {
  ndvi: {
    gradient: 'linear-gradient(to right, #b3412c, #e8c94a, #2f8f46)',
    low: 'Düşük bitki örtüsü',
    high: 'Yüksek bitki örtüsü',
    hint: 'NDVI, bitki örtüsü yoğunluğunu ve canlılığını gösterir; kesinlik iddiası taşımaz.',
  },
  ndmi: {
    gradient: 'linear-gradient(to right, #9c6b32, #e3ddd0, #2f6fa3)',
    low: 'Düşük nem',
    high: 'Yüksek nem',
    hint: 'NDMI, bitki örtüsü ve yüzeydeki nem düzeyine dair bir gösterge sunar.',
  },
  bsi: {
    gradient: 'linear-gradient(to right, #2f7a3d, #e6dcb8)',
    low: 'Bitki örtülü yüzey',
    high: 'Çıplak toprak',
    hint: 'BSI, çıplak toprak / bitkisiz yüzey oranına dair bir gösterge sunar.',
  },
}

const LAYER_STATS_KEY: Record<LayerId, string> = {
  'true-color': 'trueColor',
  ndvi: 'ndvi',
  ndmi: 'ndmi',
  bsi: 'bsi',
}

/**
 * "Uydu ve Arazi" tab: large satellite layer viewer (NDVI/NDMI/BSI/true-color)
 * with a neutral placeholder on failure, terrain KPIs with a single DEM
 * disclaimer, and a compact land-usability summary.
 */
export function SatelliteTerrainTab({
  result,
  analysisId,
}: {
  result: AnalysisResult
  analysisId: string | null
}) {
  const [activeLayer, setActiveLayer] = useState<LayerId>('true-color')
  const [failedLayers, setFailedLayers] = useState<Partial<Record<LayerId, boolean>>>({})

  const { captureDate, cloud, usable } = satelliteCaptureInfo(result)
  const satRecord = asRecord(result.satellite)
  const selectedObservation = asRecord(pick(satRecord, 'selectedObservation'))
  const layerBlock = asRecord(pick(selectedObservation, LAYER_STATS_KEY[activeLayer]))
  const layerStats = asRecord(pick(layerBlock, 'statistics'))
  const layerMean = firstNumber(pick(layerStats, 'mean'))
  const activeLayerMeta = LAYER_META.find((layer) => layer.id === activeLayer)
  const legend = LAYER_LEGENDS[activeLayer]

  const imageSrc = satelliteLayerImageUrl(result, analysisId, activeLayer)
  const imageFailed = failedLayers[activeLayer] === true

  const terrain = unwrapSection(result.terrain, 'terrain')
  const elevation = asRecord(pick(terrain, 'elevation'))
  const slope = asRecord(pick(terrain, 'slope'))
  const ruggedness = asRecord(pick(terrain, 'ruggedness'))
  const mechanization = asRecord(pick(terrain, 'mechanizationSuitability', 'mechanization'))
  const terrainSource = pick(terrain, 'source')
  const terrainResolution = firstNumber(pick(terrain, 'resolutionMeters'))

  const meanElevation = firstNumber(pick(elevation, 'meanMeters', 'mean'))
  const minElevation = firstNumber(pick(elevation, 'minMeters', 'min'))
  const maxElevation = firstNumber(pick(elevation, 'maxMeters', 'max'))
  const meanSlopeDeg = firstNumber(pick(slope, 'meanDegrees', 'mean'))
  const slopeClass = pick(slope, 'class', 'classification')
  const ruggednessClass = pick(ruggedness, 'classification', 'class')
  const mechanizationClass = pick(mechanization, 'classification')
  const mechanizationConfidence = pick(mechanization, 'confidence')

  const land = unwrapSection(result.landUsability, 'landUsability')
  const landClassification = pick(land, 'classification', 'status') as string | undefined
  const landScore = firstNumber(pick(land, 'score'))
  const landPositive = pick(land, 'positiveFactors')
  const landLimiting = pick(land, 'limitingFactors')

  return (
    <div className="tai2-satellite-tab">
      <section className="tai2-card tai2-sat-viewer">
        <div className="tai2-card-header">
          <h3 className="tai2-card-title">Uydu görüntüsü</h3>
        </div>

        <div className="tai2-sat-layer-tabs" role="tablist" aria-label="Uydu katmanları">
          {LAYER_META.map((layer) => (
            <button
              key={layer.id}
              type="button"
              role="tab"
              aria-selected={activeLayer === layer.id}
              className={cn('tai2-sat-layer-tab', activeLayer === layer.id && 'is-active')}
              onClick={() => setActiveLayer(layer.id)}
              title={layer.hint}
            >
              {layer.label}
            </button>
          ))}
        </div>

        <figure className="tai2-sat-figure">
          {imageSrc && !imageFailed ? (
            <img
              src={imageSrc}
              alt={`${activeLayerMeta?.label ?? ''}${captureDate ? ` (${formatDateTr(captureDate)})` : ''}`}
              loading="lazy"
              onError={() => setFailedLayers((prev) => ({ ...prev, [activeLayer]: true }))}
            />
          ) : (
            <div className="tai2-sat-placeholder">
              <span>Görüntü yüklenemedi</span>
            </div>
          )}
        </figure>

        {legend ? (
          <div className="tai2-sat-legend">
            <div className="tai2-sat-legend-bar" style={{ backgroundImage: legend.gradient }} aria-hidden="true" />
            <div className="tai2-sat-legend-labels">
              <span>{legend.low}</span>
              <span>{legend.high}</span>
            </div>
            <p className="tai2-sat-legend-hint">{legend.hint}</p>
          </div>
        ) : null}

        <dl className="tai2-sat-info-grid">
          <div>
            <dt>Çekim tarihi</dt>
            <dd>{captureDate ? formatDateTr(captureDate, true) : '—'}</dd>
          </div>
          <div>
            <dt>Bulut örtüsü</dt>
            <dd>{typeof cloud === 'number' ? formatNumber(cloud * 100, 0, '%') : '—'}</dd>
          </div>
          <div>
            <dt>Kullanılabilir gözlem</dt>
            <dd>{typeof usable === 'number' ? String(usable) : '—'}</dd>
          </div>
          {activeLayer !== 'true-color' && layerMean != null ? (
            <div>
              <dt>{activeLayerMeta?.label} ortalaması</dt>
              <dd>{formatNumber(layerMean, 2)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="tai2-card">
        <div className="tai2-card-header">
          <h3 className="tai2-card-title">Arazi (eğim / rakım)</h3>
        </div>
        <dl className="tai2-kpi-grid">
          <div className="tai2-kpi">
            <dt>Rakım (ort.)</dt>
            <dd>{formatNumber(meanElevation, 0, ' m')}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Rakım aralığı</dt>
            <dd>
              {minElevation != null || maxElevation != null
                ? `${formatNumber(minElevation, 0, ' m')} – ${formatNumber(maxElevation, 0, ' m')}`
                : '—'}
            </dd>
          </div>
          <div className="tai2-kpi">
            <dt>Eğim (ort.)</dt>
            <dd>{formatNumber(meanSlopeDeg, 1, '°')}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Eğim sınıfı</dt>
            <dd>{formatLabel(slopeClass)}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Engebelilik</dt>
            <dd>{formatLabel(ruggednessClass)}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Mekanizasyon</dt>
            <dd>{formatLabel(mechanizationClass)}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Mekanizasyon güveni</dt>
            <dd>{formatLabel(mechanizationConfidence)}</dd>
          </div>
        </dl>
        <p className="tai2-sat-dem-disclaimer">
          Bu değerler {terrainSource ? formatSource(terrainSource) : 'uzaktan yükseklik modeli (DEM)'}
          {terrainResolution ? ` (~${terrainResolution} m çözünürlük)` : ''} kaynağından hesaplanmıştır; saha
          ölçümü yerine geçmez.
        </p>
      </section>

      <section className="tai2-card tai2-land-usability-compact">
        <div className="tai2-card-header">
          <h3 className="tai2-card-title">Arazi kullanılabilirliği</h3>
          {landClassification ? (
            <StatusBadge
              label={formatUsabilityClassification(landClassification)}
              tone={statusTone(landClassification)}
            />
          ) : null}
        </div>
        {landScore != null ? (
          <p className="tai2-land-usability-score">
            Skor: <strong>{formatNumber(landScore, 0)}</strong>/100
          </p>
        ) : null}
        {Array.isArray(landPositive) && landPositive.length > 0 ? (
          <div className="tai2-compact-factor-block">
            <h4>Olumlu faktörler</h4>
            <ul className="tai2-compact-list is-positive">
              {landPositive.slice(0, 4).map((item, index) => (
                <li key={index}>{formatFactorItem(item)}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {Array.isArray(landLimiting) && landLimiting.length > 0 ? (
          <div className="tai2-compact-factor-block">
            <h4>Sınırlayıcı faktörler</h4>
            <ul className="tai2-compact-list is-limiting">
              {landLimiting.slice(0, 4).map((item, index) => (
                <li key={index}>{formatFactorItem(item)}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {landScore == null && !Array.isArray(landPositive) && !Array.isArray(landLimiting) ? (
          <p className="tai2-muted">Arazi kullanılabilirliği sonucu alınamadı.</p>
        ) : null}
      </section>
    </div>
  )
}
