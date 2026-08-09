import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, MapPin } from 'lucide-react'
import type { ParcelQuery } from '../../api/tarimAi'
import type { Land } from '../../api/types'
import { neighborhoodSelectOptions } from '../../constants/sehitkamilNeighborhoods'
import { cn } from '../../lib/utils'

type SelectionMode = 'registered' | 'manual'

function parcelSummaryLine(parcel: ParcelQuery, areaDecares?: number | null): string {
  const location = [parcel.province, parcel.district, parcel.neighborhood]
    .filter((part) => part?.trim())
    .join(' / ')
  const adaParsel = `Ada ${parcel.block?.trim() || '—'} · Parsel ${parcel.parcel?.trim() || '—'}`
  const area =
    typeof areaDecares === 'number' && Number.isFinite(areaDecares)
      ? `${areaDecares.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} dekar`
      : null
  return [location, adaParsel, area].filter(Boolean).join(' · ')
}

function emptyManualParcel(base?: Partial<ParcelQuery>): ParcelQuery {
  return {
    province: base?.province?.trim() || 'Gaziantep',
    district: base?.district?.trim() || 'Şehitkamil',
    neighborhood: base?.neighborhood?.trim() || '',
    block: base?.block?.trim() || '',
    parcel: base?.parcel?.trim() || '',
  }
}

