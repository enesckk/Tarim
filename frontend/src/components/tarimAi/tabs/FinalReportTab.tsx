// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Download, FileText, CheckCircle, AlertTriangle, AlertCircle, Info, Database } from 'lucide-react'
import { tarimAi } from '../../api/tarimAi'
import type { FinalAnalysisReport } from '../../api/tarimAi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert'
import { Button } from '../ui/Button'

interface FinalReportTabProps {
  parcelId: string;
}

export function FinalReportTab({ parcelId }: FinalReportTabProps) {
  const [data, setData] = useState<FinalAnalysisReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const report = await tarimAi.getFinalReport(parcelId)
        setData(report)
      } catch (err: any) {
        setError('Rapor verisi yüklenirken bir hata oluştu: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [parcelId])

  const handleExport = (format: 'html' | 'json' | 'pdf') => {
    const url = tarimAi.getFinalReportExportUrl(parcelId, format)
    window.open(url, '_blank')
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <Spinner size="lg" />
        <span className="text-slate-500">Nihai XAI Analiz Raporu oluşturuluyor, lütfen bekleyin...</span>
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

  if (!data) return null;

  return (
    <div className="space-y-6">
      
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm border space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-blue-600" />
            Final Analysis Report
          </h2>
          <p className="text-sm text-slate-500 mt-1">ID: {data.reportId} | Versiyon: {data.reportVersion}</p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('html')}>
            <Download className="w-4 h-4 mr-2" /> HTML
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
            <Download className="w-4 h-4 mr-2" /> JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Overall Status</span>
            <span className={`text-xl font-bold \${data.executiveSummary.overallStatus === 'Favorable' ? 'text-green-600' : 'text-orange-600'}`}>
              {data.executiveSummary.overallStatus}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Recommended Crops</span>
            <span className="text-2xl font-bold text-blue-600">
              {data.executiveSummary.recommendedSeasonalCrops + data.executiveSummary.recommendedPerennialCrops}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Overall Confidence</span>
            <span className="text-xl font-bold text-indigo-600">{data.executiveSummary.overallConfidence}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Critical Missing</span>
            <span className={`text-2xl font-bold \${data.executiveSummary.criticalMissingData > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {data.executiveSummary.criticalMissingData}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Environment Summaries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Environment Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-700 text-sm mb-1">Soil Analysis</h4>
              <p className="text-sm text-slate-600">{data.soilAnalysis.summary}</p>
              <div className="flex space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">{data.soilAnalysis.usedSources.join(', ')}</Badge>
                <Badge variant="outline" className="text-xs">Conf: {data.soilAnalysis.confidence}</Badge>
              </div>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-slate-700 text-sm mb-1">Water Analysis</h4>
              <p className="text-sm text-slate-600">{data.waterAnalysis.summary}</p>
              <div className="flex space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">{data.waterAnalysis.usedSources.join(', ')}</Badge>
                <Badge variant="outline" className="text-xs">Conf: {data.waterAnalysis.confidence}</Badge>
              </div>
            </div>
            <div className="border-t pt-3">
              <h4 className="font-semibold text-slate-700 text-sm mb-1">Climate Analysis</h4>
              <p className="text-sm text-slate-600">{data.climateAnalysis.summary}</p>
            </div>
          </CardContent>
        </Card>

        {/* Constraints & Missing Data */}
        <div className="space-y-6">
          <Card className="border-orange-200">
            <CardHeader className="bg-orange-50 rounded-t-lg pb-4">
              <CardTitle className="text-lg text-orange-800 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" /> Critical Constraints
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {data.criticalConstraints.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                  {data.criticalConstraints.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Kritik fizyolojik engel bulunamadı.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="bg-red-50 rounded-t-lg pb-4">
              <CardTitle className="text-lg text-red-800 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" /> Missing Data
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {data.missingData.missingSources.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase">Eksik Kaynaklar</h5>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {data.missingData.missingSources.map((s, i) => <Badge key={i} variant="destructive">{s}</Badge>)}
                  </div>
                </div>
              )}
              {data.missingData.missingParameters.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase">Eksik Parametreler</h5>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 mt-1">
                    {data.missingData.missingParameters.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              <p className="text-xs italic text-red-600 mt-2">{data.missingData.confidenceImpact}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Top Seasonal Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Crop</th>
                  <th className="px-4 py-3">Suitability</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Explainability</th>
                </tr>
              </thead>
              <tbody>
                {data.seasonalRanking.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3 font-bold">#{r.rank}</td>
                    <td className="px-4 py-3 capitalize font-medium">{r.cropName}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{r.suitability}</Badge></td>
                    <td className="px-4 py-3">{r.confidence}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs italic">{r.explainabilitySummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Perennial Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Crop</th>
                  <th className="px-4 py-3">Suitability</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Explainability</th>
                </tr>
              </thead>
              <tbody>
                {data.perennialRanking.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3 font-bold">#{r.rank}</td>
                    <td className="px-4 py-3 capitalize font-medium">{r.cropName}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{r.suitability}</Badge></td>
                    <td className="px-4 py-3">{r.confidence}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs italic">{r.explainabilitySummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Traceability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Database className="w-5 h-5 mr-2" /> Data Source Traceability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border rounded">
              <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                <tr>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Version</th>
                  <th className="px-4 py-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {data.dataSources.map((s, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-2 font-medium">{s.sourceName}</td>
                    <td className="px-4 py-2">
                      <Badge className={s.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{s.version}</td>
                    <td className="px-4 py-2">{s.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
