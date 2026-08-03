import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { DemoReadiness } from '../../api/tarimAi'
import { cn } from '../../lib/utils'
import { deriveSystemStatus, type SystemStatusRow } from '../../utils/tarimAiDecision'

function formatRelativeCheckTime(checkedAtMs: number): string {
  const diffSec = Math.max(0, Math.round((Date.now() - checkedAtMs) / 1000))
  if (diffSec < 10) return 'az önce'
  if (diffSec < 60) return `${diffSec} sn önce`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin} dk önce`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour} sa önce`
  return `${Math.round(diffHour / 24)} gün önce`
}

/** Small clickable connection indicator ("● Sistem aktif" / "Kısmi hizmet" / "Bağlantı yok") with a details popover. */
export function SystemStatusPopover({
  connected,
  readiness,
  health,
  mode,
}: {
  connected: boolean
  readiness?: DemoReadiness | null
  health?: unknown
  mode?: string
}) {
  const [open, setOpen] = useState(false)
  const [checkedAt, setCheckedAt] = useState(() => Date.now())
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Bump "last checked" whenever the underlying health/readiness data actually changes.
  useEffect(() => {
    setCheckedAt(Date.now())
  }, [connected, readiness, health, mode])

  useEffect(() => {
    if (!open) return undefined
    function onDocClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const summary = deriveSystemStatus(connected, readiness, health, mode)
  const rows: SystemStatusRow[] = [
    summary.serviceRow,
    summary.satelliteRow,
    summary.tkgmRow,
    summary.soilRow,
    { label: 'Son bağlantı kontrolü', value: formatRelativeCheckTime(checkedAt), tone: 'idle' },
    { label: 'Çalışma modu', value: summary.workingMode ?? '—', tone: 'idle' },
  ]

  return (
    <div className="tai2-status-popover" ref={containerRef}>
      <button
        type="button"
        className={cn('tai2-status-trigger', `tai2-status-trigger-${summary.tone}`)}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="tai2-status-dot" aria-hidden="true">
          ●
        </span>
        <span className="tai2-status-trigger-label">{summary.label}</span>
        <ChevronDown className={cn('tai2-status-chevron', open && 'is-open')} size={14} aria-hidden="true" />
      </button>
      {open ? (
        <div className="tai2-status-panel" role="dialog" aria-label="Sistem durumu">
          <dl className="tai2-status-list">
            {rows.map((row) => (
              <div key={row.label} className="tai2-status-row">
                <dt className="tai2-status-row-label">{row.label}</dt>
                <dd className={cn('tai2-status-row-value', `tai2-status-row-value-${row.tone}`)}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  )
}
