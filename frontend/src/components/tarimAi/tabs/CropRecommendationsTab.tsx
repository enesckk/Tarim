import { Fragment, useState } from 'react'
import { Award, ChevronDown, Info, Sparkles, Trees, Trophy, Wheat } from 'lucide-react'
import type { AnalysisResult, CropRecommendationItem } from '../../../api/tarimAi'
import { cn } from '../../../lib/utils'
import {
  asRecord,
  formatFactorItem,
  formatNumber,
  formatRisk,
  normalizeCropRow,
  pick,
  statusTone,
  type Tone,
} from '../../../utils/tarimAiFormat'
import { StatusBadge } from '../StatusBadge'

const HOW_CALCULATED_TEXT =
  'Skor; iklim (sıcaklık, yağış), toprak (pH, tekstür, organik madde), arazi eğimi ve — girildiyse — su kalitesi ' +
  'gibi verilerin bu ürünün agronomik gereksinimleriyle karşılaştırılmasından hesaplanır. Alt bileşenlerin kesin ' +
  'ağırlıkları paylaşılmamaktadır; skor kesin bir garanti değil, ürünleri göreli olarak sıralamak için kullanılan ' +
  'bir araçtır. Saha ve laboratuvar doğrulaması olmadan nihai karar için kullanılmamalıdır.'

function stringListFrom(item: CropRecommendationItem, ...keys: string[]): string[] {
  const value = pick(asRecord(item), ...keys)
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => formatFactorItem(entry))
    .filter((entry): entry is string => Boolean(entry))
}

function ScoreBar({ score, tone }: { score: number | undefined; tone: Tone }) {
  const clamped = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0
  return (
    <div className="tai2-score-bar" role="img" aria-label={typeof score === 'number' ? `Skor ${score}` : 'Skor yok'}>
      <div className={cn('tai2-score-bar-fill', `tai2-score-bar-fill-${tone}`)} style={{ width: `${clamped}%` }} />
    </div>
  )
}

function HowCalculatedToggle() {
  const [open, setOpen] = useState(false)
  return (
    <div className="tai2-how-calculated">
      <button type="button" className="tai2-how-calculated-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Info size={13} aria-hidden="true" />
        Nasıl hesaplandı?
        <ChevronDown className={cn('tai2-chevron', open && 'is-open')} size={13} aria-hidden="true" />
      </button>
      {open ? <p className="tai2-how-calculated-text">{HOW_CALCULATED_TEXT}</p> : null}
    </div>
  )
}

