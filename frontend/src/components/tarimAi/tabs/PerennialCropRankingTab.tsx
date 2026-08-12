// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Download, Award, AlertTriangle, AlertCircle, TrendingUp } from 'lucide-react'
import { tarimAi } from '../../api/tarimAi'
import type { 
  PerennialCropRankingResponse, 
  SuitabilityClass
} from '../../api/tarimAi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert'
import { Button } from '../ui/Button'

interface PerennialCropRankingTabProps {
  parcelId: string;
}

export function PerennialCropRankingTab({ parcelId }: PerennialCropRankingTabProps) {
  const [data, setData] = useState<PerennialCropRankingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topFilter, setTopFilter] = useState<number>(10)
  const [suitabilityFilter, setSuitabilityFilter] = useState<string>('')

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (topFilter > 0) params.top = topFilter
      if (suitabilityFilter) params.suitability = suitabilityFilter

      const ranking = await tarimAi.getPerennialCropRanking(parcelId, params)
      setData(ranking)
    } catch (err: any) {
      setError('Sıralama verisi yüklenirken bir hata oluştu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [parcelId, topFilter, suitabilityFilter])

  const handleExport = (format: 'csv' | 'json' | 'excel') => {
    const url = tarimAi.getPerennialCropRankingExportUrl(parcelId, format, topFilter > 0 ? topFilter : undefined)
    window.open(url, '_blank')
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
        <span className="ml-3 text-slate-500">Uzun vadeli analiz motoru çalışıyor...</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Hata</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const getSuitabilityColor = (suitability: SuitabilityClass) => {
    switch (suitability) {
      case 'Highly Suitable': return 'bg-green-100 text-green-800'
      case 'Suitable': return 'bg-emerald-100 text-emerald-800'
      case 'Moderately Suitable': return 'bg-yellow-100 text-yellow-800'
      case 'Marginal': return 'bg-orange-100 text-orange-800'
      case 'Unsuitable': return 'bg-red-100 text-red-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500 fill-yellow-500' // Gold
      case 2: return 'text-slate-400 fill-slate-400' // Silver
      case 3: return 'text-amber-700 fill-amber-700' // Bronze
      default: return 'text-slate-300'
    }
  }

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex space-x-4 items-center">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Gösterim</label>
            <select 
              className="border rounded px-2 py-1 text-sm"
              value={topFilter}
              onChange={(e) => setTopFilter(Number(e.target.value))}
            >
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={0}>Tümü</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Uygunluk Sınıfı</label>
            <select 
              className="border rounded px-2 py-1 text-sm"
              value={suitabilityFilter}
              onChange={(e) => setSuitabilityFilter(e.target.value)}
            >
              <option value="">Tümü</option>
              <option value="Highly Suitable">Highly Suitable</option>
              <option value="Suitable">Suitable</option>
              <option value="Moderately Suitable">Moderately Suitable</option>
              <option value="Marginal">Marginal</option>
              <option value="Unsuitable">Unsuitable</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
            <Download className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
            <Download className="w-4 h-4 mr-2" /> JSON
          </Button>
        </div>
      </div>

      <div className="space-y-4 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex justify-center items-center z-10 rounded-lg">
            <Spinner />
          </div>
        )}
        
        {data?.results.map((crop) => (
          <Card key={crop.cropId} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row">
              {/* Rank Badge */}
              <div className="bg-slate-50 w-full md:w-24 flex md:flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r">
                <Award className={`w-10 h-10 \${getMedalColor(crop.rank)}`} />
                <span className="font-bold text-lg text-slate-700 mt-1">#{crop.rank}</span>
              </div>
              
              <div className="flex-1 p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-slate-800 capitalize">{crop.cropName}</h3>
                  <Badge className={getSuitabilityColor(crop.suitability)}>{crop.suitability}</Badge>
                </div>
                
                <p className="text-slate-600 text-sm mb-4 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-100 italic">
                  "{crop.explainabilitySummary}"
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm border-t pt-4">
                  <div>
                    <span className="block text-slate-400 text-xs">Güven Skoru</span>
                    <span className="font-medium text-slate-700">{crop.confidence}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-xs">Kritik Engel</span>
                    <span className={`font-medium \${crop.criticalConstraints.length > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                      {crop.criticalConstraints.length} adet
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-xs">Eksik Veri</span>
                    <span className={`font-medium \${crop.missingData.length > 0 ? 'text-orange-600' : 'text-slate-700'}`}>
                      {crop.missingData.length} parametre
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-xs">Ana Kaynak</span>
                    <span className="font-medium text-slate-700">
                      {crop.sourceSummary.laboratoryCount > 0 ? 'Laboratuvar' : 'Model'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {data?.results.length === 0 && (
          <div className="text-center p-12 bg-white rounded-lg border border-dashed border-slate-300">
            <TrendingUp className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Sonuç Bulunamadı</h3>
            <p className="text-slate-500 mt-1">Seçili filtrelere uygun çok yıllık ürün bulunmuyor.</p>
          </div>
        )}
      </div>

    </div>
  )
}
