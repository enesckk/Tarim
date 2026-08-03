import { FileDown, Loader2, RefreshCw } from 'lucide-react'
import type { DemoReadiness } from '../../api/tarimAi'
import { cn } from '../../lib/utils'
import { SystemStatusPopover } from './SystemStatusPopover'

export function AnalysisPageHeader({
  connected,
  readiness,
  health,
  onRefresh,
  onPdf,
  pdfEnabled,
  busy,
  pdfBusy,
}: {
  connected: boolean
  readiness?: DemoReadiness | null
  health?: unknown
  onRefresh: () => void
  onPdf: () => void
  pdfEnabled?: boolean
  busy?: boolean
  pdfBusy?: boolean
}) {
  return (
    <header className="tai2-page-header">
      <div className="tai2-page-header-titles">
        <h1 className="tai2-page-title">AI Destekli Arazi Analizi</h1>
        <p className="tai2-page-subtitle">
          Uydu görüntüleri, arazi yapısı, iklim, toprak ve saha verileri kullanılarak parsel bazlı ön
          değerlendirme oluşturulur.
        </p>
      </div>
      <div className="tai2-page-header-actions">
        <SystemStatusPopover connected={connected} readiness={readiness} health={health} mode={readiness?.mode} />

        <button
          type="button"
          className="tai2-btn tai2-btn-ghost"
          onClick={onRefresh}
          disabled={busy}
          aria-label="Analizi yenile"
        >
          <RefreshCw className={cn('tai2-btn-icon', busy && 'tai2-spin')} size={16} aria-hidden="true" />
          Analizi yenile
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
      </div>
    </header>
  )
}
