import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type AnalysisTabId = 'overview' | 'satellite' | 'climate' | 'crops' | 'sources'

const TABS: Array<{ id: AnalysisTabId; label: string }> = [
  { id: 'overview', label: 'Genel Bakış' },
  { id: 'satellite', label: 'Uydu ve Arazi' },
  { id: 'climate', label: 'İklim ve Toprak' },
  { id: 'crops', label: 'Ürün Önerileri' },
  { id: 'sources', label: 'Kaynaklar ve Güven' },
]

/**
 * Result-page tab strip. Only renders the tab chrome + a single tabpanel
 * wrapper; the parent decides which tab's content to pass in as `children`
 * based on `active`.
 */
export function AnalysisTabs({
  active,
  onChange,
  children,
}: {
  active: AnalysisTabId
  onChange: (tab: AnalysisTabId) => void
  children?: ReactNode
}) {
  const tabRefs = useRef<Partial<Record<AnalysisTabId, HTMLButtonElement | null>>>({})

  function focusTabAt(index: number) {
    const nextIndex = (index + TABS.length) % TABS.length
    const nextTab = TABS[nextIndex]
    onChange(nextTab.id)
    tabRefs.current[nextTab.id]?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = TABS.findIndex((tab) => tab.id === active)
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusTabAt(currentIndex + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusTabAt(currentIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusTabAt(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusTabAt(TABS.length - 1)
    }
  }

  return (
    <div className="tai2-tabs">
      <div className="tai2-tabs-scroll">
        <div
          role="tablist"
          aria-label="Analiz sonucu sekmeleri"
          className="tai2-tabs-list"
          onKeyDown={onKeyDown}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el
              }}
              type="button"
              role="tab"
              id={`tai2-tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`tai2-tabpanel-${tab.id}`}
              tabIndex={active === tab.id ? 0 : -1}
              className={cn('tai2-tab', active === tab.id && 'is-active')}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`tai2-tabpanel-${active}`}
        aria-labelledby={`tai2-tab-${active}`}
        className="tai2-tabs-panel"
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  )
}
