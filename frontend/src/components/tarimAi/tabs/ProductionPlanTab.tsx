import { useState, useEffect } from 'react'

export function ProductionPlanTab({ cropCode, parcelId }: { cropCode?: string; parcelId?: string }) {
  const [plantingDate, setPlantingDate] = useState<string>('')
  const [plan, setPlan] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // if cropCode changes and we already had a plan for another crop, we might want to reset
  useEffect(() => {
    setPlan(null)
    setTasks([])
    setPlantingDate('')
  }, [cropCode])

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cropCode || !plantingDate) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/production-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropCode,
          parcelId,
          plantingDate,
        })
      })
      if (!res.ok) {
        throw new Error('Plan oluşturulurken hata oluştu.')
      }
      const data = await res.json()
      setPlan(data)
      await fetchTasks(data.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async (planId: string) => {
    try {
      const res = await fetch(`/api/production-plans/${planId}/tasks`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      const res = await fetch(`/api/production-plans/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        // Refetch tasks to get any cascading changes or at least updated status
        await fetchTasks(plan.id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelayTask = async (taskId: string, newStartDate: string, newDueDate: string) => {
    try {
      const res = await fetch(`/api/production-plans/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: newStartDate, dueDate: newDueDate, reason: 'Kullanıcı ertelemesi' })
      })
      if (res.ok) {
        await fetchTasks(plan.id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (!cropCode) {
    return (
      <div className="tai2-panel p-6 text-center text-slate-500">
        Lütfen önce bir ürün seçin veya analiz sonuçlarından önerilen bir ürüne tıklayın.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Üretim Planım</h2>
        <div className="text-sm font-medium text-slate-500">Ürün Kodu: {cropCode}</div>
      </div>

      {!plan ? (
        <form onSubmit={handleCreatePlan} className="tai2-panel p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4 max-w-md">
          <h3 className="font-semibold text-lg">Yeni Plan Oluştur</h3>
          <p className="text-sm text-slate-600">Bu ürün için tahmini ekim tarihinizi girerek dinamik üretim planınızı oluşturun.</p>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ekim Tarihi</label>
            <input 
              type="date" 
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
            />
          </div>

          {error && <div className="text-sm text-rose-500">{error}</div>}

          <button 
            type="submit" 
            disabled={loading || !plantingDate}
            className="w-full py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Oluşturuluyor...' : 'Planı Oluştur'}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="tai2-panel p-4 flex-1 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Ekim Tarihi</div>
              <div className="font-semibold text-lg">{plan.plantingDate}</div>
            </div>
            <div className="tai2-panel p-4 flex-1 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Toplam Görev</div>
              <div className="font-semibold text-lg">{tasks.length}</div>
            </div>
            <div className="tai2-panel p-4 flex-1 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Durum</div>
              <div className="font-semibold text-lg text-emerald-600">{plan.status}</div>
            </div>
          </div>

          <div className="tai2-panel rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h3 className="font-semibold">Zaman Çizelgesi (Timeline)</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 border-b text-sm text-slate-600">
                    <th className="p-4 font-medium">Görev</th>
                    <th className="p-4 font-medium">Başlangıç</th>
                    <th className="p-4 font-medium">Bitiş</th>
                    <th className="p-4 font-medium">Öncelik</th>
                    <th className="p-4 font-medium">Durum</th>
                    <th className="p-4 font-medium text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {tasks.map(task => (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{task.title}</div>
                        <div className="text-xs text-slate-500 mt-1">{task.description}</div>
                      </td>
                      <td className="p-4 text-slate-600">{task.startDate}</td>
                      <td className="p-4 text-slate-600">{task.dueDate}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          task.priority === 'Critical' ? 'bg-rose-100 text-rose-700' :
                          task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <select 
                          className="text-xs border rounded p-1"
                          value={task.status}
                          onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                        >
                          <option value="Planned">Planlandı</option>
                          <option value="In Progress">Devam Ediyor</option>
                          <option value="Completed">Tamamlandı</option>
                          <option value="Skipped">Atlandı</option>
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          className="text-xs text-indigo-600 hover:underline"
                          onClick={() => {
                            const newStart = prompt('Yeni başlangıç tarihi (YYYY-MM-DD):', task.startDate);
                            if (newStart) {
                              const newDue = prompt('Yeni bitiş tarihi (YYYY-MM-DD):', task.dueDate);
                              if (newDue) {
                                handleDelayTask(task.id, newStart, newDue);
                              }
                            }
                          }}
                        >
                          Tarih Değiştir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tasks.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">Görev bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
