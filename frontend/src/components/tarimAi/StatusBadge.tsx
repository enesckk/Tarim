import type { Tone } from '../../utils/tarimAiFormat'
import { cn } from '../../lib/utils'

export function StatusBadge({ label, tone = 'idle' }: { label: string; tone?: Tone }) {
  return (
    <span className={cn('tai2-badge', `tai2-badge-${tone}`)}>
      {tone === 'ok' ? (
        <span className="tai2-badge-dot" aria-hidden="true">
          ●
        </span>
      ) : null}
      {label}
    </span>
  )
}
