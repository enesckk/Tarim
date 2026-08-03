import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react'
import type { AnalysisResult, AnalysisStatus } from '../../api/tarimAi'
import { cn } from '../../lib/utils'
import {
  formatStepStatus,
  mapStepsToStages,
  satelliteCaptureInfo,
  statusTone,
  type StageStatus,
} from '../../utils/tarimAiFormat'
import { StatusBadge } from './StatusBadge'

const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  waiting: 'Bekliyor',
  processing: 'İşleniyor',
  completed: 'Tamamlandı',
  warning: 'Uyarı',
  error: 'Hata',
}

export function AnalysisProgress({
  status,
  result,
  busy,
  error,
  collapsed = false,
  onToggleCollapse,
}: {
  status: AnalysisStatus | null
  result: AnalysisResult | null
  busy: boolean
  error: string | null
  collapsed?: boolean
  onToggleCollapse?: () => void
}) {
  const [showTechnical, setShowTechnical] = useState(false)

  if (!status && !busy && !error) return null

  const isCompleted = status?.status === 'completed'
  const usable = satelliteCaptureInfo(result).usable
  const usableCount = typeof usable === 'number' ? usable : null

  if (isCompleted && collapsed) {
    return (
      <section className="tai2-card tai2-progress tai2-progress-collapsed">
        <button type="button" className="tai2-progress-collapsed-toggle" onClick={onToggleCollapse}>
          <CheckCircle2 className="tai2-progress-collapsed-icon" size={16} aria-hidden="true" />
          <span>
            Analiz tamamlandı
            {usableCount != null ? ` · ${usableCount} kullanılabilir uydu gözlemi` : ''} · Detayları göster
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </section>
    )
  }

  if (!status && busy) {
    return (
      <section className="tai2-card tai2-progress">
        <div className="tai2-card-header">
          <h2 className="tai2-card-title">Analiz ilerlemesi</h2>
        </div>
        <div className="tai2-progress-head">
          <Loader2 className="tai2-spin" size={16} aria-hidden="true" />
          <span className="tai2-progress-active-step">Analiz başlatılıyor…</span>
        </div>
      </section>
    )
  }

  const progress = Math.min(100, Math.max(0, Math.round(status?.progress ?? 0)))
  const activeStep = status?.steps?.find((step) => step.key === status.currentStep) ?? null
  const stages = mapStepsToStages(status?.steps ?? [])

  return (
    <section className="tai2-card tai2-progress">
      <div className="tai2-card-header">
        <h2 className="tai2-card-title">Analiz ilerlemesi</h2>
        {isCompleted && onToggleCollapse ? (
          <button type="button" className="tai2-link-btn" onClick={onToggleCollapse}>
            Daralt
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="tai2-alert tai2-alert-bad">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="tai2-progress-head">
        <span className="tai2-progress-percent">%{progress}</span>
        {activeStep ? <span className="tai2-progress-active-step">{activeStep.label}</span> : null}
        {busy && !isCompleted ? <Loader2 className="tai2-spin" size={16} aria-hidden="true" /> : null}
      </div>
      <div className="tai2-progress-bar" aria-hidden="true">
        <div className="tai2-progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <ol className="tai2-progress-stages">
        {stages.map((stage, index) => (
          <li key={stage.id} className={cn('tai2-progress-stage', `is-${stage.status}`)}>
            <span className="tai2-progress-stage-index">{index + 1}</span>
            <span className="tai2-progress-stage-label">{stage.label}</span>
            <StatusBadge label={STAGE_STATUS_LABELS[stage.status]} tone={statusTone(stage.status)} />
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="tai2-technical-toggle"
        onClick={() => setShowTechnical((value) => !value)}
        aria-expanded={showTechnical}
      >
        Teknik işlem detaylarını göster
        <ChevronDown className={cn('tai2-chevron', showTechnical && 'is-open')} size={14} aria-hidden="true" />
      </button>

      {showTechnical ? (
        <ul className="tai2-technical-steps">
          {(status?.steps ?? []).map((step) => (
            <li key={step.key} className="tai2-technical-step">
              <span className="tai2-technical-step-label">{step.label || step.key}</span>
              <StatusBadge label={formatStepStatus(step.status)} tone={statusTone(step.status)} />
              {step.error ? <span className="tai2-technical-step-error">{step.error}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
