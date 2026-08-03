import { FileDown, Loader2, Plus, RefreshCw } from 'lucide-react'
import type { DecisionSummary } from '../../utils/tarimAiDecision'
import { cn } from '../../lib/utils'
import { StatusBadge } from './StatusBadge'

export function AnalysisResultHeader({
  summary,
  sticky,
  onPdf,
  onRefresh,
  onNewAnalysis,
  pdfEnabled,
  pdfBusy,
}: {
  summary: DecisionSummary
  sticky?: boolean
  onPdf: () => void
  onRefresh: () => void
  onNewAnalysis: () => void
  pdfEnabled?: boolean
  pdfBusy?: boolean
}) {
  const metaParts = [summary.locationLine, summary.areaLine, summary.analysisDate].filter(
    (part): part is string => Boolean(part),
  )

  return (
    <header className={cn('tai2-result-header', sticky && 'is-sticky')}>
      <div className="tai2-result-header-info">
        <h2 className="tai2-result-header-title">{summary.parcelTitle}</h2>
        {metaParts.length ? <p className="tai2-result-header-meta">{metaParts.join(' · ')}</p> : null}
        <div className="tai2-result-header-badges">
          {summary.badges.map((badge) => (
            <StatusBadge key={badge.label} label={badge.label} tone={badge.tone} />
          ))}
        </div>
      </div>

      <div className="tai2-result-header-actions">
        <button
          type="button"
          className="tai2-btn tai2-btn-primary"
          onClick={onNewAnalysis}
          aria-label="Yeni analiz başlat"
        >
          <Plus className="tai2-btn-icon" size={16} aria-hidden="true" />
          Yeni analiz
        </button>

        <button
          type="button"
          className="tai2-btn tai2-btn-secondary"
          onClick={onPdf}
          disabled={!pdfEnabled || pdfBusy}
          aria-label="PDF raporu indir"
        >
          {pdfBusy ? (
            <Loader2 className="tai2-btn-icon tai2-spin" size={16} aria-hidden="true" />
          ) : (
            <FileDown className="tai2-btn-icon" size={16} aria-hidden="true" />
          )}
          {pdfBusy ? 'İndiriliyor…' : 'PDF raporu indir'}
        </button>

        <button
          type="button"
          className="tai2-btn tai2-btn-ghost"
          onClick={onRefresh}
          aria-label="Analizi yenile"
        >
          <RefreshCw className="tai2-btn-icon" size={16} aria-hidden="true" />
          Analizi yenile
        </button>
      </div>
    </header>
  )
}
