import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { DeliveryRecord, HarvestRecord, Land, Producer, Season } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import '../layout/layout.css'

export function HarvestPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [showHarvest, setShowHarvest] = useState(false)
  const [showDelivery, setShowDelivery] = useState(false)
  const [harvestForm, setHarvestForm] = useState({
    productName: '',
    quantity: 100,
    unit: 'kg',
    harvestDate: new Date().toISOString().slice(0, 10),
    seasonId: '',
    producerId: '',
    landId: '',
    notes: '',
    buyerName: '',
    unitPrice: '' as string | number,
  })
  const [deliveryForm, setDeliveryForm] = useState({
    harvestRecordId: '',
    quantity: 10,
    deliveryDate: new Date().toISOString().slice(0, 10),
    destination: '',
    notes: '',
  })

  const harvestQuery = useQuery({
    queryKey: ['harvests'],
    queryFn: () => api<HarvestRecord[]>('/api/harvest', {}, token),
    enabled: Boolean(token),
  })

  const deliveryQuery = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => api<DeliveryRecord[]>('/api/harvest/deliveries', {}, token),
    enabled: Boolean(token),
  })

  const producersQuery = useQuery({
    queryKey: ['producers'],
    queryFn: () => api<Producer[]>('/api/producers', {}, token),
    enabled: Boolean(token),
  })

  const landsQuery = useQuery({
    queryKey: ['lands'],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token),
  })

  const seasonsQuery = useQuery({
    queryKey: ['seasons'],
    queryFn: () => api<Season[]>('/api/seasons', {}, token),
    enabled: Boolean(token),
  })

  const deliveredByHarvest = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of deliveryQuery.data ?? []) {
      map.set(d.harvestRecordId, (map.get(d.harvestRecordId) ?? 0) + d.quantity)
    }
    return map
  }, [deliveryQuery.data])

  const recordHarvest = useMutation({
    mutationFn: () => {
      const unitPriceRaw =
        harvestForm.unitPrice === '' || harvestForm.unitPrice === null
          ? null
          : Number(harvestForm.unitPrice)
      const unitPrice =
        unitPriceRaw !== null && !Number.isNaN(unitPriceRaw) ? unitPriceRaw : null
      const totalAmount =
        unitPrice !== null ? Math.round(unitPrice * Number(harvestForm.quantity) * 100) / 100 : null
      return api(
        '/api/harvest',
        {
          method: 'POST',
          body: JSON.stringify({
            productName: harvestForm.productName,
            quantity: Number(harvestForm.quantity),
            unit: harvestForm.unit,
            harvestDate: harvestForm.harvestDate,
            seasonId: harvestForm.seasonId,
            producerId: harvestForm.producerId,
            landId: harvestForm.landId,
            productionWorkflowId: null,
            notes: harvestForm.notes || null,
            buyerName: harvestForm.buyerName.trim() || null,
            unitPrice,
            totalAmount,
          }),
        },
        token,
      )
    },
    onSuccess: async () => {
      setShowHarvest(false)
      await queryClient.invalidateQueries({ queryKey: ['harvests'] })
      await queryClient.invalidateQueries({ queryKey: ['operations-center'] })
    },
  })

  const recordDelivery = useMutation({
    mutationFn: () =>
      api(
        '/api/harvest/deliveries',
        {
          method: 'POST',
          body: JSON.stringify({
            harvestRecordId: deliveryForm.harvestRecordId,
            quantity: Number(deliveryForm.quantity),
            deliveryDate: deliveryForm.deliveryDate,
            unit: null,
            destination: deliveryForm.destination || null,
            notes: deliveryForm.notes || null,
          }),
        },
        token,
      ),
    onSuccess: async () => {
      setShowDelivery(false)
      await queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      await queryClient.invalidateQueries({ queryKey: ['operations-center'] })
    },
  })

  const harvests = harvestQuery.data ?? []
  const deliveries = deliveryQuery.data ?? []

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Hasat ve teslimat</h1>
          <p>Hasat kaydı ve teslimat aynı süreçte yönetilir (teslimat hasada bağlıdır).</p>
        </div>
        <div className="row-actions">
          <button type="button" className="primary-btn" onClick={() => setShowHarvest((v) => !v)}>
            {showHarvest ? 'Kapat' : 'Hasat kaydet'}
          </button>
          <button type="button" className="ghost-btn" onClick={() => setShowDelivery((v) => !v)}>
            {showDelivery ? 'Kapat' : 'Teslimat ekle'}
          </button>
        </div>
      </div>

      {(recordHarvest.error || recordDelivery.error) && (
        <p className="error">
          {((recordHarvest.error || recordDelivery.error) as Error).message}
        </p>
      )}

      {showHarvest && (
        <div className="panel">
          <form
            className="form-grid two-col"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              recordHarvest.mutate()
            }}
          >
            <label>
              Ürün
              <input
                value={harvestForm.productName}
                onChange={(e) => setHarvestForm({ ...harvestForm, productName: e.target.value })}
                required
              />
            </label>
            <label>
              Hasat tarihi
              <input
                type="date"
                value={harvestForm.harvestDate}
                onChange={(e) => setHarvestForm({ ...harvestForm, harvestDate: e.target.value })}
                required
              />
            </label>
            <label>
              Miktar
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={harvestForm.quantity}
                onChange={(e) =>
                  setHarvestForm({ ...harvestForm, quantity: Number(e.target.value) })
                }
                required
              />
            </label>
            <label>
              Birim
              <input
                value={harvestForm.unit}
                onChange={(e) => setHarvestForm({ ...harvestForm, unit: e.target.value })}
                required
              />
            </label>
            <label>
              Sezon
              <select
                value={harvestForm.seasonId}
                onChange={(e) => setHarvestForm({ ...harvestForm, seasonId: e.target.value })}
                required
              >
                <option value="">Seçin</option>
                {(seasonsQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Üretici
              <select
                value={harvestForm.producerId}
                onChange={(e) => setHarvestForm({ ...harvestForm, producerId: e.target.value })}
                required
              >
                <option value="">Seçin</option>
                {(producersQuery.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Arazi
              <select
                value={harvestForm.landId}
                onChange={(e) => setHarvestForm({ ...harvestForm, landId: e.target.value })}
                required
              >
                <option value="">Seçin</option>
                {(landsQuery.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alıcı
              <input
                value={harvestForm.buyerName}
                onChange={(e) => setHarvestForm({ ...harvestForm, buyerName: e.target.value })}
                placeholder="Kim aldı? (kişi / kuruluş)"
              />
            </label>
            <label>
              Birim fiyat (₺)
              <input
                type="number"
                min={0}
                step="0.01"
                value={harvestForm.unitPrice}
                onChange={(e) =>
                  setHarvestForm({
                    ...harvestForm,
                    unitPrice: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                placeholder="Ne kadara?"
              />
            </label>
            <label>
              Toplam tutar (₺)
              <input
                type="text"
                readOnly
                value={
                  harvestForm.unitPrice === '' || harvestForm.unitPrice === null
                    ? '—'
                    : (
                        Math.round(Number(harvestForm.unitPrice) * Number(harvestForm.quantity) * 100) /
                        100
                      ).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              />
            </label>
            <label>
              Not
              <input
                value={harvestForm.notes}
                onChange={(e) => setHarvestForm({ ...harvestForm, notes: e.target.value })}
              />
            </label>
            <div className="full-span">
              <button type="submit" className="primary-btn" disabled={recordHarvest.isPending}>
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {showDelivery && (
        <div className="panel">
          <form
            className="form-grid two-col"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              recordDelivery.mutate()
            }}
          >
            <label>
              Hasat
              <select
                value={deliveryForm.harvestRecordId}
                onChange={(e) =>
                  setDeliveryForm({ ...deliveryForm, harvestRecordId: e.target.value })
                }
                required
              >
                <option value="">Seçin</option>
                {harvests.map((h) => {
                  const delivered = deliveredByHarvest.get(h.id) ?? 0
                  const remaining = h.quantity - delivered
                  return (
                    <option key={h.id} value={h.id} disabled={remaining <= 0}>
                      {h.productName} — kalan {remaining} {h.unit}
                    </option>
                  )
                })}
              </select>
            </label>
            <label>
              Teslimat tarihi
              <input
                type="date"
                value={deliveryForm.deliveryDate}
                onChange={(e) =>
                  setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })
                }
                required
              />
            </label>
            <label>
              Miktar
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={deliveryForm.quantity}
                onChange={(e) =>
                  setDeliveryForm({ ...deliveryForm, quantity: Number(e.target.value) })
                }
                required
              />
            </label>
            <label>
              Varış yeri
              <input
                value={deliveryForm.destination}
                onChange={(e) =>
                  setDeliveryForm({ ...deliveryForm, destination: e.target.value })
                }
              />
            </label>
            <div className="full-span">
              <button type="submit" className="primary-btn" disabled={recordDelivery.isPending}>
                Teslimatı kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <p className="panel-title">Hasat kayıtları</p>
        {harvestQuery.isLoading && <p className="empty">Yükleniyor…</p>}
        {!harvestQuery.isLoading && harvests.length === 0 && (
          <p className="empty">Henüz hasat yok.</p>
        )}
        {harvests.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Tarih</th>
                <th>Miktar</th>
                <th>Alıcı</th>
                <th>Birim fiyat</th>
                <th>Toplam</th>
                <th>Teslim</th>
                <th>Kalan</th>
              </tr>
            </thead>
            <tbody>
              {harvests.map((h) => {
                const delivered = deliveredByHarvest.get(h.id) ?? 0
                return (
                  <tr key={h.id}>
                    <td>{h.productName}</td>
                    <td>{h.harvestDate}</td>
                    <td>
                      {h.quantity} {h.unit}
                    </td>
                    <td>{h.buyerName || '—'}</td>
                    <td>
                      {h.unitPrice != null
                        ? `${h.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺/${h.unit}`
                        : '—'}
                    </td>
                    <td>
                      {h.totalAmount != null
                        ? `${h.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
                        : '—'}
                    </td>
                    <td>
                      {delivered} {h.unit}
                    </td>
                    <td>
                      {h.quantity - delivered} {h.unit}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <p className="panel-title">Teslimatlar</p>
        {deliveries.length === 0 ? (
          <p className="empty">Henüz teslimat yok.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Miktar</th>
                <th>Varış</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td>{d.deliveryDate}</td>
                  <td>
                    {d.quantity} {d.unit}
                  </td>
                  <td>{d.destination || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
