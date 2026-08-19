import { AlertTriangle, CheckCircle2, Circle, ExternalLink, MapPin, ThumbsUp } from 'lucide-react'
import type { AnalysisResult } from '../../../api/tarimAi'
import type { DecisionSummary } from '../../../utils/tarimAiDecision'
import { asRecord, firstNumber, formatNumber, formatRisk, normalizeCropRow, pick, statusTone } from '../../../utils/tarimAiFormat'
import { cn } from '../../../lib/utils'
import { StatusBadge } from '../StatusBadge'

const PRIORITY_TR: Record<'high' | 'medium' | 'low', string> = {
  high: 'Yüksek öncelik',
  medium: 'Orta öncelik',
  low: 'Düşük öncelik',
}

function OsmLink({ lat, lon }: { lat: number; lon: number }) {
  const href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
  return (
    <a href={href} target="_blank" rel="noreferrer" className="tai2-osm-link">
      <ExternalLink size={14} aria-hidden="true" />
      Haritada gör (OpenStreetMap)
    </a>
  )
}

/**
 * The "Genel Bakış" tab: parcel identity metrics, the top-3 crop shortlist,
 * the missing-data checklist, and the strengths/concerns summary — all
 * derived from already-computed data (no new network calls, no invented
 * numbers).
 */
export function OverviewTab({
  result,
  summary,
  plantingByCropId,
}: {
  result: AnalysisResult
  summary: DecisionSummary
  plantingByCropId?: Record<string, string>
}) {
  const parcel = asRecord(result.parcel)
  const centroid = asRecord(pick(parcel, 'centroid'))
  const lat = firstNumber(pick(centroid, 'latitude', 'lat'))
  const lon = firstNumber(pick(centroid, 'longitude', 'lon', 'lng'))
  const areaM2 = firstNumber(pick(parcel, 'areaSquareMeters'))

  const topCrops = (result.cropRecommendations ?? []).slice(0, 3).map((item, index) => normalizeCropRow(item, index))

  return (
    <div className="tai2-overview-tab">
      <section className="tai2-card">
        <div className="tai2-card-header">
          <h3 className="tai2-card-title">Parsel bilgileri</h3>
        </div>
        <dl className="tai2-metric-grid">
          <div>
            <dt>Konum</dt>
            <dd>
              {[pick(parcel, 'province'), pick(parcel, 'district'), pick(parcel, 'neighborhood')]
                .filter(Boolean)
                .join(' / ') || '—'}
            </dd>
          </div>
          <div>
            <dt>Ada / Parsel</dt>
            <dd>
              {String(pick(parcel, 'block') ?? '—')} / {String(pick(parcel, 'parcel') ?? '—')}
            </dd>
          </div>
          <div>
            <dt>Alan</dt>
            <dd>{areaM2 != null ? `${formatNumber(areaM2, 0, ' m²')} (${formatNumber(areaM2 / 1000, 2, ' da')})` : '—'}</dd>
          </div>
          <div>
            <dt>Merkez koordinatı</dt>
            <dd>{lat != null && lon != null ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : '—'}</dd>
          </div>
        </dl>
        {lat != null && lon != null ? (
          <div className="tai2-osm-link-row">
            <MapPin size={14} aria-hidden="true" />
            <OsmLink lat={lat} lon={lon} />
          </div>
        ) : null}
      </section>

      <section className="tai2-card">
        <div className="tai2-card-header">
          <h3 className="tai2-card-title">En Uygun Ürün Tavsiyeleri</h3>
        </div>
        {topCrops.length === 0 ? (
          <p className="tai2-muted">Ürün önerisi yok.</p>
        ) : (
          <ul className="tai2-top-crops-list">
            {topCrops.map((row, index) => {
              const planting = row.id ? plantingByCropId?.[row.id] : undefined
              const perennialKw = ['pistachio', 'fıstık', 'olive', 'zeytin', 'almond', 'badem', 'walnut', 'ceviz', 'grape', 'bağ', 'üzüm', 'pomegranate', 'nar', 'fig', 'incir', 'mulberry', 'dut']
              const isPeren = perennialKw.some((kw) => ((row.id || '') + ' ' + (row.name || '')).toLowerCase().includes(kw))
              const badgeLabel = index === 0 ? '🏆 Genel Şampiyon' : isPeren ? '🌳 Çok Yıllık (Ağaç/Meyve)' : '🌾 Dönemlik (Tarla/Sebze)'
              const badgeTone = index === 0 ? 'good' : isPeren ? 'info' : 'good'

              return (
                <li key={`${row.id}-${row.rank}`} className="tai2-top-crop-row">
                  <span className="tai2-top-crop-rank">{row.rank}</span>
                  <div className="tai2-top-crop-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong>{row.name}</strong>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: index === 0 ? '#fef9c3' : isPeren ? '#dcfce7' : '#e0f2fe', color: index === 0 ? '#854d0e' : isPeren ? '#166534' : '#0369a1', fontWeight: 700 }}>
                        {badgeLabel}
                      </span>
                    </div>
                    {planting ? <span className="tai2-top-crop-planting">Ekim / Dikim Dönemi: {planting}</span> : null}
                  </div>
                  {row.classification ? (
                    <StatusBadge label={formatRisk(row.classification)} tone={statusTone(row.classification)} />
                  ) : null}
                  <span className="tai2-top-crop-score">
                    {typeof row.score === 'number' ? `%${formatNumber(row.score, 1)}` : '—'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="tai2-card">
        <div className="tai2-card-header">
          <h3 className="tai2-card-title">Eksik veri kontrol listesi</h3>
        </div>
        <ul className="tai2-checklist">
          {summary.missingChecklist.map((item) => (
            <li key={item.id} className={cn('tai2-checklist-item', item.done && 'is-done')}>
              {item.done ? (
                <CheckCircle2 className="tai2-checklist-icon is-done" size={16} aria-hidden="true" />
              ) : (
                <Circle className="tai2-checklist-icon" size={16} aria-hidden="true" />
              )}
              <span className="tai2-checklist-label">{item.label}</span>
              <span className="tai2-checklist-priority">{PRIORITY_TR[item.priority]}</span>
              {!item.done && item.actionLabel ? (
                <span className="tai2-checklist-action-hint">{item.actionLabel}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="tai2-overview-columns">
        <div className="tai2-card">
          <div className="tai2-card-header">
            <h3 className="tai2-card-title">
              <ThumbsUp size={16} aria-hidden="true" /> Güçlü yönler
            </h3>
          </div>
          {summary.strengths.length === 0 ? (
            <p className="tai2-muted">Belirgin bir güçlü yön bulunamadı.</p>
          ) : (
            <ul className="tai2-bullet-list is-positive">
              {summary.strengths.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="tai2-card">
          <div className="tai2-card-header">
            <h3 className="tai2-card-title">
              <AlertTriangle size={16} aria-hidden="true" /> Dikkat edilmesi gerekenler
            </h3>
          </div>
          {summary.concerns.length === 0 ? (
            <p className="tai2-muted">Belirgin bir kısıt bulunamadı.</p>
          ) : (
            <ul className="tai2-bullet-list is-negative">
              {summary.concerns.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
