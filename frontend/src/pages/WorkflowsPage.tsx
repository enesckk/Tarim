import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Camera,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Scale,
  Sprout,
  Trash2,
  Workflow,
} from 'lucide-react'
import { api } from '../api/client'
import type { Land, Producer, Season, Workflow as WorkflowType, WorkflowStep } from '../api/types'
import { WORKFLOW_STATUS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import '../layout/layout.css'

type StepDraft = {
  name: string
  description: string
  order: number
  dueDaysFromStart: number
  requiresPhoto: boolean
  requiresQuantity: boolean
  requiresDate: boolean
  quantityUnit: string
  expanded: boolean
}

const blankStep = (
  order: number,
  expanded = true,
  dueDaysFromStart = 0,
): StepDraft => ({
  name: '',
  description: '',
  order,
  dueDaysFromStart,
  requiresPhoto: false,
  requiresQuantity: false,
  requiresDate: false,
  quantityUnit: '',
  expanded,
})

/** Days after previous step (0 for first). Planner-facing gap on the calendar. */
function daysAfterPrevious(steps: StepDraft[], index: number): number | null {
  if (index <= 0) return null
  const prev = Number(steps[index - 1].dueDaysFromStart) || 0
  const cur = Number(steps[index].dueDaysFromStart) || 0
  return cur - prev
}

function duePillLabel(steps: StepDraft[], index: number): string {
  const day = Number(steps[index].dueDaysFromStart) || 0
  const gap = daysAfterPrevious(steps, index)
  if (gap == null) return day === 0 ? 'Başlangıç (gün 0)' : `Gün ${day}`
  if (gap === 0) return `Gün ${day} · aynı gün`
  if (gap > 0) return `Gün ${day} · +${gap} gün`
  return `Gün ${day}`
}

function dayHintFirst(due: number): string {
  const day = Number(due) || 0
  return day === 0
    ? 'Üretim başladığı gün'
    : `Başlangıçtan ${day} gün sonra`
}

function dayHintAfter(gap: number | null, due: number): string {
  const day = Number(due) || 0
  if (gap == null) return `Başlangıçtan gün ${day}`
  if (gap < 0) return 'Önceki adımdan önce — düzeltin'
  if (gap === 0) return 'Önceki adımla aynı gün'
  return `Önceki adımdan ${gap} gün sonra`
}

/**
 * Domates üretim şablonu — DueDaysFromStart offsets (open-field tomato ~130 day season):
 *  0  Tarla hazırlığı — season start / soil prep window
 *  7  Toprak analizi — lab turnaround after sampling
 * 14  Gübreleme (taban) — base fertilizer before transplant
 * 21  Sulama sistemi — drip install before planting
 * 28  Fide dikimi — transplant day
 * 29  Can suyu — same day / immediate post-plant irrigation
 * 35  Fide kontrolü — week-1 stand establishment
 * 49  Düzenli sulama — vegetative watering log checkpoint
 * 56  Çapalama — first cultivation / weed control
 * 63  Ara gübreleme — side-dress before flowering push
 * 77  Hastalık-zararlı — mid-season scouting
 * 84  İlaçlama — treatment window after scouting
 * 98  Çiçeklenme — flowering / fruit set check
 *112  Ürün gelişim — pre-harvest weekly status photo
 *120  Hasat — first major harvest entry
 *130  Teslimat ve gelir — sale / delivery close-out
 */
function createDomatesTemplateSteps(): StepDraft[] {
  const rows: Array<{
    name: string
    description: string
    due: number
    photo?: boolean
    quantity?: boolean
    date?: boolean
    unit?: string
  }> = [
    {
      name: 'Tarla hazırlığı',
      description: 'Toprağı derin sürmeyin; taş ve bitki artıklarını temizleyin.',
      due: 0,
      photo: true,
    },
    {
      name: 'Toprak analizi',
      description: 'Numuneyi 0–30 cm derinlikten alın; sonuç gelmeden gübrelemeyin.',
      due: 7,
      photo: true,
    },
    {
      name: 'Gübreleme',
      description: 'Taban gübresini ekim/dikim öncesi karıştırın; miktarı not edin.',
      due: 14,
      quantity: true,
      unit: 'kg',
      photo: true,
    },
    {
      name: 'Sulama sistemi',
      description: 'Damlama hortumlarını kontrol edin; tıkanık noktaları açın.',
      due: 21,
      photo: true,
    },
    {
      name: 'Fide dikimi',
      description: 'Fideleri serin saatlerde dikin; kök boğazını gömmeyin.',
      due: 28,
      quantity: true,
      unit: 'adet',
      date: true,
      photo: true,
    },
    {
      name: 'Can suyu',
      description: 'Dikimden hemen sonra sulayın; kök boğazını ıslatmayın.',
      due: 29,
      photo: true,
    },
    {
      name: 'Fide kontrolü',
      description: 'Tutmayan fideleri değiştirin; solgun olanları işaretleyin.',
      due: 35,
      photo: true,
    },
    {
      name: 'Düzenli sulama',
      description: 'Sulamayı sabah erken yapın; aşırı su birikimini önleyin.',
      due: 49,
      quantity: true,
      unit: 'saat',
      date: true,
    },
    {
      name: 'Çapalama ve ot temizliği',
      description: 'Kök çevresine zarar vermeden çapalayın; otları tarladan çıkarın.',
      due: 56,
      photo: true,
    },
    {
      name: 'Ara gübreleme',
      description: 'Üst gübreyi damlama ile veya sıra arasına verin; yaprağa sıçratmayın.',
      due: 63,
      quantity: true,
      unit: 'kg',
      date: true,
      photo: true,
    },
    {
      name: 'Hastalık-zararlı kontrolü',
      description: 'Alt yaprakları ve gövdeyi inceleyin; leke veya zararlı görürseniz fotoğraf çekin.',
      due: 77,
      photo: true,
    },
    {
      name: 'İlaçlama',
      description: 'Rüzgardı az iken ilaçlayın; hasat öncesi bekleme süresine uyun.',
      due: 84,
      quantity: true,
      unit: 'litre',
      date: true,
      photo: true,
    },
    {
      name: 'Çiçeklenme kontrolü',
      description: 'Çiçek dökümü fazla ise sulama ve beslemeyi gözden geçirin.',
      due: 98,
      photo: true,
    },
    {
      name: 'Ürün gelişim kontrolü',
      description: 'Haftalık genel tarla fotoğrafı çekin; renk ve büyüme farklarını not edin.',
      due: 112,
      photo: true,
    },
    {
      name: 'Hasat',
      description: 'Olgun meyveyi sabah toplayın; ezik veya hastalıklı olanları ayırın.',
      due: 120,
      quantity: true,
      unit: 'kg',
      date: true,
      photo: true,
    },
    {
      name: 'Teslimat ve gelir',
      description: 'Teslim miktarı ve fiyatı not edin; fiş veya makbuz fotoğrafı ekleyin.',
      due: 130,
      quantity: true,
      unit: 'kg',
      date: true,
    },
  ]

  return rows.map((r, i) => ({
    name: r.name,
    description: r.description,
    order: i + 1,
    dueDaysFromStart: r.due,
    requiresPhoto: Boolean(r.photo),
    requiresQuantity: Boolean(r.quantity),
    requiresDate: Boolean(r.date),
    quantityUnit: r.unit ?? '',
    expanded: i === 0,
  }))
}

function toDrafts(steps: WorkflowStep[]): StepDraft[] {
  if (!steps.length) return [blankStep(1)]
  return [...steps]
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({
      name: s.name,
      description: s.description ?? '',
      order: i + 1,
      dueDaysFromStart: s.dueDaysFromStart ?? 0,
      requiresPhoto: s.requiresPhoto,
      requiresQuantity: Boolean(s.requiresQuantity),
      requiresDate: Boolean(s.requiresDate),
      quantityUnit: s.quantityUnit ?? '',
      expanded: false,
    }))
}

