import type { AnalysisResult } from '../../../api/tarimAi'
import {
  asRecord,
  firstNumber,
  formatMissingValue,
  formatNature,
  formatNumber,
  formatOrganicCarbonMeaning,
  formatPhMeaning,
  formatRisk,
  formatSource,
  pick,
} from '../../../utils/tarimAiFormat'

/**
 * "İklim ve Toprak" tab. Climate KPIs come from the NASA POWER climatology
 * block; soil KPIs from the SoilGrids model estimate. Neither section ever
 * fabricates a number — missing values render as "—" (or, for texture where
 * all three components are missing, an explicit "veri bulunamadı" message).
 */
export function ClimateSoilTab({ result }: { result: AnalysisResult }) {
  const climate = asRecord(result.climate)
  const temperature = asRecord(pick(climate, 'temperature'))
  const precipitation = asRecord(pick(climate, 'precipitation'))
  const dateRange = asRecord(pick(climate, 'dateRange'))
  const climatologyYears = firstNumber(pick(dateRange, 'years'))

  const soil = asRecord(result.soil)
  const properties = asRecord(pick(soil, 'properties'))
  const phRecord = asRecord(pick(properties, 'ph'))
  const organicRecord = asRecord(pick(properties, 'organicCarbon'))
  const clayRecord = asRecord(pick(properties, 'clayPercent', 'clay'))
  const sandRecord = asRecord(pick(properties, 'sandPercent', 'sand'))
  const siltRecord = asRecord(pick(properties, 'siltPercent', 'silt'))

  const phValue = firstNumber(pick(phRecord, 'value', 'mean', 'average'))
  const organicValue = firstNumber(pick(organicRecord, 'value', 'mean', 'average'))
  const clayValue = firstNumber(pick(clayRecord, 'value', 'mean', 'average'))
  const sandValue = firstNumber(pick(sandRecord, 'value', 'mean', 'average'))
  const siltValue = firstNumber(pick(siltRecord, 'value', 'mean', 'average'))
  const textureAllMissing = clayValue == null && sandValue == null && siltValue == null

  const depthLayers = Array.isArray(pick(soil, 'depthLayers')) ? (pick(soil, 'depthLayers') as unknown[]) : []

  return (
    <div className="tai2-climate-soil-tab">
      <section className="tai2-card">
        <div className="tai2-card-header">
          <h3 className="tai2-card-title">İklim</h3>
        </div>
        <p className="tai2-source-line">
          Kaynak: <strong>{formatSource(pick(climate, 'source'))}</strong>
          {pick(climate, 'dataNature') ? <> · {formatNature(pick(climate, 'dataNature'))}</> : null}
        </p>
        <dl className="tai2-kpi-grid">
          <div className="tai2-kpi">
            <dt>Yıllık ortalama sıcaklık</dt>
            <dd>{formatNumber(firstNumber(pick(temperature, 'annualMeanC')), 1, ' °C')}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Yaz ortalaması</dt>
            <dd>{formatNumber(firstNumber(pick(temperature, 'summerMeanC')), 1, ' °C')}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Kış ortalaması</dt>
            <dd>{formatNumber(firstNumber(pick(temperature, 'winterMeanC')), 1, ' °C')}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Büyüme sezonu ortalaması</dt>
            <dd>{formatNumber(firstNumber(pick(temperature, 'growingSeasonMeanC')), 1, ' °C')}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Don riski</dt>
            <dd>{formatRisk(pick(temperature, 'frostRisk'))}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Aşırı sıcak riski</dt>
            <dd>{formatRisk(pick(temperature, 'extremeHeatRisk'))}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>
              {climatologyYears
                ? `${climatologyYears} yıllık tahmini minimum sıcaklık`
                : 'Tahmini minimum sıcaklık'}
            </dt>
            <dd>{formatNumber(firstNumber(pick(temperature, 'annualMinC')), 1, ' °C')}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>
              {climatologyYears
                ? `${climatologyYears} yıllık tahmini maksimum sıcaklık`
                : 'Tahmini maksimum sıcaklık'}
            </dt>
            <dd>{formatNumber(firstNumber(pick(temperature, 'annualMaxC')), 1, ' °C')}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Yıllık yağış</dt>
            <dd>{formatNumber(firstNumber(pick(precipitation, 'annualTotalMm')), 0, ' mm')}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Yaz yağışı</dt>
            <dd>{formatNumber(firstNumber(pick(precipitation, 'summerTotalMm')), 0, ' mm')}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Büyüme sezonu yağışı</dt>
            <dd>{formatNumber(firstNumber(pick(precipitation, 'growingSeasonTotalMm')), 0, ' mm')}</dd>
          </div>
          <div className="tai2-kpi">
            <dt>Yağış mevsimselliği</dt>
            <dd>{formatRisk(pick(precipitation, 'seasonality'))}</dd>
          </div>
        </dl>
      </section>

      <section className="tai2-card">
        <div className="tai2-card-header">
          <h3 className="tai2-card-title">Toprak</h3>
        </div>
        <p className="tai2-source-line">
          Kaynak: <strong>{formatSource(pick(soil, 'source'))}</strong>
          {pick(soil, 'dataNature') ? <> · {formatNature(pick(soil, 'dataNature'))}</> : null}
        </p>
        <dl className="tai2-kpi-grid">
          <div className="tai2-kpi">
            <dt>pH</dt>
            <dd>{formatNumber(phValue, 2)}</dd>
            {phValue != null ? <span className="tai2-kpi-meaning">{formatPhMeaning(phValue)}</span> : null}
          </div>
          <div className="tai2-kpi">
            <dt>Organik karbon</dt>
            <dd>{formatNumber(organicValue, 1, ' g/kg')}</dd>
            {organicValue != null ? (
              <span className="tai2-kpi-meaning">{formatOrganicCarbonMeaning(organicValue)}</span>
            ) : null}
          </div>
          <div className="tai2-kpi">
            <dt>Kil</dt>
            {textureAllMissing ? (
              <dd className="tai2-muted">{formatMissingValue()}</dd>
            ) : (
              <dd>{formatNumber(clayValue, 0, '%')}</dd>
            )}
          </div>
          <div className="tai2-kpi">
            <dt>Kum</dt>
            {textureAllMissing ? (
              <dd className="tai2-muted">{formatMissingValue()}</dd>
            ) : (
              <dd>{formatNumber(sandValue, 0, '%')}</dd>
            )}
          </div>
          <div className="tai2-kpi">
            <dt>Silt</dt>
            {textureAllMissing ? (
              <dd className="tai2-muted">{formatMissingValue()}</dd>
            ) : (
              <dd>{formatNumber(siltValue, 0, '%')}</dd>
            )}
          </div>
        </dl>
        {textureAllMissing ? (
          <p className="tai2-muted">
            Bu parsel için toprak bünyesi dağılımı alınamadı. Laboratuvar analizi önerilir.
          </p>
        ) : null}
        {depthLayers.length > 0 ? (
          <div className="tai2-depth-layers">
            <span className="tai2-depth-layers-label">Derinlik katmanları</span>
            <div className="tai2-depth-layers-chips">
              {depthLayers.map((layer, index) => (
                <span key={index} className="tai2-chip">
                  {String(layer)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
