import { AlertTriangle, ClipboardList } from 'lucide-react'

/**
 * Critical decision note strip above the tabs. No expert-review CTA —
 * that workflow is not part of this AMS surface.
 */
export function CriticalDecisionBanner({
  note,
  onShowMissing,
  onFieldSurvey,
}: {
  note: string
  onShowMissing: () => void
  onFieldSurvey?: () => void
}) {
  if (!note) return null

  return (
    <div className="tai2-critical-banner" role="alert">
      <AlertTriangle className="tai2-critical-banner-icon" size={18} aria-hidden="true" />
      <div className="tai2-critical-banner-copy">
        <strong className="tai2-critical-banner-title">Kritik karar notu</strong>
        <p className="tai2-critical-banner-text">{note}</p>
      </div>
      <div className="tai2-critical-banner-actions">
        <button type="button" className="tai2-btn tai2-btn-ghost tai2-btn-sm" onClick={onShowMissing}>
          <ClipboardList className="tai2-btn-icon" size={14} aria-hidden="true" />
          Eksikleri görüntüle
        </button>
        {onFieldSurvey ? (
          <button type="button" className="tai2-btn tai2-btn-ghost tai2-btn-sm" onClick={onFieldSurvey}>
            Saha kontrolü oluştur
          </button>
        ) : null}
      </div>
    </div>
  )
}