function evidenceChips(step: StepDraft | WorkflowStep): string[] {
  const chips: string[] = []
  if ('requiresPhoto' in step && step.requiresPhoto) chips.push('Fotoğraf')
  if ('requiresQuantity' in step && step.requiresQuantity) {
    const unit =
      'quantityUnit' in step && step.quantityUnit ? step.quantityUnit : ''
    chips.push(unit ? `Miktar (${unit})` : 'Miktar')
  }
  if ('requiresDate' in step && step.requiresDate) chips.push('Tarih')
  return chips
}

export function WorkflowsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cropType, setCropType] = useState('')
  const [steps, setSteps] = useState<StepDraft[]>([blankStep(1)])
  const [showEditor, setShowEditor] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [showMetaExtra, setShowMetaExtra] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [assign, setAssign] = useState({
    workflowId: '',
    producerId: '',
    landId: '',
    seasonId: '',
  })

  const workflowsQuery = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api<WorkflowType[]>('/api/workflows', {}, token),
    enabled: Boolean(token),
  })

  const producersQuery = useQuery({
    queryKey: ['producers'],
    queryFn: () => api<Producer[]>('/api/producers', {}, token),
    enabled: Boolean(token),
  })

  const landsQuery = useQuery({
    queryKey: ['lands'],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token),
  })

  const seasonsQuery = useQuery({
    queryKey: ['seasons'],
    queryFn: () => api<Season[]>('/api/seasons', {}, token),
    enabled: Boolean(token),
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        cropType: cropType || null,
        steps: steps.map((s, i) => ({
          name: s.name.trim(),
          description: s.description.trim() || null,
          order: i + 1,
          dueDaysFromStart: Number(s.dueDaysFromStart),
          requiresPhoto: s.requiresPhoto,
          requiresQuantity: s.requiresQuantity,
          requiresDate: s.requiresDate,
          quantityUnit: s.requiresQuantity ? s.quantityUnit.trim() || null : null,
        })),
      }
      if (editingId) {
        await api(`/api/workflows/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        }, token)
      } else {
        await api('/api/workflows', {
          method: 'POST',
          body: JSON.stringify(payload),
        }, token)
      }
    },
    onSuccess: async () => {
      resetEditor()
      await queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })

  const assignMutation = useMutation({
    mutationFn: () =>
      api(
        '/api/workflows/assign',
        {
          method: 'POST',
          body: JSON.stringify({
            seasonId: assign.seasonId,
            workflowId: assign.workflowId,
            producerId: assign.producerId,
            landId: assign.landId,
          }),
        },
        token,
      ),
    onSuccess: () => {
      setAssign({ workflowId: '', producerId: '', landId: '', seasonId: '' })
    },
  })

  const items = workflowsQuery.data ?? []

  const canAssign = useMemo(
    () =>
      Boolean(assign.workflowId && assign.producerId && assign.landId && assign.seasonId),
    [assign],
  )

  function resetEditor() {
    setEditingId(null)
    setName('')
    setDescription('')
    setCropType('')
    setSteps([blankStep(1)])
    setShowEditor(false)
    setShowMetaExtra(false)
    setValidationError(null)
  }

  function startCreate() {
    setEditingId(null)
    setName('')
    setDescription('')
    setCropType('')
    setSteps([blankStep(1)])
    setShowEditor(true)
    setShowMetaExtra(false)
    setValidationError(null)
  }

  function startEdit(wf: WorkflowType) {
    setEditingId(wf.id)
    setName(wf.name)
    setDescription(wf.description ?? '')
    setCropType(wf.cropType ?? '')
    setSteps(toDrafts(wf.steps))
    setShowEditor(true)
    setShowMetaExtra(Boolean(wf.description?.trim()))
    setValidationError(null)
  }

  function applyDomatesTemplate() {
    setName((prev) => prev.trim() || 'Domates üretim akışı')
    setCropType((prev) => prev.trim() || 'Domates')
    setDescription(
      (prev) =>
        prev.trim() ||
        'Açık alan domates: tarla hazırlığından hasada.',
    )
    setSteps(createDomatesTemplateSteps())
    setShowMetaExtra(true)
    setValidationError(null)
  }

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function addStep() {
    setSteps((prev) => {
      const lastDue = Number(prev[prev.length - 1]?.dueDaysFromStart) || 0
      const next = prev.map((s) => ({ ...s, expanded: false }))
      // Default: one week after the previous step so the calendar has a clear gap.
      return [...next, blankStep(next.length + 1, true, lastDue + 7)]
    })
  }

  function removeStep(index: number) {
    setSteps((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.splice(target, 0, item)
      return copy.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  function toggleExpand(index: number) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, expanded: !s.expanded } : s)),
    )
  }

  function validateDraft(): string | null {
    if (!name.trim()) return 'İş akışı adı zorunludur.'
    if (steps.length < 1) return 'En az bir adım ekleyin.'
    if (!steps.every((s) => s.name.trim())) return 'Her adımın bir başlığı olmalıdır.'
    const orders = steps.map((_, i) => i + 1)
    if (new Set(orders).size !== orders.length) return 'Adım sıraları benzersiz olmalıdır.'
    for (const s of steps) {
      if (s.requiresQuantity && !s.quantityUnit.trim()) {
        return `"${s.name || 'Adım'}" için miktar birimi girin (kg, adet, litre…).`
      }
      if (Number(s.dueDaysFromStart) < 0) {
        return 'Başlangıçtan gün sayısı 0 veya pozitif olmalıdır.'
      }
    }
    for (let i = 1; i < steps.length; i++) {
      const prev = Number(steps[i - 1].dueDaysFromStart) || 0
      const cur = Number(steps[i].dueDaysFromStart) || 0
      if (cur < prev) {
        const label = steps[i].name.trim() || `Adım ${i + 1}`
        return `"${label}" günü önceki adımdan küçük olamaz (takvim geriye gitmesin).`
      }
    }
    return null
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const err = validateDraft()
    if (err) {
      setValidationError(err)
      return
    }
    setValidationError(null)
    save.mutate()
  }

  return (
    <section className="wf-page">
      <div className="page-header">
        <div>
          <h1>İş akışları</h1>
          <p>Üretim şablonları — araziye atanır, üreticiye görev olur.</p>
        </div>
        {!showEditor && (
          <button type="button" className="primary-btn" onClick={startCreate}>
            <Plus size={16} />
            Yeni iş akışı
          </button>
        )}
      </div>

      {showEditor && (
        <div className="panel workflow-builder wf-editor">
          <div className="wf-editor-top">
            <div>
              <h2 className="wf-editor-title">
                {editingId ? 'Şablonu düzenle' : 'Yeni şablon'}
              </h2>
            </div>
            <div className="wf-editor-top-actions">
              <button
                type="button"
                className="ghost-btn template-btn"
                onClick={applyDomatesTemplate}
              >
                <Sprout size={15} />
                Domates şablonu
              </button>
              <button type="button" className="ghost-btn" onClick={resetEditor}>
                Kapat
              </button>
            </div>
          </div>

          <form className="wf-editor-form" onSubmit={onSubmit}>
            <div className="wf-meta">
              <label className="wf-field">
                Ad
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Örn. Domates üretim akışı"
                />
              </label>
              <label className="wf-field">
                Ürün
                <input
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder="Örn. Domates"
                />
              </label>
            </div>

            <button
              type="button"
              className="wf-disclosure"
              onClick={() => setShowMetaExtra((v) => !v)}
              aria-expanded={showMetaExtra}
            >
              {showMetaExtra ? 'Açıklamayı gizle' : 'Açıklama ekle'}
              {showMetaExtra ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showMetaExtra && (
              <label className="wf-field">
                Açıklama
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kısa özet (isteğe bağlı)"
                  rows={2}
                />
              </label>
            )}

            <div className="wf-steps-head">
              <div className="wf-steps-label">
                <span>Adımlar</span>
                <span className="step-count-badge">{steps.length}</span>
              </div>
              <button type="button" className="ghost-btn" onClick={addStep}>
                <Plus size={15} />
                Adım ekle
              </button>
            </div>

            {steps.length > 0 && (
              <div className="wf-plan-preview" aria-label="Takvim planı">
                <div className="wf-plan-preview-label">
                  <Calendar size={13} />
                  Takvim planı
                  <span className="wf-plan-preview-hint">
                    (başlangıçtan gün)
                  </span>
                </div>
                <div className="wf-plan-preview-track">
                  {steps.map((s, i) => {
                    const day = Number(s.dueDaysFromStart) || 0
                    const gap = daysAfterPrevious(steps, i)
                    return (
                      <span key={i} className="wf-plan-node">
                        {i > 0 ? (
                          <span className="wf-plan-arrow" aria-hidden>
                            →
                          </span>
                        ) : null}
                        <span className="wf-plan-chip">
                          <span className="wf-plan-chip-day">Gün {day}</span>
                          {gap != null && gap > 0 ? (
                            <span className="wf-plan-chip-gap">+{gap}</span>
                          ) : null}
                          <span className="wf-plan-chip-name">
                            {s.name.trim() || `Adım ${i + 1}`}
                          </span>
                        </span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="steps-editor">
              {steps.map((step, index) => {
                const chips = evidenceChips(step)
                const gap = daysAfterPrevious(steps, index)
                return (
                  <div
                    className={`step-card step-card-rich${step.expanded ? ' is-expanded' : ''}`}
                    key={index}
                  >
                    <div className="step-card-toolbar">
                      <button
                        type="button"
                        className="step-expand-btn"
                        onClick={() => toggleExpand(index)}
                        aria-expanded={step.expanded}
                      >
                        <span className="step-order-chip">{index + 1}</span>
                        <span className="step-expand-text">
                          <span className="step-expand-title">
                            {step.name.trim() || `Adım ${index + 1}`}
                          </span>
                          <span className="step-expand-meta">
                            <span className="wf-pill muted">
                              <Calendar size={11} />
                              {duePillLabel(steps, index)}
                            </span>
                            {chips.length > 0 ? (
                              chips.map((c) => (
                                <span key={c} className="wf-pill">
                                  {c}
                                </span>
                              ))
                            ) : (
                              <span className="wf-pill muted">Kontrol</span>
                            )}
                          </span>
                        </span>
                      </button>
                      <div className="step-card-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Yukarı"
                          disabled={index === 0}
                          onClick={() => moveStep(index, -1)}
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Aşağı"
                          disabled={index === steps.length - 1}
                          onClick={() => moveStep(index, 1)}
                        >
                          <ChevronDown size={16} />
                        </button>
                        {steps.length > 1 && (
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Kaldır"
                            onClick={() => removeStep(index)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {step.expanded && (
                      <div className="step-card-body">
                        <div className="wf-step-grid">
                          <label className="wf-field">
                            Başlık
                            <input
                              value={step.name}
                              onChange={(e) => updateStep(index, { name: e.target.value })}
                              required
                              placeholder="Örn. Gübreleme"
                            />
                          </label>
                          <label className="wf-field wf-due">
                            Başlangıçtan gün
                            <input
                              type="number"
                              min={0}
                              value={step.dueDaysFromStart}
                              onChange={(e) =>
                                updateStep(index, {
                                  dueDaysFromStart: Number(e.target.value),
                                })
                              }
                              aria-describedby={`wf-due-hint-${index}`}
                            />
                            <span id={`wf-due-hint-${index}`} className="wf-due-hint">
                              {index === 0
                                ? dayHintFirst(step.dueDaysFromStart)
                                : dayHintAfter(gap, step.dueDaysFromStart)}
                            </span>
                          </label>
                        </div>
                        <label className="wf-field">
                          Üreticiye bilgi
                          <textarea
                            value={step.description}
                            onChange={(e) =>
                              updateStep(index, { description: e.target.value })
                            }
                            placeholder="Örn. Sulamayı sabah erken yapın, kök boğazını ıslatmayın."
                            rows={2}
                          />
                        </label>

                        <div className="wf-evidence">
                          <span className="wf-evidence-label">Zorunlu alanlar</span>
                          <div className="wf-toggle-row">
                            <label
                              className={`wf-toggle${step.requiresPhoto ? ' is-on' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={step.requiresPhoto}
                                onChange={(e) =>
                                  updateStep(index, { requiresPhoto: e.target.checked })
                                }
                              />
                              <Camera size={14} />
                              Fotoğraf
                            </label>
                            <label
                              className={`wf-toggle${step.requiresQuantity ? ' is-on' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={step.requiresQuantity}
                                onChange={(e) =>
                                  updateStep(index, {
                                    requiresQuantity: e.target.checked,
                                    quantityUnit: e.target.checked
                                      ? step.quantityUnit || 'kg'
                                      : '',
                                  })
                                }
                              />
                              <Scale size={14} />
                              Miktar
                            </label>
                            <label
                              className={`wf-toggle${step.requiresDate ? ' is-on' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={step.requiresDate}
                                onChange={(e) =>
                                  updateStep(index, { requiresDate: e.target.checked })
                                }
                              />
                              <Calendar size={14} />
                              Tarih
                            </label>
                          </div>
                          {step.requiresQuantity && (
                            <label className="wf-field wf-unit">
                              Birim
                              <input
                                value={step.quantityUnit}
                                onChange={(e) =>
                                  updateStep(index, { quantityUnit: e.target.value })
                                }
                                placeholder="kg, adet, litre…"
                                required
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {(validationError || save.error) && (
              <p className="error">
                {validationError ?? (save.error as Error).message}
              </p>
            )}

            <div className="row-actions">
              <button className="primary-btn" type="submit" disabled={save.isPending}>
                {save.isPending ? 'Kaydediliyor…' : editingId ? 'Kaydet' : 'Oluştur'}
              </button>
              <button type="button" className="ghost-btn" onClick={resetEditor}>
                Vazgeç
              </button>
            </div>
          </form>
        </div>
      )}

      {!showEditor && (
        <div className="panel">
          {workflowsQuery.error && (
            <p className="error empty">{(workflowsQuery.error as Error).message}</p>
          )}
          {workflowsQuery.isLoading ? (
            <p className="empty">Yükleniyor…</p>
          ) : items.length === 0 ? (
            <div className="wf-empty">
              <div className="wf-empty-icon">
                <Workflow size={22} />
              </div>
              <p className="wf-empty-title">Henüz şablon yok</p>
              <p className="wf-empty-copy">
                Üretim adımlarını bir kez tanımlayın; arazilere atayın.
              </p>
              <button type="button" className="primary-btn" onClick={startCreate}>
                <Plus size={16} />
                Yeni iş akışı
              </button>
            </div>
          ) : (
            <ul className="wf-list">
              {items.map((item) => {
                const sorted = [...item.steps].sort((a, b) => a.order - b.order)
                const lastDay =
                  sorted.length > 0
                    ? (sorted[sorted.length - 1].dueDaysFromStart ?? 0)
                    : null
                const stepChips = sorted.slice(0, 3)
                const moreSteps = sorted.length - stepChips.length
                const isActive = item.status === 1

                return (
                  <li key={item.id} className="wf-list-item">
                    <button
                      type="button"
                      className="wf-list-main"
                      onClick={() => startEdit(item)}
                    >
                      <span className="wf-list-icon" aria-hidden>
                        <Sprout size={18} />
                      </span>
                      <span className="wf-list-body">
                        <span className="wf-list-title-row">
                          <span className="wf-list-name">{item.name}</span>
                          <span
                            className={`wf-status-badge${isActive ? ' is-active' : ''}`}
                          >
                            {WORKFLOW_STATUS[item.status] ?? item.status}
                          </span>
                        </span>
                        <span className="wf-list-stats">
                          {item.cropType ? (
                            <span className="wf-stat-chip">{item.cropType}</span>
                          ) : null}
                          <span className="wf-stat-chip">
                            {item.steps.length} adım
                          </span>
                          {lastDay != null ? (
                            <span className="wf-stat-chip">{lastDay} gün</span>
                          ) : null}
                        </span>
                        {stepChips.length > 0 && (
                          <span className="wf-list-steps">
                            {stepChips.map((s) => (
                              <span key={s.id ?? `${s.order}-${s.name}`} className="wf-step-chip">
                                {s.name}
                                <span className="wf-step-chip-day">g{s.dueDaysFromStart ?? 0}</span>
                              </span>
                            ))}
                            {moreSteps > 0 ? (
                              <span className="wf-step-chip wf-step-chip-more">
                                +{moreSteps} adım
                              </span>
                            ) : null}
                          </span>
                        )}
                      </span>
                      <ChevronRight className="wf-list-chevron" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {!showEditor && (
        <div className="panel wf-assign-panel">
          <button
            type="button"
            className="wf-assign-toggle"
            onClick={() => setShowAssign((v) => !v)}
            aria-expanded={showAssign}
          >
            <span>
              <span className="wf-assign-title">Hızlı atama</span>
              <span className="wf-assign-hint">
                Asıl yol:{' '}
                <Link to="/lands" onClick={(e) => e.stopPropagation()}>
                  Araziler → Üretim planı
                </Link>
              </span>
            </span>
            {showAssign ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAssign && (
            <form
              className="form-grid two-col wf-assign-form"
              onSubmit={(e) => {
                e.preventDefault()
                assignMutation.mutate()
              }}
            >
              <label>
                İş akışı
                <select
                  value={assign.workflowId}
                  onChange={(e) => setAssign({ ...assign, workflowId: e.target.value })}
                  required
                >
                  <option value="">Seçin</option>
                  {items.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.cropType ? ` (${w.cropType})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Üretici
                <select
                  value={assign.producerId}
                  onChange={(e) => setAssign({ ...assign, producerId: e.target.value })}
                  required
                >
                  <option value="">Seçin</option>
                  {(producersQuery.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Arazi
                <select
                  value={assign.landId}
                  onChange={(e) => setAssign({ ...assign, landId: e.target.value })}
                  required
                >
                  <option value="">Seçin</option>
                  {(landsQuery.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sezon
                <select
                  value={assign.seasonId}
                  onChange={(e) => setAssign({ ...assign, seasonId: e.target.value })}
                  required
                >
                  <option value="">Seçin</option>
                  {(seasonsQuery.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              {assignMutation.error && (
                <p className="error" style={{ gridColumn: '1 / -1' }}>
                  {(assignMutation.error as Error).message}
                </p>
              )}
              {assignMutation.isSuccess && (
                <p style={{ gridColumn: '1 / -1', color: 'var(--brand)', margin: 0 }}>
                  Atandı; görevler oluşturuldu.
                </p>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={!canAssign || assignMutation.isPending}
                >
                  {assignMutation.isPending ? 'Atanıyor…' : 'Ata'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
