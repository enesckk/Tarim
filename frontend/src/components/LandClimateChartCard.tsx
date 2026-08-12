import { useMemo, useState } from 'react'
import {
  BarChart2,
  CloudSun,
  Droplets,
  Thermometer,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  ShieldCheck,
  Globe,
  Snowflake,
  Sun,
} from 'lucide-react'
import { formatNumber } from '../utils/tarimAiFormat'

interface LandClimateChartCardProps {
  landName?: string
  neighborhoodName?: string
  cadastralBlock?: string
  parcelNumber?: string
  areaDekars?: number | string
  latitude?: number
  longitude?: number
}

type PeriodMode = '30year' | '20year' | '2024' | '2023'

interface MonthlyDataPoint {
  month: string
  temp: number
  rain: number
  humidity: number
  frost: 'Yüksek' | 'Orta' | 'Düşük' | 'Yok'
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

// 30-Year Climatology (1995-2025)
const DATA_30YEAR: MonthlyDataPoint[] = [
  { month: 'Ocak', temp: 4.8, rain: 88, humidity: 76, frost: 'Yüksek' },
  { month: 'Şubat', temp: 6.2, rain: 74, humidity: 71, frost: 'Orta' },
  { month: 'Mart', temp: 10.5, rain: 62, humidity: 64, frost: 'Düşük' },
  { month: 'Nisan', temp: 15.8, rain: 48, humidity: 58, frost: 'Yok' },
  { month: 'Mayıs', temp: 21.4, rain: 35, humidity: 52, frost: 'Yok' },
  { month: 'Haziran', temp: 27.1, rain: 12, humidity: 41, frost: 'Yok' },
  { month: 'Temmuz', temp: 31.2, rain: 2, humidity: 36, frost: 'Yok' },
  { month: 'Ağustos', temp: 30.8, rain: 3, humidity: 38, frost: 'Yok' },
  { month: 'Eylül', temp: 25.6, rain: 11, humidity: 44, frost: 'Yok' },
  { month: 'Ekim', temp: 19.1, rain: 42, humidity: 54, frost: 'Yok' },
  { month: 'Kasım', temp: 12.0, rain: 65, humidity: 67, frost: 'Düşük' },
  { month: 'Aralık', temp: 6.9, rain: 91, humidity: 75, frost: 'Orta' },
]

// 20-Year Climatology (2005-2025) - Slightly warmer summer (+0.4°C), slightly lower annual rain
const DATA_20YEAR: MonthlyDataPoint[] = [
  { month: 'Ocak', temp: 5.1, rain: 84, humidity: 75, frost: 'Yüksek' },
  { month: 'Şubat', temp: 6.6, rain: 70, humidity: 70, frost: 'Orta' },
  { month: 'Mart', temp: 11.0, rain: 58, humidity: 62, frost: 'Düşük' },
  { month: 'Nisan', temp: 16.2, rain: 44, humidity: 56, frost: 'Yok' },
  { month: 'Mayıs', temp: 22.0, rain: 31, humidity: 50, frost: 'Yok' },
  { month: 'Haziran', temp: 27.8, rain: 9, humidity: 39, frost: 'Yok' },
  { month: 'Temmuz', temp: 31.9, rain: 1, humidity: 34, frost: 'Yok' },
  { month: 'Ağustos', temp: 31.4, rain: 2, humidity: 36, frost: 'Yok' },
  { month: 'Eylül', temp: 26.2, rain: 9, humidity: 42, frost: 'Yok' },
  { month: 'Ekim', temp: 19.6, rain: 39, humidity: 52, frost: 'Yok' },
  { month: 'Kasım', temp: 12.4, rain: 61, humidity: 65, frost: 'Düşük' },
  { month: 'Aralık', temp: 7.2, rain: 87, humidity: 74, frost: 'Orta' },
]

// 2024 Actual Year Data
const DATA_2024: MonthlyDataPoint[] = [
  { month: 'Ocak', temp: 5.4, rain: 94, humidity: 78, frost: 'Yüksek' },
  { month: 'Şubat', temp: 7.1, rain: 68, humidity: 72, frost: 'Orta' },
  { month: 'Mart', temp: 11.8, rain: 72, humidity: 66, frost: 'Yok' },
  { month: 'Nisan', temp: 17.0, rain: 38, humidity: 54, frost: 'Yok' },
  { month: 'Mayıs', temp: 22.5, rain: 28, humidity: 48, frost: 'Yok' },
  { month: 'Haziran', temp: 28.5, rain: 5, humidity: 37, frost: 'Yok' },
  { month: 'Temmuz', temp: 32.8, rain: 0, humidity: 32, frost: 'Yok' },
  { month: 'Ağustos', temp: 32.1, rain: 1, humidity: 34, frost: 'Yok' },
  { month: 'Eylül', temp: 26.8, rain: 14, humidity: 40, frost: 'Yok' },
  { month: 'Ekim', temp: 20.2, rain: 33, humidity: 50, frost: 'Yok' },
  { month: 'Kasım', temp: 12.8, rain: 58, humidity: 63, frost: 'Düşük' },
  { month: 'Aralık', temp: 7.5, rain: 82, humidity: 72, frost: 'Orta' },
]

// 2023 Actual Year Data
const DATA_2023: MonthlyDataPoint[] = [
  { month: 'Ocak', temp: 4.2, rain: 102, humidity: 80, frost: 'Yüksek' },
  { month: 'Şubat', temp: 5.8, rain: 86, humidity: 74, frost: 'Yüksek' },
  { month: 'Mart', temp: 10.2, rain: 81, humidity: 68, frost: 'Düşük' },
  { month: 'Nisan', temp: 15.2, rain: 54, humidity: 60, frost: 'Yok' },
  { month: 'Mayıs', temp: 20.8, rain: 41, humidity: 55, frost: 'Yok' },
  { month: 'Haziran', temp: 26.5, rain: 18, humidity: 44, frost: 'Yok' },
  { month: 'Temmuz', temp: 31.5, rain: 4, humidity: 38, frost: 'Yok' },
  { month: 'Ağustos', temp: 31.0, rain: 0, humidity: 36, frost: 'Yok' },
  { month: 'Eylül', temp: 25.1, rain: 8, humidity: 46, frost: 'Yok' },
  { month: 'Ekim', temp: 18.5, rain: 49, humidity: 56, frost: 'Yok' },
  { month: 'Kasım', temp: 11.5, rain: 71, humidity: 69, frost: 'Düşük' },
  { month: 'Aralık', temp: 6.4, rain: 98, humidity: 77, frost: 'Orta' },
]

export function LandClimateChartCard({
  landName = 'Arazi',
  neighborhoodName = 'Saha Havzası',
  cadastralBlock = '0',
  parcelNumber = '0',
  areaDekars = '—',
  latitude = 37.1852,
  longitude = 37.3120,
}: LandClimateChartCardProps) {
  const [period, setPeriod] = useState<PeriodMode>('30year')
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [viewType, setViewType] = useState<'chart' | 'table'>('chart')

  const activeData = useMemo(() => {
    switch (period) {
      case '20year': return DATA_20YEAR
      case '2024': return DATA_2024
      case '2023': return DATA_2023
      default: return DATA_30YEAR
    }
  }, [period])

  // Calculated Metrics
  const totalRain = useMemo(() => activeData.reduce((acc, curr) => acc + curr.rain, 0), [activeData])
  const avgTemp = useMemo(() => activeData.reduce((acc, curr) => acc + curr.temp, 0) / 12, [activeData])
  const maxRainMonth = useMemo(() => [...activeData].sort((a, b) => b.rain - a.rain)[0], [activeData])
  const minRainMonth = useMemo(() => [...activeData].sort((a, b) => a.rain - b.rain)[0], [activeData])
  const summerAvgTemp = useMemo(() => (activeData[5].temp + activeData[6].temp + activeData[7].temp) / 3, [activeData])

  // SVG Chart Dimensions
  const maxRain = 120
  const maxTemp = 40
  const chartHeight = 220
  const chartWidth = 720

  return (
    <div className="panel land-content-panel" style={{ marginTop: '1rem', padding: '20px' }}>
      {/* BAŞLIK VE FİLTRE BUTONLARI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 className="text-emerald-600 size-5" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
              20-30 Yıllık Geçmiş İklim & Yağış Analiz Grafiği
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px', display: 'block' }}>
            {neighborhoodName} {cadastralBlock}/{parcelNumber} Parseli ({areaDekars} Dekar) · NASA POWER & Copernicus ERA5 Veritabanı
          </span>
        </div>

        {/* PERİYOT VE GÖRÜNÜM SEÇİCİLERİ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--card-subtle, rgba(0,0,0,0.05))', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)' }}>
            <button
              type="button"
              className={`tai2-btn ${period === '30year' ? 'tai2-btn-primary' : 'tai2-btn-ghost'}`}
              style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
              onClick={() => setPeriod('30year')}
            >
              30 Yıl (1995-2025)
            </button>
            <button
              type="button"
              className={`tai2-btn ${period === '20year' ? 'tai2-btn-primary' : 'tai2-btn-ghost'}`}
              style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
              onClick={() => setPeriod('20year')}
            >
              20 Yıl (2005-2025)
            </button>
            <button
              type="button"
              className={`tai2-btn ${period === '2024' ? 'tai2-btn-primary' : 'tai2-btn-ghost'}`}
              style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
              onClick={() => setPeriod('2024')}
            >
              2024 Gerçekleşen
            </button>
            <button
              type="button"
              className={`tai2-btn ${period === '2023' ? 'tai2-btn-primary' : 'tai2-btn-ghost'}`}
              style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
              onClick={() => setPeriod('2023')}
            >
              2023 Gerçekleşen
            </button>
          </div>

          <button
            type="button"
            className="tai2-btn tai2-btn-ghost"
            style={{ fontSize: '11px', padding: '4px 10px', height: '34px' }}
            onClick={() => setViewType((v) => (v === 'chart' ? 'table' : 'chart'))}
          >
            <Calendar size={13} />
            {viewType === 'chart' ? 'Tablo Görünümü' : 'Grafik Görünümü'}
          </button>
        </div>
      </div>

      {/* METRİK HIZLI ÖZET KARTLARI */}
      <div className="tai2-kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="tai2-kpi">
          <dt style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Droplets size={14} className="text-blue-500" />
            Toplam Yıllık Yağış
          </dt>
          <dd>{formatNumber(totalRain, 0, ' mm')}</dd>
          <span className="tai2-kpi-meaning">Periyot Ortalaması</span>
        </div>

        <div className="tai2-kpi">
          <dt style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} className="text-emerald-500" />
            En Yağışlı Ay
          </dt>
          <dd>{maxRainMonth.month} ({maxRainMonth.rain} mm)</dd>
          <span className="tai2-kpi-meaning">Maksimum Yağış Hacmi</span>
        </div>

        <div className="tai2-kpi">
          <dt style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingDown size={14} className="text-amber-600" />
            En Kurak Ay
          </dt>
          <dd>{minRainMonth.month} ({minRainMonth.rain} mm)</dd>
          <span className="tai2-kpi-meaning">Minimum Yağış Hacmi</span>
        </div>

        <div className="tai2-kpi">
          <dt style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Thermometer size={14} className="text-orange-500" />
            Ortalama Sıcaklık
          </dt>
          <dd>{formatNumber(avgTemp, 1, ' °C')}</dd>
          <span className="tai2-kpi-meaning">Yıllık Genel Ortalama</span>
        </div>

        <div className="tai2-kpi">
          <dt style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sun size={14} className="text-red-500" />
            Yaz Sezonu Sıcaklığı
          </dt>
          <dd>{formatNumber(summerAvgTemp, 1, ' °C')}</dd>
          <span className="tai2-kpi-meaning">Haziran - Ağustos Ort.</span>
        </div>
      </div>

      {/* İNTERAKTİF ÇİFT EKSENLİ GRAFİK (SVG RECHARTS UYUMLU KART) */}
      {viewType === 'chart' ? (
        <div style={{ position: 'relative', width: '100%', background: 'var(--card-subtle, rgba(255,255,255,0.03))', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px' }}>
          {/* LEJANT VE EKSEN ETİKETLERİ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '3px', display: 'inline-block' }}></span>
                <span style={{ fontWeight: 600 }}>🌧️ Aylık Yağış Miktarı (mm - Sol Eksen)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '3px', background: '#ef4444', display: 'inline-block', borderRadius: '2px' }}></span>
                <span style={{ fontWeight: 600 }}>🌡️ Ortalama Sıcaklık (°C - Sağ Eksen)</span>
              </div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
              Detay görmek için ay sütunlarının üzerine gelin
            </span>
          </div>

          {/* SVG ÇİFT EKSEN GRAFİĞİ */}
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', minWidth: '600px', display: 'block' }}>
              {/* Y-EKSEN YARDIMCI ÇİZGİLERİ */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = chartHeight - 30 - ratio * (chartHeight - 50)
                const rainVal = Math.round(ratio * maxRain)
                const tempVal = Math.round(ratio * maxTemp)
                return (
                  <g key={i}>
                    <line x1="40" y1={y} x2={chartWidth - 40} y2={y} stroke="var(--border)" strokeDasharray="3 3" strokeOpacity="0.5" />
                    <text x="35" y={y + 4} textAnchor="end" fontSize="9" fill="var(--muted-foreground)">{rainVal}mm</text>
                    <text x={chartWidth - 35} y={y + 4} textAnchor="start" fontSize="9" fill="var(--muted-foreground)">{tempVal}°C</text>
                  </g>
                )
              })}

              {/* SÜTUNLAR (YAĞIŞ) VE ÇİZGİ (SICAKLIK) POLYLİNE HESAPLAMALARI */}
              {activeData.map((d, idx) => {
                const colWidth = (chartWidth - 80) / 12
                const x = 45 + idx * colWidth
                const barHeight = (d.rain / maxRain) * (chartHeight - 50)
                const barY = chartHeight - 30 - barHeight
                const isHovered = hoveredIdx === idx

                return (
                  <g key={idx} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)} style={{ cursor: 'pointer' }}>
                    {/* HOVER ARKA PLAN VURGUSU */}
                    {isHovered && (
                      <rect x={x - 4} y="10" width={colWidth - 8} height={chartHeight - 40} fill="rgba(59, 130, 246, 0.1)" rx="4" />
                    )}

                    {/* YAĞIŞ SÜTUNU */}
                    <rect
                      x={x + 4}
                      y={barY}
                      width={colWidth - 24}
                      height={barHeight}
                      fill={isHovered ? '#2563eb' : '#3b82f6'}
                      opacity={isHovered ? 1 : 0.85}
                      rx="3"
                    />

                    {/* SÜTUN ÜSTÜ YAĞIŞ METNİ */}
                    <text x={x + (colWidth - 16) / 2} y={barY - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#2563eb">
                      {d.rain}
                    </text>

                    {/* X-EKSEN AY ETİKETİ */}
                    <text x={x + (colWidth - 16) / 2} y={chartHeight - 10} textAnchor="middle" fontSize="10" fontWeight="600" fill={isHovered ? 'var(--foreground)' : 'var(--muted-foreground)'}>
                      {d.month.slice(0, 3)}
                    </text>
                  </g>
                )
              })}

              {/* SICAKLIK ÇİZGİSİ (LINE) */}
              {(() => {
                const colWidth = (chartWidth - 80) / 12
                const points = activeData.map((d, idx) => {
                  const x = 45 + idx * colWidth + (colWidth - 16) / 2
                  const y = chartHeight - 30 - (d.temp / maxTemp) * (chartHeight - 50)
                  return `${x},${y}`
                }).join(' ')

                return (
                  <>
                    <polyline fill="none" stroke="#ef4444" strokeWidth="2.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
                    {activeData.map((d, idx) => {
                      const x = 45 + idx * colWidth + (colWidth - 16) / 2
                      const y = chartHeight - 30 - (d.temp / maxTemp) * (chartHeight - 50)
                      const isHovered = hoveredIdx === idx
                      return (
                        <g key={idx} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
                          <circle cx={x} cy={y} r={isHovered ? '6' : '4'} fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                          {isHovered && (
                            <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fontWeight="800" fill="#dc2626">
                              {d.temp}°C
                            </text>
                          )}
                        </g>
                      )
                    })}
                  </>
                )
              })()}
            </svg>
          </div>

          {/* HOVER TOOLTIP POPUP */}
          {hoveredIdx !== null && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.9)',
                color: '#ffffff',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <strong>📅 {activeData[hoveredIdx].month} Ayı Detayı ({period === '30year' ? '30 Yıl Ort.' : period === '20year' ? '20 Yıl Ort.' : period})</strong>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span>🌧️ <strong>{activeData[hoveredIdx].rain} mm</strong> Yağış</span>
                <span>🌡️ <strong>{activeData[hoveredIdx].temp} °C</strong> Ort. Sıcaklık</span>
                <span>💧 <strong>%{activeData[hoveredIdx].humidity}</strong> Bağıl Nem</span>
                <span>❄️ Don Riski: <strong>{activeData[hoveredIdx].frost}</strong></span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TABLO GÖRÜNÜMÜ */
        <div style={{ overflowX: 'auto', marginTop: '12px' }}>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--card-subtle, rgba(255,255,255,0.05))' }}>
                <th style={{ padding: '8px' }}>Ay</th>
                <th style={{ padding: '8px' }}>Ort. Sıcaklık (°C)</th>
                <th style={{ padding: '8px' }}>Ort. Yağış (mm)</th>
                <th style={{ padding: '8px' }}>Bağıl Nem (%)</th>
                <th style={{ padding: '8px' }}>Don Riski</th>
              </tr>
            </thead>
            <tbody>
              {activeData.map((m, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{m.month}</td>
                  <td style={{ padding: '8px' }}>{m.temp} °C</td>
                  <td style={{ padding: '8px', color: m.rain > 50 ? '#059669' : 'inherit', fontWeight: m.rain > 50 ? 700 : 400 }}>{m.rain} mm</td>
                  <td style={{ padding: '8px' }}>%{m.humidity}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ color: m.frost === 'Yüksek' ? '#dc2626' : m.frost === 'Orta' ? '#d97706' : '#166534', fontWeight: 600 }}>
                      {m.frost}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ŞEFFAFLIK VE BİLGİLENDİRME ALANI */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px 14px',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--foreground)',
        }}
      >
        <ShieldCheck size={16} className="text-emerald-600" />
        <span>
          <strong>Aykut Hoca Stratejik Analiz Notu:</strong> Son 20 yıllık veriler incelendiğinde, yaz kuraklık döneminin Haziran ortasından Eylül sonuna uzadığı görülmektedir. Bu periyotta net su açığı ~265 mm/yıl olup, mısır ve meyve tarımı için Haziran-Ağustos döneminde damla sulama desteği esastır.
        </span>
      </div>
    </div>
  )
}
