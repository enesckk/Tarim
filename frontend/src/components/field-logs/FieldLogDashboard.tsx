// @ts-nocheck
import React, { useEffect, useState } from 'react'
import type { FieldLogEntry } from '../../api/fieldLogApi'
import { fieldLogApi } from '../../api/fieldLogApi'

import { ExpertReviewPanel } from './ExpertReviewPanel'
import { FieldLogEntryForm } from './FieldLogEntryForm'
import { useAuth } from '../../auth/AuthContext'
import { isStaff } from '../../auth/roles'

export const FieldLogDashboard = ({ producerId, onAddLog }: { producerId: string, onAddLog?: () => void }) => {
  const { user } = useAuth() || {}
  const [isAdding, setIsAdding] = useState(false)
  const [logs, setLogs] = useState<FieldLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const data = await fieldLogApi.getLogsByProducer(producerId)
      setLogs(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [producerId])

  const handleSubmit = async (id: string) => {
    try {
      await fieldLogApi.submitLog(id)
      fetchLogs()
    } catch (err: any) {
      alert(`Hata: ${err.message}`)
    }
  }

  const getBadgeColor = (status: string) => {
    switch(status) {
      case 'DRAFT': return 'bg-gray-500'
      case 'SUBMITTED': return 'bg-yellow-500'
      case 'VERIFIED': return 'bg-green-500'
      case 'REJECTED': return 'bg-red-500'
      case 'REVISION_REQUIRED': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) return <div className="p-4">Yükleniyor...</div>
  if (error) return <div className="p-4 text-red-500">Hata: {error}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Tarla Günlüğü</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium"
        >
          Yeni Kayıt Ekle
        </button>
      </div>

      {isAdding && (
        <FieldLogEntryForm 
          producerId={producerId}
          parcelId="00000000-0000-0000-0000-000000000000"
          onSuccess={() => {
            setIsAdding(false)
            fetchLogs()
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {!isAdding && logs.length === 0 ? (
        <p className="text-gray-400">Henüz kayıt bulunmuyor.</p>
      ) : (
        <div className="grid gap-4">
          {logs.map(log => (
            <React.Fragment key={log.id}>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{log.entryCode} - {log.operationType}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full text-white ${getBadgeColor(log.status)}`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">Tarih: {new Date(log.operationDate).toLocaleString()}</p>
                {log.description && <p className="text-sm text-gray-300 mt-2">{log.description}</p>}
              </div>
              <div className="mt-4 sm:mt-0">
                {log.status === 'DRAFT' && (
                  <button 
                    onClick={() => handleSubmit(log.id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm"
                  >
                    Onaya Gönder
                  </button>
                )}
              </div>
            </div>
            {log.status === 'SUBMITTED' && user && isStaff(user.roles) && (
              <ExpertReviewPanel log={log} onReviewed={fetchLogs} />
            )}
          </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