export function ParcelSelectionCard({
  lands,
  selectedLandId,
  onLandSelect,
  parcel,
  onParcelChange,
  disabled,
  landsLoading,
  areaDecares,
}: {
  lands: Land[]
  selectedLandId: string
  onLandSelect: (landId: string) => void
  parcel: ParcelQuery
  onParcelChange: (next: ParcelQuery) => void
  disabled?: boolean
  landsLoading?: boolean
  areaDecares?: number | null
}) {
  const [mode, setMode] = useState<SelectionMode>('registered')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('')

  useEffect(() => {
    if (!selectedLandId) return
    setMode('registered')
    const land = lands.find((item) => item.id === selectedLandId)
    if (land?.neighborhood?.trim()) setSelectedNeighborhood(land.neighborhood.trim())
  }, [selectedLandId, lands])

  const selectedLand = useMemo(
    () => lands.find((land) => land.id === selectedLandId) ?? null,
    [lands, selectedLandId],
  )

  const registeredNeighborhoods = useMemo(() => {
    const counts = new Map<string, number>()
    for (const land of lands) {
      const name = land.neighborhood?.trim()
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [lands])

  const manualNeighborhoodOptions = useMemo(() => {
    const extras = registeredNeighborhoods.map((item) => item.name)
    const base = neighborhoodSelectOptions(parcel.neighborhood)
    return [...new Set([...extras, ...base])].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [registeredNeighborhoods, parcel.neighborhood])

  const landsInNeighborhood = useMemo(() => {
    if (!selectedNeighborhood) return []
    const target = selectedNeighborhood.toLocaleLowerCase('tr-TR')
    return lands.filter(
      (land) => (land.neighborhood ?? '').toLocaleLowerCase('tr-TR') === target,
    )
  }, [lands, selectedNeighborhood])

  const isFilled =
    Boolean(parcel.province?.trim()) &&
    Boolean(parcel.district?.trim()) &&
    Boolean(parcel.neighborhood?.trim()) &&
    Boolean(parcel.block?.trim()) &&
    Boolean(parcel.parcel?.trim())

  function switchMode(next: SelectionMode) {
    setMode(next)
    if (next === 'manual') {
      if (selectedLandId) onLandSelect('')
      onParcelChange(
        emptyManualParcel({
          province: 'Gaziantep',
          district: 'Şehitkamil',
          neighborhood: '',
          block: '',
          parcel: '',
        }),
      )
      return
    }
    setSelectedNeighborhood(selectedLand?.neighborhood?.trim() || '')
  }

  function updateManual(partial: Partial<ParcelQuery>) {
    if (selectedLandId) onLandSelect('')
    onParcelChange(
      emptyManualParcel({
        ...parcel,
        ...partial,
      }),
    )
  }

  function pickNeighborhood(name: string) {
    setSelectedNeighborhood(name)
    if (selectedLandId) {
      const current = lands.find((land) => land.id === selectedLandId)
      if (current?.neighborhood?.trim() !== name) onLandSelect('')
    }
  }

  return (
    <section className="tai2-card tai2-parcel-card">
      <div className="tai2-card-header">
        <h2 className="tai2-card-title">Analiz için arazi seç</h2>
      </div>

      <div className="tai2-path-toggle" role="tablist" aria-label="Arazi seçim yolu">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'registered'}
          className={cn('tai2-path-toggle-btn', mode === 'registered' && 'is-active')}
          disabled={disabled}
          onClick={() => switchMode('registered')}
        >
          Kayıtlı araziden
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'manual'}
          className={cn('tai2-path-toggle-btn', mode === 'manual' && 'is-active')}
          disabled={disabled}
          onClick={() => switchMode('manual')}
        >
          Ada / parsel gir
        </button>
      </div>

      {mode === 'registered' ? (
        <>
          <p className="tai2-parcel-lead">Önce mahalle seçin, sonra o mahalledeki arazilerden birini seçin.</p>

          {landsLoading ? <p className="tai2-muted">Araziler yükleniyor…</p> : null}

          {!landsLoading && registeredNeighborhoods.length === 0 ? (
            <p className="tai2-muted">
              Kayıtlı arazi yok. «Ada / parsel gir» ile devam edebilirsiniz.
            </p>
          ) : null}

          {!landsLoading && registeredNeighborhoods.length > 0 ? (
            <div className="tai2-nbhd-panel" role="listbox" aria-label="Mahalleler">
              {registeredNeighborhoods.map((item) => {
                const active = selectedNeighborhood === item.name
                return (
                  <button
                    key={item.name}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn('tai2-nbhd-row', active && 'is-active')}
                    disabled={disabled}
                    onClick={() => pickNeighborhood(item.name)}
                  >
                    <span>{item.name}</span>
                    <span className="tai2-nbhd-row-meta">
                      {item.count} arazi
                      <ChevronRight size={14} aria-hidden="true" />
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}

          {selectedNeighborhood ? (
            <div className="tai2-land-panel">
              <div className="tai2-land-panel-head">
                <strong>{selectedNeighborhood}</strong>
                <span>{landsInNeighborhood.length} kayıtlı arazi</span>
              </div>
              {landsInNeighborhood.length === 0 ? (
                <p className="tai2-muted">Bu mahallede kayıtlı arazi yok.</p>
              ) : (
                <div className="tai2-land-list" role="listbox" aria-label={`${selectedNeighborhood} arazileri`}>
                  {landsInNeighborhood.map((land) => {
                    const selected = land.id === selectedLandId
                    return (
                      <button
                        key={land.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={cn('tai2-land-row', selected && 'is-selected')}
                        disabled={disabled}
                        onClick={() => onLandSelect(land.id)}
                      >
                        <span className="tai2-land-row-main">
                          <strong>{land.name || 'Arazi'}</strong>
                          <span>
                            Ada {land.cadastralBlock || '—'} / Parsel {land.parcelNumber || '—'}
                            {typeof land.sizeInDecares === 'number'
                              ? ` · ${land.sizeInDecares.toLocaleString('tr-TR', {
                                  maximumFractionDigits: 1,
                                })} da`
                              : ''}
                          </span>
                        </span>
                        {selected ? (
                          <CheckCircle2 className="tai2-land-card-check" size={16} aria-hidden="true" />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="tai2-parcel-lead">
            İl, ilçe, mahalle, ada ve parsel bilgilerini girin. Kayıtlı olmayan parseller için de analiz
            başlatabilirsiniz.
          </p>

          <div className="tai2-parcel-edit-grid tai2-parcel-manual-grid">
            <label>
              İl
              <input
                value={parcel.province || 'Gaziantep'}
                onChange={(event) => updateManual({ province: event.target.value })}
                disabled={disabled}
                autoComplete="address-level1"
              />
            </label>
            <label>
              İlçe
              <input
                value={parcel.district || 'Şehitkamil'}
                onChange={(event) => updateManual({ district: event.target.value })}
                disabled={disabled}
                autoComplete="address-level2"
              />
            </label>
            <label className="tai2-span-2">
              Mahalle
              <select
                value={parcel.neighborhood}
                disabled={disabled}
                onChange={(event) => updateManual({ neighborhood: event.target.value })}
                aria-label="Mahalle"
              >
                <option value="">Mahalle seçin</option>
                {manualNeighborhoodOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ada
              <input
                value={parcel.block}
                placeholder="ör. 108"
                inputMode="numeric"
                onChange={(event) => updateManual({ block: event.target.value })}
                disabled={disabled}
              />
            </label>
            <label>
              Parsel
              <input
                value={parcel.parcel}
                placeholder="ör. 7"
                inputMode="numeric"
                onChange={(event) => updateManual({ parcel: event.target.value })}
                disabled={disabled}
              />
            </label>
          </div>
        </>
      )}

      {selectedLand || isFilled ? (
        <div className="tai2-parcel-summary">
          <MapPin className="tai2-parcel-summary-icon" size={16} aria-hidden="true" />
          <div className="tai2-parcel-summary-text">
            <strong>{selectedLand?.name ?? 'Analiz parseli'}</strong>
            <span>{parcelSummaryLine(parcel, areaDecares ?? selectedLand?.sizeInDecares)}</span>
          </div>
          {selectedLand ? (
            <Link to={`/app/lands/${selectedLand.id}`} className="tai2-parcel-map-link">
              Arazi detayı
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
