// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, AlertCircle, Beaker, HelpCircle } from 'lucide-react'
import { tarimAi } from '../../api/tarimAi'
import type { 
  PhysicalSuitabilityAnalysisResponse, 
  CropSuitabilityResult,
  SuitabilityClass,
  ConfidenceLevel
} from '../../api/tarimAi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert'
import { Progress } from '../ui/Progress'

interface PhysicalSuitabilityTabProps {
  parcelId: string;
}

export function PhysicalSuitabilityTab({ parcelId }: PhysicalSuitabilityTabProps) {
  const [data, setData] = useState<PhysicalSuitabilityAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCrop, setSelectedCrop] = useState<CropSuitabilityResult | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const analysis = await tarimAi.analyzePhysicalSuitability(parcelId)
        setData(analysis)
        if (analysis.results.length > 0) {
          setSelectedCrop(analysis.results[0])
        }
      } catch (err: any) {
        setError('Fiziksel uygunluk analizi yüklenirken bir hata oluştu: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [parcelId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
        <span className="ml-3 text-slate-500">Karar motoru çalışıyor...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Hata</AlertTitle>
        <AlertDescription>{error || 'Veri bulunamadı.'}</AlertDescription>
      </Alert>
    )
  }

  const getSuitabilityColor = (suitability: SuitabilityClass) => {
    switch (suitability) {
      case 'Highly Suitable': return 'bg-green-100 text-green-800 border-green-200'
      case 'Suitable': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'Moderately Suitable': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Marginal': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Unsuitable': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const getConfidenceColor = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'Very High': return 'text-green-600'
      case 'High': return 'text-emerald-500'
      case 'Medium': return 'text-blue-500'
      case 'Low': return 'text-yellow-600'
      case 'Very Low': return 'text-red-500'
      default: return 'text-slate-500'
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Değerlendirilen Ürün</p>
            <p className="text-2xl font-bold">{data.summary.totalEvaluated}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <p className="text-sm text-green-700">Uygun (S1+S2+S3)</p>
            <p className="text-2xl font-bold text-green-800">{data.summary.suitable}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-4">
            <p className="text-sm text-orange-700">Marjinal (S4)</p>
            <p className="text-2xl font-bold text-orange-800">{data.summary.marginal}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4">
            <p className="text-sm text-red-700">Uygun Değil (N1+N2)</p>
            <p className="text-2xl font-bold text-red-800">{data.summary.unsuitable}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {data.results.map((res) => (
            <Card 
              key={res.cropId} 
              className={`cursor-pointer transition-colors \${selectedCrop?.cropId === res.cropId ? 'ring-2 ring-primary-500' : 'hover:bg-slate-50'}`}
              onClick={() => setSelectedCrop(res)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{res.cropName}</h4>
                  <Badge variant="outline" className={`mt-1 \${getSuitabilityColor(res.suitability)}`}>
                    {res.suitability}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Güven Skoru</p>
                  <p className={`text-sm font-medium \${getConfidenceColor(res.confidence)}`}>{res.confidence}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedCrop ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{selectedCrop.cropName} Analizi</CardTitle>
                    <CardDescription>
                      Durum: <Badge variant="outline">{selectedCrop.analysisStatus}</Badge>
                    </CardDescription>
                  </div>
                  <Badge className={`text-lg px-4 py-1 \${getSuitabilityColor(selectedCrop.suitability)}`}>
                    {selectedCrop.suitability}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {selectedCrop.criticalConstraints.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Kritik Engeller</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 mt-2">
                        {selectedCrop.criticalConstraints.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {selectedCrop.limitations.length > 0 && (
                  <Alert className="bg-orange-50 text-orange-800 border-orange-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Üretimi Kısıtlayan Faktörler</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 mt-2">
                        {selectedCrop.limitations.map((l, i) => <li key={i}>{l}</li>)}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {selectedCrop.missingData.length > 0 && (
                  <Alert className="bg-slate-50 border-slate-200">
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>Eksik Veriler</AlertTitle>
                    <AlertDescription>
                      Aşağıdaki parametreler girilmediği için hesaplama tam yapılamadı:
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedCrop.missingData.map((m, i) => (
                          <Badge key={i} variant="secondary">{m}</Badge>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-3 text-slate-700 flex items-center">
                    <Beaker className="w-4 h-4 mr-2" />
                    Veri Kaynağı Özeti (Source Summary)
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-slate-500">Laboratuvar</p>
                      <p className="font-bold">{selectedCrop.sourceSummary.laboratoryCount}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-slate-500">Model</p>
                      <p className="font-bold">{selectedCrop.sourceSummary.modelCount}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-slate-500">Uzman</p>
                      <p className="font-bold">{selectedCrop.sourceSummary.expertCount}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <p className="text-slate-500">Eksik</p>
                      <p className="font-bold">{selectedCrop.sourceSummary.missingCount}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3 text-slate-700">Karar Açıklaması (Explainability)</h4>
                  <div className="border rounded-md divide-y">
                    {selectedCrop.explainability.length > 0 ? selectedCrop.explainability.map((exp, i) => (
                      <div key={i} className="p-3 hover:bg-slate-50 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-900">{exp.category} / {exp.criterion}</span>
                          <Badge variant="outline" className={exp.result === 'Pass' ? 'text-green-600' : exp.result === 'Missing' ? 'text-slate-500' : 'text-red-600'}>
                            {exp.result}
                          </Badge>
                        </div>
                        <p className="text-slate-500 mt-1">{exp.explanation}</p>
                        <p className="text-xs text-slate-400 mt-1">Kaynak: {exp.source} | Kural: {exp.rule}</p>
                      </div>
                    )) : (
                      <div className="p-4 text-center text-slate-500 text-sm">Henüz açıklama kaydı yok.</div>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-center items-center h-full border-2 border-dashed rounded-lg p-12 text-slate-400">
              Detayları görmek için sol menüden bir ürün seçin
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
