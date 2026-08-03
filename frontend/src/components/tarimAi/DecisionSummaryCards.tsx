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
export function DecisionSummaryCards({ summary }: { summary: DecisionSummary }) {
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

      <article className="tai2-decision-card">
        <div className="tai2-decision-card-icon">
          <Sprout size={18} aria-hidden="true" />
        </div>
        <div className="tai2-decision-card-body">
          <span className="tai2-decision-card-label">En uygun ürün</span>
          {summary.topCrop ? (
            <>
              <div className="tai2-decision-card-score">
                <strong>{summary.topCrop.name}</strong>
              </div>
              {summary.topCrop.score != null ? (
                <span className="tai2-decision-card-subvalue">Skor: {formatNumber(summary.topCrop.score, 1)}</span>
              ) : null}
              <p className="tai2-decision-card-blurb">{summary.topCrop.blurb}</p>
            </>
          ) : (
            <p className="tai2-decision-card-blurb tai2-muted">Ürün önerisi yok</p>
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
