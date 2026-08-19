import { useState } from 'react'
import { ChevronDown, Droplets, Gauge, Info, ShieldCheck, Sprout } from 'lucide-react'
import type { DecisionSummary } from '../../utils/tarimAiDecision'
import { formatNumber } from '../../utils/tarimAiFormat'
import { cn } from '../../lib/utils'
import { StatusBadge } from './StatusBadge'

const HOW_SCORE_TEXT =
  'Skor; iklim, toprak, su, arazi ve uydu göstergelerinin birlikte değerlendirilmesiyle oluşturulmuştur. ' +
  'Su verisi bulunmadığı durumlarda sonuç orta güven düzeyinde kalır. Kesin yüzde ağırlıklar paylaşılmaz; ' +
  'skor ön değerlendirme amaçlıdır.'

function ScoreExplanation() {
  const [open, setOpen] = useState(false)
  return (
    <div className="tai2-how-calculated">
      <button
        type="button"
        className="tai2-how-calculated-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Info size={13} aria-hidden="true" />
        Nasıl hesaplandı?
        <ChevronDown className={cn('tai2-chevron', open && 'is-open')} size={13} aria-hidden="true" />
      </button>
      {open ? <p className="tai2-how-calculated-text">{HOW_SCORE_TEXT}</p> : null}
    </div>
  )
}

/**
 * The four top-of-page decision cards: overall land suitability, top crop pick,
 * irrigation-water status, and data-confidence level. Purely presentational —
 * all numbers/labels come from the already-derived DecisionSummary.
 */
import type { AnalysisResult } from '../../api/tarimAi'
import { Trees, Wheat } from 'lucide-react'

const PERENNIAL_KEYWORDS = [
  'pistachio', 'fıstık', 'olive', 'zeytin', 'almond', 'badem', 'walnut', 'ceviz',
  'grape', 'bağ', 'üzüm', 'pomegranate', 'nar', 'fig', 'incir', 'mulberry', 'dut',
  'sumac', 'sumak', 'apple', 'elma', 'pear', 'armut', 'apricot', 'kayısı',
  'peach', 'şeftali', 'plum', 'erik', 'cherry', 'kiraz', 'sour_cherry', 'vişne',
]

function isPerennial(cropId?: string, name?: string): boolean {
  const s = ((cropId || '') + ' ' + (name || '')).toLowerCase()
  return PERENNIAL_KEYWORDS.some((kw) => s.includes(kw))
}

export function DecisionSummaryCards({
  summary,
  result,
}: {
  summary: DecisionSummary
  result?: AnalysisResult | null
}) {
  const allCrops = result?.cropRecommendations ?? []
  const topPerennial = allCrops.find((c) => isPerennial(c.cropId, c.cropName))
  const topSeasonal = allCrops.find((c) => !isPerennial(c.cropId, c.cropName))
  return (
    <div className="tai2-decision-cards">
      <article className={cn('tai2-decision-card', `tai2-decision-card-${summary.usabilityTone}`)}>
        <div className="tai2-decision-card-icon">
          <Gauge size={18} aria-hidden="true" />
        </div>
        <div className="tai2-decision-card-body">
          <span className="tai2-decision-card-label">Genel uygunluk</span>
          <div className="tai2-decision-card-score">
            <strong>{summary.usabilityScore != null ? formatNumber(summary.usabilityScore, 0) : '—'}</strong>
            <span className="tai2-decision-card-score-max">/100</span>
          </div>
          <StatusBadge label={summary.usabilityStatus} tone={summary.usabilityTone} />
          <p className="tai2-decision-card-blurb">{summary.usabilityBlurb}</p>
          <ScoreExplanation />
        </div>
      </article>

      <article className="tai2-decision-card" style={{ minWidth: '240px' }}>
        <div className="tai2-decision-card-icon">
          <Trees size={18} aria-hidden="true" style={{ color: '#16a34a' }} />
        </div>
        <div className="tai2-decision-card-body">
          <span className="tai2-decision-card-label" style={{ color: '#166534', fontWeight: 700 }}>
            🌳 Çok Yıllık Öneri
          </span>
          {topPerennial ? (
            <>
              <div className="tai2-decision-card-score" style={{ color: '#14532d' }}>
                <strong>{topPerennial.cropName}</strong>
              </div>
              <span className="tai2-decision-card-subvalue" style={{ color: '#15803d', fontWeight: 700 }}>
                Skor: %{formatNumber(topPerennial.score, 1)} (Uzun Vadeli)
              </span>
              <p className="tai2-decision-card-blurb" style={{ fontSize: '11px', marginTop: '4px' }}>
                Meyve, Ağaç & Bağ yatırımı için en uygun çeşit.
              </p>
            </>
          ) : (
            <p className="tai2-decision-card-blurb tai2-muted">Çok yıllık öneri yok</p>
          )}
        </div>
      </article>

      <article className="tai2-decision-card" style={{ minWidth: '240px' }}>
        <div className="tai2-decision-card-icon">
          <Wheat size={18} aria-hidden="true" style={{ color: '#0284c7' }} />
        </div>
        <div className="tai2-decision-card-body">
          <span className="tai2-decision-card-label" style={{ color: '#075985', fontWeight: 700 }}>
            🌾 Dönemlik Öneri
          </span>
          {topSeasonal ? (
            <>
              <div className="tai2-decision-card-score" style={{ color: '#0c4a6e' }}>
                <strong>{topSeasonal.cropName}</strong>
              </div>
              <span className="tai2-decision-card-subvalue" style={{ color: '#0284c7', fontWeight: 700 }}>
                Skor: %{formatNumber(topSeasonal.score, 1)} (Cari Sezon)
              </span>
              <p className="tai2-decision-card-blurb" style={{ fontSize: '11px', marginTop: '4px' }}>
                Tarla, hububat & sebze için en yüksek verimli çeşit.
              </p>
            </>
          ) : (
            <p className="tai2-decision-card-blurb tai2-muted">Dönemlik öneri yok</p>
          )}
        </div>
      </article>

      <article
        className={cn(
          'tai2-decision-card',
          `tai2-decision-card-${summary.waterTone}`,
          summary.waterStatus === 'unverified' && 'is-critical',
        )}
      >
        <div className="tai2-decision-card-icon">
          <Droplets size={18} aria-hidden="true" />
        </div>
        <div className="tai2-decision-card-body">
          <span className="tai2-decision-card-label">Su durumu</span>
          <div className="tai2-decision-card-score tai2-decision-card-score-text">{summary.waterTitle}</div>
          <p className="tai2-decision-card-blurb">{summary.waterBlurb}</p>
        </div>
      </article>

      <article className={cn('tai2-decision-card', `tai2-decision-card-${summary.confidenceTone}`)}>
        <div className="tai2-decision-card-icon">
          <ShieldCheck size={18} aria-hidden="true" />
        </div>
        <div className="tai2-decision-card-body">
          <span className="tai2-decision-card-label">Veri güveni</span>
          <div className="tai2-decision-card-score tai2-decision-card-score-text">{summary.confidenceLevel}</div>
          <p className="tai2-decision-card-blurb">{summary.confidenceBlurb}</p>
        </div>
      </article>
    </div>
  )
}
