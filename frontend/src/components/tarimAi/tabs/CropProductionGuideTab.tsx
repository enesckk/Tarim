import { useEffect, useState } from 'react'

export function CropProductionGuideTab({ cropCode }: { cropCode?: string }) {
  const [guide, setGuide] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!cropCode) return

    let mounted = true
    setLoading(true)
    setError(null)

    fetch(`/api/crop-guides/${cropCode}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Bu ürün için üretim rehberi henüz bulunmuyor.')
          }
          throw new Error('Üretim rehberi yüklenirken bir hata oluştu.')
        }
        return res.json()
      })
      .then((data) => {
        if (mounted) setGuide(data)
      })
      .catch((err) => {
        if (mounted) setError(err.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [cropCode])

  if (!cropCode) {
    return (
      <div className="tai2-panel p-6 text-center text-slate-500">
        Lütfen önce bir ürün seçin veya analiz sonuçlarından önerilen bir ürüne tıklayın.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="tai2-panel p-6 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-slate-500">Üretim rehberi yükleniyor...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tai2-panel p-6 text-center text-rose-500 bg-rose-50 border border-rose-100 rounded-lg">
        {error}
      </div>
    )
  }

  if (!guide) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {guide.generalInfo?.scientificName} ({guide.cropCode}) Üretim Rehberi
        </h2>
        <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
          {guide.reviewStatus}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Genel Bilgiler */}
        <div className="tai2-panel p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Genel Bilgiler</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Kategori</dt>
              <dd className="font-medium text-slate-900">{guide.generalInfo?.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Yaşam Döngüsü</dt>
              <dd className="font-medium text-slate-900">{guide.generalInfo?.lifeCycle}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Ekim Dönemi</dt>
              <dd className="font-medium text-slate-900">{guide.generalInfo?.plantingPeriod}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Hasat Dönemi</dt>
              <dd className="font-medium text-slate-900">{guide.generalInfo?.harvestPeriod}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Su İhtiyacı</dt>
              <dd className="font-medium text-slate-900">{guide.generalInfo?.waterRequirement}</dd>
            </div>
          </dl>
        </div>

        {/* Uzman Notları */}
        <div className="tai2-panel p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Uzman Tavsiyeleri</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
            {guide.expertNotes?.recommendations?.map((rec: string, i: number) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
          
          <h4 className="font-medium text-rose-600 mt-4 mb-2 text-sm">Sık Yapılan Hatalar</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            {guide.expertNotes?.commonMistakes?.map((mistake: string, i: number) => (
              <li key={i}>{mistake}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Üretim Takvimi */}
      <div className="tai2-panel p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Üretim Takvimi & Yapılacak İşler</h3>
        {guide.calendar && guide.calendar.length > 0 ? (
          <div className="space-y-4">
            {guide.calendar.map((task: any, index: number) => (
              <div key={index} className="flex gap-4 p-4 border rounded-lg bg-slate-50">
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 font-bold shrink-0">
                  {task.sequenceOrder}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{task.taskName}</h4>
                  <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="px-2 py-1 rounded bg-white border font-medium">Öncelik: {task.priority}</span>
                    {task.estimatedTime && <span className="px-2 py-1 rounded bg-white border text-slate-500">Süre: {task.estimatedTime}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">Üretim takvimi verisi bulunamadı.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gübreleme */}
        <div className="tai2-panel p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Gübreleme (Referans)</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Azot İhtiyacı</dt>
              <dd className="font-medium text-slate-900">{guide.fertilizationReference?.nitrogen}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Fosfor İhtiyacı</dt>
              <dd className="font-medium text-slate-900">{guide.fertilizationReference?.phosphorus}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Potasyum İhtiyacı</dt>
              <dd className="font-medium text-slate-900">{guide.fertilizationReference?.potassium}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Uygulama Dönemleri</dt>
              <dd className="font-medium text-slate-900 text-right">{guide.fertilizationReference?.applicationPeriods?.join(', ')}</dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500 mt-4 italic">* Gerçek değerler toprak analizine göre değişebilir.</p>
        </div>

        {/* Sulama */}
        <div className="tai2-panel p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Sulama</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Sulama Tipleri</dt>
              <dd className="font-medium text-slate-900">{guide.irrigationReference?.irrigationTypes?.join(', ')}</dd>
            </div>
            <div className="flex justify-between mt-2">
              <dt className="text-slate-500">Kritik Dönemler</dt>
              <dd className="font-medium text-slate-900 text-right">{guide.irrigationReference?.criticalPeriods?.join(', ')}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Hastalıklar */}
      <div className="tai2-panel p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Hastalık ve Zararlılar</h3>
        {guide.diseases && guide.diseases.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guide.diseases.map((d: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg bg-rose-50/30">
                <h4 className="font-bold text-rose-800">{d.diseaseName}</h4>
                <p className="text-xs font-medium text-rose-600 mt-1">Risk Dönemi: {d.riskPeriod}</p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p><strong>Belirti:</strong> {d.symptoms}</p>
                  <p><strong>Önleme:</strong> {d.prevention}</p>
                  <p><strong>İlk Müdahale:</strong> {d.firstResponse}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">Kayıtlı hastalık ve zararlı bilgisi bulunamadı.</p>
        )}
      </div>

    </div>
  )
}