function CropDetail({ item, onViewGuide }: { item: CropRecommendationItem; onViewGuide?: (cropCode: string) => void }) {
  const positive = stringListFrom(item, 'positiveFactors')
  const limiting = stringListFrom(item, 'limitingFactors')
  const critical = stringListFrom(item, 'criticalFailures')
  const missingValidations = stringListFrom(item, 'missingValidations')
  const explanation = typeof item.explanation === 'string' ? item.explanation : ''

  return (
    <div className="tai2-crop-detail">
      {item.cropId && onViewGuide ? (
        <div className="mb-4">
          <button
            type="button"
            className="tai2-btn tai2-btn-primary"
            onClick={() => onViewGuide(item.cropId)}
          >
            Üretim Rehberini Görüntüle
          </button>
        </div>
      ) : null}
      {explanation ? <p className="tai2-crop-detail-explanation">{explanation}</p> : null}
      {critical.length > 0 ? (
        <div className="tai2-compact-factor-block">
          <h4>Kritik eksiklikler</h4>
          <ul className="tai2-compact-list is-limiting">
            {critical.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {positive.length > 0 ? (
        <div className="tai2-compact-factor-block">
          <h4>Olumlu sinyaller</h4>
          <ul className="tai2-compact-list is-positive">
            {positive.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {limiting.length > 0 ? (
        <div className="tai2-compact-factor-block">
          <h4>Sınırlayıcı etkenler</h4>
          <ul className="tai2-compact-list is-limiting">
            {limiting.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {missingValidations.length > 0 ? (
        <div className="tai2-compact-factor-block">
          <h4>Saha doğrulaması gereken noktalar</h4>
          <ul className="tai2-compact-list">
            {missingValidations.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <HowCalculatedToggle />
    </div>
  )
}

/**
 * "Ürün Önerileri" tab: top-3 crops as cards, the rest as a compact table.
 * Every row/card can expand to show the underlying positive/limiting factors
 * and a static, honest "how is this calculated" explanation — no invented
 * percentages or weights.
 */
export function CropRecommendationsTab({
  result,
  plantingByCropId,
  cropsList,
  onViewGuide,
}: {
  result: AnalysisResult
  plantingByCropId?: Record<string, string>
  cropsList?: any[]
  onViewGuide?: (cropCode: string) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const items = result.cropRecommendations ?? []

  const isPerennialCrop = (cropId: string, name?: string) => {
    const cid = (cropId || '').toLowerCase()
    const cname = (name || '').toLowerCase()
    const perennialKeywords = [
      'pistachio', 'fıstık', 'olive', 'zeytin', 'almond', 'badem', 'walnut', 'ceviz',
      'grape', 'bağ', 'üzüm', 'pomegranate', 'nar', 'fig', 'incir', 'mulberry', 'dut',
      'sumac', 'sumak', 'apple', 'elma', 'pear', 'armut', 'apricot', 'kayısı',
      'peach', 'şeftali', 'plum', 'erik', 'cherry', 'kiraz', 'sour_cherry', 'vişne',
      'persimmon', 'hurma', 'quince', 'ayva', 'mahaleb', 'mahlep', 'hawthorn', 'alıç',
      'lavender', 'lavanta', 'thyme', 'kekik', 'sage', 'adaçayı', 'rosemary', 'biberiye',
      'caper', 'kapari', 'terebinth', 'menengiç'
    ]
    return perennialKeywords.some((kw) => cid.includes(kw) || cname.includes(kw))
  }

  const perennialItems = items.filter((i) =>
    isPerennialCrop(i.cropId, typeof i.cropName === 'string' ? i.cropName : undefined),
  )
  const seasonalItems = items.filter(
    (i) => !isPerennialCrop(i.cropId, typeof i.cropName === 'string' ? i.cropName : undefined),
  )

  if (items.length === 0) {
    return (
      <div className="tai2-crops-tab">
        <p className="tai2-muted">Ürün önerisi yok.</p>
      </div>
    )
  }

  const renderSideSection = (
    title: string,
    badgeText: string,
    badgeColor: string,
    icon: any,
    groupItems: CropRecommendationItem[],
    accentColor: string,
  ) => {
    const IconComponent = icon
    const topItems = groupItems.slice(0, 5)
    const otherItems = groupItems.slice(5)

    return (
      <div
        style={{
          flex: 1,
          minWidth: '320px',
          background: '#ffffff',
          border: `1px solid ${accentColor}30`,
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '8px', background: `${accentColor}15`, color: accentColor }}>
              <IconComponent size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{title}</h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{groupItems.length} Uygun Çeşit Değerlendirildi</span>
            </div>
          </div>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              background: `${badgeColor}15`,
              color: badgeColor,
            }}
          >
            {badgeText}
          </span>
        </div>

        {groupItems.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>
            Bu kategori için toprak ve iklim gereksinimlerini karşılayan ürün bulunamadı.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topItems.map((item, index) => {
              const row = normalizeCropRow(item, index)
              const tone = statusTone(row.classification)
              const planting = row.id ? plantingByCropId?.[row.id] : undefined
              const isExpanded = expandedId === row.id

              return (
                <article
                  key={`${row.id}-${row.rank}`}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px',
                    background: index === 0 ? '#f0fdf4' : '#fafafa',
                    borderLeft: `4px solid ${index === 0 ? '#16a34a' : '#94a3b8'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: index === 0 ? '#15803d' : '#475569' }}>
                        #{index + 1}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{row.name}</strong>
                    </div>
                    {row.classification ? <StatusBadge label={formatRisk(row.classification)} tone={tone} /> : null}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <ScoreBar score={row.score} tone={tone} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', minWidth: '40px', textAlign: 'right' }}>
                      {typeof row.score === 'number' ? `%${formatNumber(row.score, 1)}` : '—'}
                    </span>
                  </div>

                  {planting ? (
                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#0369a1', fontWeight: 600 }}>
                      Ekim / Dikim Dönemi: {planting}
                    </p>
                  ) : null}

                  <p style={{ margin: '4px 0 8px', fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                    {row.note}
                  </p>

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: accentColor,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isExpanded ? 'Detayları gizle' : 'Agronomik gerekçeyi göster'}
                    <ChevronDown className={cn('tai2-chevron', isExpanded && 'is-open')} size={13} aria-hidden="true" />
                  </button>

                  {isExpanded ? <CropDetail item={item} onViewGuide={onViewGuide} /> : null}
                </article>
              )
            })}

            {otherItems.length > 0 && (
              <div style={{ marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                  Diğer Alternatifler ({otherItems.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {otherItems.map((item, idx) => {
                    const row = normalizeCropRow(item, idx + 3)
                    const tone = statusTone(row.classification)
                    const isExpanded = expandedId === row.id
                    return (
                      <div key={row.id} style={{ padding: '8px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{row.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                              %{formatNumber(row.score, 0)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : row.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                            >
                              <ChevronDown size={14} className={cn(isExpanded && 'rotate-180')} />
                            </button>
                          </div>
                        </div>
                        {isExpanded ? <CropDetail item={item} onViewGuide={onViewGuide} /> : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const topOverall = items.length > 0 ? normalizeCropRow(items[0], 0) : null
  const topPerennial = perennialItems.length > 0 ? normalizeCropRow(perennialItems[0], 0) : null
  const topSeasonal = seasonalItems.length > 0 ? normalizeCropRow(seasonalItems[0], 0) : null

  return (
    <div className="tai2-crops-tab">
      {/* 3 Ana Tavsiye Özeti */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        {topOverall && (
          <div
            style={{
              background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
              border: '1px solid #fde047',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(202,138,4,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: '#eab308', color: '#ffffff' }}>
                <Trophy size={16} />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>
                  En Yüksek Skorlu Öneri
                </span>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#713f12' }}>{topOverall.name}</h4>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: '#a16207' }}>
                {isPerennialCrop(topOverall.id, topOverall.name) ? 'Çok Yıllık Yatırım' : 'Dönemsel Üretim'}
              </span>
              <strong style={{ fontSize: '15px', fontWeight: 900, color: '#854d0e' }}>
                %{formatNumber(topOverall.score, 1)}
              </strong>
            </div>
          </div>
        )}

        {topPerennial && (
          <div
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #86efac',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(22,163,74,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: '#16a34a', color: '#ffffff' }}>
                <Trees size={16} />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                  En İyi Çok Yıllık Öneri
                </span>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#14532d' }}>{topPerennial.name}</h4>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: '#15803d' }}>Meyve, Ağaç & Bağ</span>
              <strong style={{ fontSize: '15px', fontWeight: 900, color: '#166534' }}>
                %{formatNumber(topPerennial.score, 1)}
              </strong>
            </div>
          </div>
        )}

        {topSeasonal && (
          <div
            style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '1px solid #7dd3fc',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(2,132,199,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: '#0284c7', color: '#ffffff' }}>
                <Wheat size={16} />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#075985', textTransform: 'uppercase' }}>
                  En İyi Dönemlik Öneri
                </span>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0c4a6e' }}>{topSeasonal.name}</h4>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: '#0369a1' }}>Tarla, Tahıl & Sebze</span>
              <strong style={{ fontSize: '15px', fontWeight: 900, color: '#075985' }}>
                %{formatNumber(topSeasonal.score, 1)}
              </strong>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {renderSideSection(
          'Çok Yıllık Öneriler (Ağaç, Meyve & Bağ)',
          'Uzun Vadeli Yatırım',
          '#15803d',
          Trees,
          perennialItems,
          '#16a34a',
        )}
        {renderSideSection(
          'Dönemlik Ekilebilecekler (Tarla & Sebze)',
          'Cari Sezon Önerisi',
          '#0284c7',
          Wheat,
          seasonalItems,
          '#0284c7',
        )}
      </div>
    </div>
  )
}


