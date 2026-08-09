// @ts-nocheck
import React, { useState } from 'react'
import type { FieldLogEntry } from '../../api/fieldLogApi'
import { fieldLogApi } from '../../api/fieldLogApi'

interface Props {
  log: FieldLogEntry
  onReviewed: () => void
}

export const ExpertReviewPanel = ({ log, onReviewed }: Props) => {
  const [reviewNotes, setReviewNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAction = async (action: 'verify' | 'request-revision' | 'reject') => {
    setLoading(true)
    try {
      await fieldLogApi.expertReview(log.id, action, reviewNotes)
      onReviewed()
    } catch (err: any) {
      alert(`Hata: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (log.status !== 'SUBMITTED') return null

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mt-4">
      <h4 className="text-lg font-semibold text-white mb-3">Uzman İncelemesi</h4>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">İnceleme Notları (Opsiyonel / Düzeltme için zorunlu)</label>
        <textarea 
          value={reviewNotes}
          onChange={e => setReviewNotes(e.target.value)}
          className="w-full bg-slate-700 border-slate-600 rounded-lg p-2 text-white h-20"
          placeholder="Eksik veya hatalı girişleri belirtin..."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button 
          onClick={() => handleAction('verify')}
          disabled={loading}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Doğrula (Verify)
        </button>
        <button 
          onClick={() => handleAction('request-revision')}
          disabled={loading || !reviewNotes}
          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          title={!reviewNotes ? 'Düzeltme istemek için not girmelisiniz' : ''}
        >
          Düzeltme İste
        </button>
        <button 
          onClick={() => handleAction('reject')}
          disabled={loading}
          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Reddet
        </button>
      </div>
    </div>
  )
}
