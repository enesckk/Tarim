import { Fragment, useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import type { AnalysisResult, CropRecommendationItem } from '../../../api/tarimAi'
import { cn } from '../../../lib/utils'
import {
  asRecord,
  formatFactorItem,
  formatNumber,
  formatRisk,
  normalizeCropRow,
  pick,
  statusTone,
  type Tone,
} from '../../../utils/tarimAiFormat'
import { StatusBadge } from '../StatusBadge'

const HOW_CALCULATED_TEXT =
  'Skor; iklim (sıcaklık, yağış), toprak (pH, tekstür, organik madde), arazi eğimi ve — girildiyse — su kalitesi ' +
  'gibi verilerin bu ürünün agronomik gereksinimleriyle karşılaştırılmasından hesaplanır. Alt bileşenlerin kesin ' +
  'ağırlıkları paylaşılmamaktadır; skor kesin bir garanti değil, ürünleri göreli olarak sıralamak için kullanılan ' +
  'bir araçtır. Saha ve laboratuvar doğrulaması olmadan nihai karar için kullanılmamalıdır.'

function stringListFrom(item: CropRecommendationItem, ...keys: string[]): string[] {
  const value = pick(asRecord(item), ...keys)
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => formatFactorItem(entry))
    .filter((entry): entry is string => Boolean(entry))
}

function ScoreBar({ score, tone }: { score: number | undefined; tone: Tone }) {
  const clamped = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0
  return (
    <div className="tai2-score-bar" role="img" aria-label={typeof score === 'number' ? `Skor ${score}` : 'Skor yok'}>
      <div className={cn('tai2-score-bar-fill', `tai2-score-bar-fill-${tone}`)} style={{ width: `${clamped}%` }} />
    </div>
  )
}

function HowCalculatedToggle() {
  const [open, setOpen] = useState(false)
  return (
    <div className="tai2-how-calculated">
      <button type="button" className="tai2-how-calculated-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Info size={13} aria-hidden="true" />
        Nasıl hesaplandı?
        <ChevronDown className={cn('tai2-chevron', open && 'is-open')} size={13} aria-hidden="true" />
      </button>
      {open ? <p className="tai2-how-calculated-text">{HOW_CALCULATED_TEXT}</p> : null}
    </div>
  )
}

function CropDetail({ item }: { item: CropRecommendationItem }) {
  const positive = stringListFrom(item, 'positiveFactors')
  const limiting = stringListFrom(item, 'limitingFactors')
  const critical = stringListFrom(item, 'criticalFailures')
  const missingValidations = stringListFrom(item, 'missingValidations')
  const explanation = typeof item.explanation === 'string' ? item.explanation : ''

  return (
    <div className="tai2-crop-detail">
      {explanation ? <p className="tai2-crop-detail-explanation">{explanation}</p> : null}
      {critical.length > 0 ? (
        <div className="tai2-compact-factor-block">
          <h4>Kritik eksiklikler</h4>
          <ul className="tai2-compact-list is-limiting">
            {critical.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {positive.length > 0 ? (
        <div className="tai2-compact-factor-block">
          <h4>Olumlu sinyaller</h4>
          <ul className="tai2-compact-list is-positive">
            {positive.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {limiting.length > 0 ? (
        <div className="tai2-compact-factor-block">
          <h4>Sınırlayıcı etkenler</h4>
          <ul className="tai2-compact-list is-limiting">
            {limiting.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {missingValidations.length > 0 ? (
        <div className="tai2-compact-factor-block">
          <h4>Saha doğrulaması gereken noktalar</h4>
          <ul className="tai2-compact-list">
            {missingValidations.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <HowCalculatedToggle />
    </div>
  )
}

/**
 * "Ürün Önerileri" tab: top-3 crops as cards, the rest as a compact table.
 * Every row/card can expand to show the underlying positive/limiting factors
 * and a static, honest "how is this calculated" explanation — no invented
 * percentages or weights.
 */
export function CropRecommendationsTab({
  result,
  plantingByCropId,
}: {
  result: AnalysisResult
  plantingByCropId?: Record<string, string>
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const items = result.cropRecommendations ?? []

  if (items.length === 0) {
    return (
      <div className="tai2-crops-tab">
        <p className="tai2-muted">Ürün önerisi yok.</p>
      </div>
    )
  }

  const topThree = items.slice(0, 3)
  const rest = items.slice(3)

  return (
    <div className="tai2-crops-tab">
      <div className="tai2-top-crop-cards">
        {topThree.map((item, index) => {
          const row = normalizeCropRow(item, index)
          const tone = statusTone(row.classification)
          const planting = row.id ? plantingByCropId?.[row.id] : undefined
          const isExpanded = expandedId === row.id
          return (
            <article key={`${row.id}-${row.rank}`} className="tai2-crop-card">
              <div className="tai2-crop-card-head">
                <span className="tai2-crop-card-rank">#{row.rank}</span>
                <h4 className="tai2-crop-card-name">{row.name}</h4>
              </div>
              {row.classification ? <StatusBadge label={formatRisk(row.classification)} tone={tone} /> : null}
              <ScoreBar score={row.score} tone={tone} />
              <span className="tai2-crop-card-score-value">
                {typeof row.score === 'number' ? formatNumber(row.score, 1) : '—'}
              </span>
              {planting ? <p className="tai2-crop-card-planting">Ekim dönemi: {planting}</p> : null}
              <p className="tai2-crop-card-note">{row.note}</p>
              <button
                type="button"
                className="tai2-crop-card-expand-toggle"
                onClick={() => setExpandedId(isExpanded ? null : row.id)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? 'Detayı gizle' : 'Detayı göster'}
                <ChevronDown className={cn('tai2-chevron', isExpanded && 'is-open')} size={14} aria-hidden="true" />
              </button>
              {isExpanded ? <CropDetail item={item} /> : null}
            </article>
          )
        })}
      </div>

      {rest.length > 0 ? (
        <div className="tai2-card tai2-crops-table-card">
          <div className="tai2-card-header">
            <h3 className="tai2-card-title">Diğer ürün önerileri</h3>
          </div>
          <div className="tai2-table-wrap">
            <table className="tai2-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ürün</th>
                  <th>Skor</th>
                  <th>Sınıf</th>
                  <th>Ekim dönemi</th>
                  <th aria-label="Detay" />
                </tr>
              </thead>
              <tbody>
                {rest.map((item, index) => {
                  const row = normalizeCropRow(item, index + 3)
                  const tone = statusTone(row.classification)
                  const planting = row.id ? plantingByCropId?.[row.id] : undefined
                  const isExpanded = expandedId === row.id
                  return (
                    <Fragment key={`${row.id}-${row.rank}`}>
                      <tr className={cn('tai2-crop-row', isExpanded && 'is-expanded')}>
                        <td>{row.rank}</td>
                        <td>
                          <strong>{row.name}</strong>
                          <ScoreBar score={row.score} tone={tone} />
                        </td>
                        <td>{typeof row.score === 'number' ? formatNumber(row.score, 1) : '—'}</td>
                        <td>{row.classification ? <StatusBadge label={formatRisk(row.classification)} tone={tone} /> : '—'}</td>
                        <td>{planting ?? '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="tai2-icon-btn"
                            onClick={() => setExpandedId(isExpanded ? null : row.id)}
                            aria-expanded={isExpanded}
                            aria-label="Detayı göster"
                          >
                            <ChevronDown className={cn('tai2-chevron', isExpanded && 'is-open')} size={16} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="tai2-crop-row-detail">
                          <td colSpan={6}>
                            <CropDetail item={item} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
