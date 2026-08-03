import type { AnalysisResult } from '../../../api/tarimAi'
import { cn } from '../../../lib/utils'
import {
  asRecord,
  formatDateTr,
  formatFactorItem,
  formatLabel,
  formatMissingValue,
  pick,
  statusTone,
} from '../../../utils/tarimAiFormat'
import { StatusBadge } from '../StatusBadge'

const DATA_SOURCE_STATUS_TR: Record<string, string> = {
  completed: 'Tamamlandı',
  partial: 'Kısmi',
  processing: 'İşleniyor',
  pending: 'Bekliyor',
  queued: 'Kuyrukta',
  failed: 'Başarısız',
  skipped: 'Atlandı',
  missing: 'Veri bulunamadı',
}

const DATA_SOURCE_TYPE_TR: Record<string, string> = {
  cadastral: 'Kadastro',
  remote_sensing: 'Uzaktan algılama',
  elevation_model: 'Yükseklik modeli',
  climate: 'İklim',
  soil: 'Toprak',
  laboratory: 'Laboratuvar',
  terrain: 'Arazi yapısı',
}

const VERIFY_KIND_TR: Record<string, string> = {
  official: 'Doğrulanmış resmi veri',
  remote_sensing: 'Uzaktan algılama',
  model_estimate: 'Model tahmini',
  regional_gridded_estimate: 'Bölgesel tahmin',
  measured: 'Manuel giriş',
  applicant_declared: 'Manuel giriş',
  mock: 'Demo veri',
  moderate: 'Uzaktan algılama',
  good: 'Doğrulanmış resmi veri',
  poor: 'Model tahmini',
  unavailable: 'Veri bulunamadı',
}

const CONFIDENCE_LEVEL_TR: Record<string, string> = {
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
}

function formatDataSourceStatus(value: unknown): string {
  if (typeof value !== 'string' || !value) return formatMissingValue()
  return DATA_SOURCE_STATUS_TR[value] ?? formatLabel(value)
}

function formatDataSourceType(value: unknown): string {
  if (typeof value !== 'string' || !value) return formatMissingValue()
  return DATA_SOURCE_TYPE_TR[value] ?? formatLabel(value)
}

function formatVerificationKind(source: Record<string, unknown>): string {
  const quality = pick(source, 'quality')
  const nature = pick(source, 'dataNature')
  if (typeof nature === 'string' && VERIFY_KIND_TR[nature]) return VERIFY_KIND_TR[nature]
  if (typeof quality === 'string' && VERIFY_KIND_TR[quality]) return VERIFY_KIND_TR[quality]
  if (pick(source, 'isMeasured') === true) return 'Manuel giriş'
  if (pick(source, 'isEstimated') === true) return 'Model tahmini'
  return formatMissingValue()
}

function formatConfidenceCell(source: Record<string, unknown>): string {
  const quality = pick(source, 'quality')
  if (typeof quality === 'string' && VERIFY_KIND_TR[quality]) return VERIFY_KIND_TR[quality]
  return formatDataSourceStatus(pick(source, 'status'))
}

/**
 * "Kaynaklar ve Güven" tab: centralized source table + analysis limitations.
 */
export function SourcesConfidenceTab({ result }: { result: AnalysisResult }) {
  const dataSources = Array.isArray(result.dataSources) ? result.dataSources : []
  const confidence = asRecord(result.confidence)
  const confidenceLevel = pick(confidence, 'level') as string | undefined
  const confidenceExplanation = pick(confidence, 'explanation') as string | undefined
  const limitations = result.limitations ?? []

  return (
    <div className="tai2-sources-tab">
      {confidence ? (
        <section className="tai2-card">
          <div className="tai2-card-header">
            <h3 className="tai2-card-title">Genel veri güveni</h3>
            {confidenceLevel ? (
              <StatusBadge
                label={CONFIDENCE_LEVEL_TR[confidenceLevel] ?? formatLabel(confidenceLevel)}
                tone={statusTone(confidenceLevel)}
              />
            ) : null}
          </div>
          {confidenceExplanation ? (
            <p className="tai2-confidence-explanation">{confidenceExplanation}</p>
          ) : null}
        </section>
      ) : null}

      <section className="tai2-card">
        <div className="tai2-card-header">
          <h3 className="tai2-card-title">Veri kaynakları</h3>
        </div>
        {dataSources.length === 0 ? (
          <p className="tai2-muted">Veri kaynağı bilgisi bulunamadı.</p>
        ) : (
          <div className="tai2-table-wrap">
            <table className="tai2-table">
              <thead>
                <tr>
                  <th>Veri grubu</th>
                  <th>Kaynak</th>
                  <th>Tarih</th>
                  <th>Çözünürlük</th>
                  <th>Doğrulama türü</th>
                  <th>Güven</th>
                  <th>Sınırlama</th>
                </tr>
              </thead>
              <tbody>
                {dataSources.map((raw, index) => {
                  const source = asRecord(raw) ?? {}
                  const status = String(pick(source, 'status') ?? '')
                  return (
                    <tr key={String(pick(source, 'key') ?? index)} className={cn('tai2-source-row')}>
                      <td>{formatDataSourceType(pick(source, 'dataType'))}</td>
                      <td>
                        <strong>{String(pick(source, 'label') ?? pick(source, 'key') ?? '—')}</strong>
                      </td>
                      <td>
                        {pick(source, 'lastUpdatedAt')
                          ? formatDateTr(String(pick(source, 'lastUpdatedAt')), true)
                          : '—'}
                      </td>
                      <td>—</td>
                      <td>{formatVerificationKind(source)}</td>
                      <td>
                        <StatusBadge
                          label={formatConfidenceCell(source)}
                          tone={statusTone(status)}
                        />
                      </td>
                      <td>
                        {pick(source, 'warning')
                          ? String(pick(source, 'warning'))
                          : formatDataSourceStatus(status)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="tai2-card">
        <div className="tai2-card-header">
          <h3 className="tai2-card-title">Analiz sınırlamaları</h3>
        </div>
        {limitations.length === 0 ? (
          <p className="tai2-muted">Bilinen bir sınırlama yok.</p>
        ) : (
          <ul className="tai2-bullet-list is-negative">
            {limitations.map((item, index) => (
              <li key={index}>{formatFactorItem(item)}</li>
            ))}
          </ul>
        )}
        <ul className="tai2-bullet-list" style={{ marginTop: 12 }}>
          <li>İklim verisi parsel içi mikroiklim ölçümü değildir.</li>
          <li>SoilGrids verisi laboratuvar analizinin yerini tutmaz.</li>
          <li>DEM verisi saha ölçümü değildir.</li>
          <li>Uydu verisi bulut ve görüntü tarihi koşullarından etkilenebilir.</li>
          <li>Nihai ürün kararında uzman ve saha doğrulaması gerekir.</li>
        </ul>
      </section>
    </div>
  )
}
