// @ts-nocheck
import React, { useState } from 'react'
import type { FieldLogEntry } from '../../api/fieldLogApi'
import { fieldLogApi } from '../../api/fieldLogApi'

interface Props {
  producerId: string
  parcelId: string
  onSuccess: () => void
  onCancel: () => void
}

export const FieldLogEntryForm = ({ producerId, parcelId, onSuccess, onCancel }: Props) => {
  const [operationType, setOperationType] = useState('SOWING')
  const [operationDate, setOperationDate] = useState(new Date().toISOString().slice(0,16))
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fieldLogApi.createDraft({
        producerId,
        parcelId,
        operationType,
        operationDate: new Date(operationDate).toISOString(),
        description
      })
      onSuccess()
    } catch (err: any) {
      alert(`Hata: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <h3 className="text-xl font-bold mb-4">Yeni Tarla Günlüğü Kaydı</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">İşlem Tipi</label>
          <select 
            value={operationType} 
            onChange={e => setOperationType(e.target.value)}
            className="w-full bg-slate-700 border-slate-600 rounded-lg p-2 text-white"
          >
            <option value="SOWING">Ekim (Sowing)</option>
            <option value="FERTILIZING">Gübreleme (Fertilizing)</option>
            <option value="IRRIGATION">Sulama (Irrigation)</option>
            <option value="PESTICIDE">İlaçlama (Pesticide)</option>
            <option value="HARVEST">Hasat (Harvest)</option>
            <option value="TILLAGE">Toprak İşleme (Tillage)</option>
            <option value="OBSERVATION">Gözlem (Observation)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">İşlem Tarihi</label>
          <input 
            type="datetime-local" 
            value={operationDate}
            onChange={e => setOperationDate(e.target.value)}
            className="w-full bg-slate-700 border-slate-600 rounded-lg p-2 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Açıklama / Notlar</label>
          <textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-slate-700 border-slate-600 rounded-lg p-2 text-white h-24"
            placeholder="İşlem detaylarını buraya girebilirsiniz..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            İptal
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
