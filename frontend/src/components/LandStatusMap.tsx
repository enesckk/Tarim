import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { LandMapItem, LandMapStatus } from '../api/types'
import 'leaflet/dist/leaflet.css'

/** Gaziantep / Şehitkamil — pan sınırı (sığdırma bunu zorlamaz). */
const SEHITKAMIL_BOUNDS = L.latLngBounds([36.99, 37.28], [37.17, 37.50])
const SEHITKAMIL_CENTER: [number, number] = [37.08, 37.38]

/** İlk açılışta tüm araziler sığsın diye düşük tutulur. */
const FIT_MIN_ZOOM = 10
const FOCUS_MAX_ZOOM = 15
const DEFAULT_ZOOM = 12

const STATUS_META: Record<LandMapStatus, { label: string; color: string }> = {
  normal: { label: 'Normal', color: '#22a06b' },
  today: { label: 'Bugün iş var', color: '#d97706' },
  critical: { label: 'Kritik', color: '#dc2626' },
  harvest: { label: 'Hasat aktif', color: '#2563eb' },
}

function makeIcon(color: string) {
  return L.divIcon({
    className: 'ops-map-marker',
    html: `<span style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

const STATUS_ICONS: Record<LandMapStatus, L.DivIcon> = {
  normal: makeIcon(STATUS_META.normal.color),
  today: makeIcon(STATUS_META.today.color),
  critical: makeIcon(STATUS_META.critical.color),
  harvest: makeIcon(STATUS_META.harvest.color),
}

/** Hiç dokunmadan: tüm marker’lar ilk karede görünsün. */
function FitAllLandsOnOpen({ points }: { points: LandMapItem[] }) {
  const map = useMap()

  useEffect(() => {
    let cancelled = false
    const timers: number[] = []

    const fit = () => {
      if (cancelled) return
      try {
        map.invalidateSize({ pan: false })
        // Sığdırmayı minZoom engellemesin
        map.setMinZoom(FIT_MIN_ZOOM)
        map.setMaxZoom(FOCUS_MAX_ZOOM)

        if (points.length === 0) {
          map.setView(SEHITKAMIL_CENTER, DEFAULT_ZOOM, { animate: false })
          return
        }

        if (points.length === 1) {
          map.setView(
            [points[0].latitude, points[0].longitude],
            14,
            { animate: false },
          )
          return
        }

        const bounds = L.latLngBounds(
          points.map((p) => [p.latitude, p.longitude] as [number, number]),
        )
        if (!bounds.isValid()) {
          map.setView(SEHITKAMIL_CENTER, DEFAULT_ZOOM, { animate: false })
          return
        }

        // Kenar boşluğu ile tüm noktaları kadraja al
        map.fitBounds(bounds.pad(0.12), {
          padding: [56, 56],
          maxZoom: 14,
          animate: false,
        })

        // İlçe dışına kaçmayı yumuşak sınırla (sığdırmadan sonra)
        map.setMaxBounds(SEHITKAMIL_BOUNDS.pad(0.35))
      } catch {
        if (!cancelled) {
          map.setView(SEHITKAMIL_CENTER, DEFAULT_ZOOM, { animate: false })
        }
      }
    }

    // Layout / tile boyutu oturana kadar birkaç kez sığdır
    fit()
    timers.push(window.setTimeout(fit, 50))
    timers.push(window.setTimeout(fit, 200))
    timers.push(window.setTimeout(fit, 450))

    const onLoad = () => fit()
    map.whenReady(onLoad)
    map.on('resize', fit)

    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
      map.off('resize', fit)
    }
  }, [map, points])

  return null
}

type Props = {
  lands: LandMapItem[]
}

export function LandStatusMap({ lands }: Props) {
  // API zaten Şehitkamil odaklı mapLands döner — hepsini göster, ekstra filtreleme kesmesin
  const points = useMemo(
    () =>
      (lands ?? []).filter(
        (l) =>
          Number.isFinite(Number(l.latitude)) &&
          Number.isFinite(Number(l.longitude)) &&
          Math.abs(Number(l.latitude)) <= 90 &&
          Math.abs(Number(l.longitude)) <= 180,
      ).map((l) => ({
        ...l,
        latitude: Number(l.latitude),
        longitude: Number(l.longitude),
      })),
    [lands],
  )

  const center = useMemo<[number, number]>(() => {
    if (points.length === 0) return SEHITKAMIL_CENTER
    const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length
    const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length
    return [lat, lng]
  }, [points])

  const mapKey = useMemo(
    () => `fit-${points.length}-${points.map((p) => p.id).sort().join('.')}`,
    [points],
  )

  return (
    <section
      className="ops-panel ops-map-panel"
      id="harita"
      aria-label="Şehitkamil arazi durum haritası"
    >
      <div className="ops-panel-head">
        <h3>Şehitkamil — Arazi durumu</h3>
        <span className="ops-map-count">
          {points.length > 0 ? `${points.length} arazi` : 'Koordinat yok'}
        </span>
      </div>

      {points.length === 0 ? (
        <div className="ops-map-empty">
          <p>Koordinatlı arazi yok</p>
          <span>Arazi kaydına enlem / boylam ekleyin.</span>
        </div>
      ) : (
        <div className="ops-map-body">
          <div className="ops-map-canvas">
            <MapContainer
              key={mapKey}
              center={center}
              zoom={DEFAULT_ZOOM}
              minZoom={FIT_MIN_ZOOM}
              maxZoom={FOCUS_MAX_ZOOM}
              scrollWheelZoom={false}
              className="ops-leaflet"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                maxZoom={FOCUS_MAX_ZOOM}
              />
              <FitAllLandsOnOpen points={points} />

              {points.map((land) => {
                const status = STATUS_META[land.mapStatus] ?? STATUS_META.normal
                return (
                  <Marker
                    key={land.id}
                    position={[land.latitude, land.longitude]}
                    icon={STATUS_ICONS[land.mapStatus] ?? STATUS_ICONS.normal}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                      <span className="ops-map-tip-simple">{land.name}</span>
                    </Tooltip>

                    <Popup className="ops-map-popup" closeButton maxWidth={240}>
                      <div className="ops-map-tip">
                        <strong>{land.name}</strong>
                        {land.neighborhood ? (
                          <span>{land.neighborhood} Mahallesi</span>
                        ) : null}
                        {land.parcelNumber ? (
                          <span>Parsel {land.parcelNumber}</span>
                        ) : null}
                        <span
                          className="ops-map-tip-status"
                          style={{ color: status.color }}
                        >
                          {status.label}
                        </span>
                        <Link to={`/lands/${land.id}`} className="ops-map-tip-link">
                          Araziyi aç
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>
          <ul className="ops-map-legend" aria-label="Harita lejantı">
            {(Object.keys(STATUS_META) as LandMapStatus[]).map((key) => (
              <li key={key}>
                <span
                  className="ops-map-swatch"
                  style={{ background: STATUS_META[key].color }}
                  aria-hidden
                />
                {STATUS_META[key].label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
