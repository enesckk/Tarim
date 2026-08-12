// @ts-nocheck
import { useEffect, useState } from 'react'
import type { AnalysisResult } from '../../../../shared/api-types/tarimAi'
import { tarimAi } from '../../../api/tarimAi'
import type { WmWaterSourceAggregate } from '../../../api/tarimAi'
import { Droplet, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'

export function WaterResourcesTab({
  result,
  parcelId,
}: {
  result: AnalysisResult
  parcelId: string
}) {
  const [sources, setSources] = useState<WmWaterSourceAggregate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tarimAi.getWaterSources(parcelId).then((data) => {
      setSources(data)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [parcelId])

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
  }

  return (
    <div className="tai2-climate-tab space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Droplet className="text-blue-500" />
            Su Yönetimi ve Kaynaklar
          </h2>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            {sources.length} Kaynak Bulundu
          </span>
        </div>

        {sources.length > 0 ? (
          <div className="space-y-8">
            {sources.map(source => (
              <div key={source.id} className="border rounded-lg p-5">
                <div className="flex justify-between items-start mb-4 border-b pb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{source.name}</h3>
                    <p className="text-sm text-gray-500">{source.sourceType}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200">
                      Aktif Kaynak
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">Kaynak Bilgileri</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Kapasite:</dt>
                        <dd className="font-medium">{source.estimatedCapacity ? `\${source.estimatedCapacity} m³` : '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Debi:</dt>
                        <dd className="font-medium">{source.flowRate ? `\${source.flowRate} L/s` : '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Mevsimsel:</dt>
                        <dd className="font-medium">{source.seasonal ? 'Evet' : 'Hayır'}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">Su Miktarı (Ölçüm)</h4>
                    {source.quantity ? (
                      <dl className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Ölçülen Debi:</dt>
                          <dd className="font-medium">{source.quantity.measuredFlow ? `\${source.quantity.measuredFlow} L/s` : '-'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Güvenilirlik:</dt>
                          <dd className="font-medium">{source.quantity.reliability || '-'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Ölçüm Tarihi:</dt>
                          <dd className="font-medium">{source.quantity.measurementDate ? new Date(source.quantity.measurementDate).toLocaleDateString() : '-'}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm text-gray-400">Miktar verisi bulunamadı.</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">Laboratuvar Analizi</h4>
                    {source.latestReport ? (
                      <dl className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Durum:</dt>
                          <dd className="font-medium flex items-center gap-1">
                            {source.latestReport.status === 'Approved' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                            )}
                            {source.latestReport.status}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Analiz Tarihi:</dt>
                          <dd className="font-medium">{source.latestReport.analysisDate ? new Date(source.latestReport.analysisDate).toLocaleDateString() : '-'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Parametreler:</dt>
                          <dd className="font-medium">{source.latestReport.results?.length || 0} ölçüm</dd>
                        </div>
                      </dl>
                    ) : (
                      <div className="flex items-start gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>Bu kaynağa ait su analiz raporu bulunamadı. Karar motoru tahmini verilerle çalışabilir.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {sources.length > 1 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Kaynak Karşılaştırması</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 font-medium text-gray-900 border-r">Parametre</th>
                        {sources.map(s => (
                          <th key={s.id} className="px-4 py-3 font-medium text-gray-900 border-r">{s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-600 border-r">Türü</td>
                        {sources.map(s => <td key={s.id} className="px-4 py-3 border-r">{s.sourceType}</td>)}
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-600 border-r">Durumu</td>
                        {sources.map(s => <td key={s.id} className="px-4 py-3 border-r">{s.available ? 'Mevcut' : 'Mevcut Değil'}</td>)}
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-600 border-r">pH</td>
                        {sources.map(s => {
                          const ph = s.latestReport?.results?.find(r => r.parameterName.toLowerCase() === 'ph');
                          return <td key={s.id} className="px-4 py-3 border-r">{ph ? ph.value : '-'}</td>
                        })}
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-gray-600 border-r">EC (dS/m)</td>
                        {sources.map(s => {
                          const ec = s.latestReport?.results?.find(r => r.parameterName.toLowerCase() === 'ec' || r.parameterName.toLowerCase() === 'electrical conductivity');
                          return <td key={s.id} className="px-4 py-3 border-r">{ec ? ec.value : '-'}</td>
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Droplet className="w-8 h-8 text-blue-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Su Kaynağı Bulunamadı</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">Bu parsele tanımlanmış herhangi bir su kaynağı (Kuyu, Kanal, Gölet vb.) veya su laboratuvarı analiz raporu bulunmuyor.</p>
          </div>
        )}
      </div>
    </div>
  )
}
