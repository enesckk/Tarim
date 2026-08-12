// @ts-nocheck
import { useEffect, useState } from 'react'
import type { AnalysisResult } from '../../../../shared/api-types/tarimAi'
import { tarimAi } from '../../../api/tarimAi'
import type { SoilAnalysisReport } from '../../../api/tarimAi'
import { FileText, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'

export function SoilLabTab({
  result,
  parcelId,
}: {
  result: AnalysisResult
  parcelId: string
}) {
  const [report, setReport] = useState<SoilAnalysisReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tarimAi.getSoilLaboratoryReport(parcelId).then((data) => {
      setReport(data)
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
            <FileText className="text-primary-600" />
            Laboratuvar Analiz Sonuçları
          </h2>
          {report ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Sistemde Mevcut
            </span>
          ) : (
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
              Kayıt Bulunamadı
            </span>
          )}
        </div>

        {report ? (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Rapor Bilgileri</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Laboratuvar:</dt>
                  <dd className="font-medium">{report.labName || 'Bilinmiyor'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tarih:</dt>
                  <dd className="font-medium">{report.analysisDate ? new Date(report.analysisDate).toLocaleDateString() : 'Bilinmiyor'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Derinlik:</dt>
                  <dd className="font-medium">{report.sampleDepth || 'Bilinmiyor'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Durum:</dt>
                  <dd className="font-medium">{report.status}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Kalite Kontrol</h3>
              {report.qualityControl ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Tamamlanma:</dt>
                    <dd className="font-medium flex items-center gap-1">
                      {report.qualityControl.completeness >= 90 ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                      %{report.qualityControl.completeness.toFixed(1)}
                    </dd>
                  </div>
                  {report.qualityControl.missingFields.length > 0 && (
                    <div className="flex justify-between text-red-600">
                      <dt>Eksik Parametreler:</dt>
                      <dd>{report.qualityControl.missingFields.length} adet</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-gray-500">Kalite kontrol verisi yok.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Bu parsele ait güncel bir toprak analiz raporu bulunmuyor.</p>
            <p className="text-sm text-gray-400">Tarım AI Karar Motoru şu anda SoilGrids uydu verilerini kullanarak tahmin yürütüyor.</p>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">SoilGrids Kıyaslaması (Tahmin vs. Laboratuvar)</h3>
        <p className="text-sm text-gray-500 mb-4">Karar motoru önce Toprak Laboratuvarını, eksik kısımlarda ise SoilGrids'i kullanır.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-900">Parametre</th>
                <th className="px-4 py-3 font-medium text-gray-900">Laboratuvar Sonucu</th>
                <th className="px-4 py-3 font-medium text-gray-900">SoilGrids Tahmini</th>
                <th className="px-4 py-3 font-medium text-gray-900">Karar Motoru Kaynağı</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-3 font-medium">pH</td>
                <td className="px-4 py-3 text-green-700">{report?.results?.find(r => r.parameterName.toLowerCase() === 'ph')?.value ?? '-'}</td>
                <td className="px-4 py-3 text-gray-500">{result.snapshot.soil.ph.toFixed(1)}</td>
                <td className="px-4 py-3">
                  {report?.results?.find(r => r.parameterName.toLowerCase() === 'ph') ? 'Toprak Laboratuvarı' : 'SoilGrids'}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Organik Madde (%)</td>
                <td className="px-4 py-3 text-green-700">{report?.results?.find(r => r.parameterName.toLowerCase() === 'organic matter')?.value ?? '-'}</td>
                <td className="px-4 py-3 text-gray-500">{result.snapshot.soil.organicMatterPercent.toFixed(1)}</td>
                <td className="px-4 py-3">
                  {report?.results?.find(r => r.parameterName.toLowerCase() === 'organic matter') ? 'Toprak Laboratuvarı' : 'SoilGrids'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
