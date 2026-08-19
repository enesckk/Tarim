// @ts-nocheck
import React, { useMemo, useState } from 'react'
import {
  CloudSun,
  Droplets,
  Layers,
  Search,
  Thermometer,
} from 'lucide-react'
import { REGIONAL_CROPS_DATABASE } from '../../../utils/cropKnowledgeData'
import { cn } from '../../../lib/utils'

export function PlantCatalogTab() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [expandedCropId, setExpandedCropId] = useState(null)

  const filteredCrops = useMemo(() => {
    return REGIONAL_CROPS_DATABASE.filter((c) => {
      const matchType =
        filterType === 'all'
          ? true
          : filterType === 'perennial'
            ? c.category === 'perennial' || c.growingType === 'perennial' || c.seasonalOrPerennial === 'perennial'
            : c.category !== 'perennial' && c.growingType !== 'perennial' && c.seasonalOrPerennial !== 'perennial'

      const query = (search || '').trim().toLowerCase()
      const matchSearch =
        !query ||
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.scientificName && c.scientificName.toLowerCase().includes(query)) ||
        (c.regionalNote && c.regionalNote.toLowerCase().includes(query))

      return matchType && matchSearch
    })
  }, [search, filterType])

  const perennialCount = useMemo(
    () =>
      REGIONAL_CROPS_DATABASE.filter(
        (c) => c.category === 'perennial' || c.growingType === 'perennial' || c.seasonalOrPerennial === 'perennial',
      ).length,
    [],
  )

  const seasonalCount = useMemo(
    () =>
      REGIONAL_CROPS_DATABASE.filter(
        (c) => c.category !== 'perennial' && c.growingType !== 'perennial' && c.seasonalOrPerennial !== 'perennial',
      ).length,
    [],
  )

  return (
    <div className="tai2-stack">
      <div
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: '14px',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }}>🌿</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#14532d' }}>
              Gaziantep ve Şehitkamil Bitki & Meyve Veritabanı
            </h2>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '20px',
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {REGIONAL_CROPS_DATABASE.length} Kayıtlı Çeşit
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#475569', maxWidth: '750px', lineHeight: '1.5' }}>
            İklim modelleri, FAO EcoCrop standartları, SoilGrids toprak uyumu ve Güneydoğu Anadolu tarımsal araştırma
            verilerine dayalı çok yıllık ve dönemlik bitki kütüphanesi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>{perennialCount}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Çok Yıllık / Meyve / Bağ</div>
          </div>
          <div
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7' }}>{seasonalCount}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Dönemlik / Tarla / Sebze</div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Bitki veya meyve adı ara (ör. Antep Fıstığı, Kırmızı Mercimek, Sumak)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '13px',
              color: '#0f172a',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={cn('tai2-btn', filterType === 'all' ? 'tai2-btn-primary' : 'tai2-btn-ghost')}
            onClick={() => setFilterType('all')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Tümü ({REGIONAL_CROPS_DATABASE.length})
          </button>
          <button
            type="button"
            className={cn('tai2-btn', filterType === 'perennial' ? 'tai2-btn-primary' : 'tai2-btn-ghost')}
            onClick={() => setFilterType('perennial')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            🌳 Çok Yıllıklar ({perennialCount})
          </button>
          <button
            type="button"
            className={cn('tai2-btn', filterType === 'seasonal' ? 'tai2-btn-primary' : 'tai2-btn-ghost')}
            onClick={() => setFilterType('seasonal')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            🌾 Dönemlik / Sezonluk ({seasonalCount})
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {filteredCrops.map((c) => {
          const isPerennial =
            c.category === 'perennial' || c.growingType === 'perennial' || c.seasonalOrPerennial === 'perennial'
          const isExpanded = expandedCropId === c.id

          return (
            <div
              key={c.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: isExpanded ? '0 10px 25px -5px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{c.name}</h3>
                    {c.scientificName ? <em style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>{c.scientificName}</em> : null}
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: isPerennial ? 'rgba(22,163,74,0.1)' : 'rgba(2,132,199,0.1)',
                      color: isPerennial ? '#15803d' : '#0369a1',
                    }}
                  >
                    {isPerennial ? '🌳 Çok Yıllık' : '🌾 Dönemlik'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    padding: '10px 0',
                    borderTop: '1px solid #f1f5f9',
                    borderBottom: '1px solid #f1f5f9',
                    margin: '10px 0',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                    <Thermometer size={14} color="#ef4444" />
                    <span>
                      Sıcaklık: {c.climate?.temperature?.optimalMinC ?? 15}°C - {c.climate?.temperature?.optimalMaxC ?? 35}°C
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                    <Droplets size={14} color="#0284c7" />
                    <span>
                      Yağış: {c.climate?.annualPrecipitationMm?.optimalMin ?? 300}-{c.climate?.annualPrecipitationMm?.optimalMax ?? 600} mm
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                    <Layers size={14} color="#d97706" />
                    <span>
                      Toprak pH: {c.soil?.ph?.optimalMin ?? 6.5} - {c.soil?.ph?.optimalMax ?? 8.0}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                    <CloudSun size={14} color="#16a34a" />
                    <span>Kuraklık: {c.climate?.droughtTolerance ? 'Yüksek Dayanım' : 'Orta'}</span>
                  </div>
                </div>

                {c.regionalNote ? (
                  <p style={{ margin: '6px 0 10px', fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                    <strong>Şehitkamil Uyumu:</strong> {c.regionalNote}
                  </p>
                ) : null}

                {isExpanded ? (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      fontSize: '11px',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Kireç & Tuzluluk Toleransı:</strong> {c.soil?.calciumCarbonateTolerance ?? 'Yüksek'} kireç toleransı, {c.soil?.salinityTolerance ?? 'Orta'} tuzluluk.
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Sulama İhtiyacı:</strong> {c.climate?.irrigationDependency === 'none' ? 'Kıraç / Susuz Yetiştirilebilir' : c.climate?.irrigationDependency === 'low' ? 'Düşük Sulama (Yaz Kuraklığı Destek)' : 'Damla Sulama Önerilir'}.
                    </div>
                    <div>
                      <strong>Don Riski:</strong> {c.climate?.frostTolerance === 'very_high' ? 'Aşırı dona dayanıklı (-20°C)' : 'İlkbahar geç donlarına dikkat edilmeli'}.
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setExpandedCropId(isExpanded ? null : c.id)}
                style={{
                  marginTop: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#15803d',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0,
                }}
              >
                {isExpanded ? '▲ Detayları Kapat' : '▼ Detaylı Agronomik Verileri Göster'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
