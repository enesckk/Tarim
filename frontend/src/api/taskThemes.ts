/** İşlem teması kodları — API ile aynı string değerler. */
export const TASK_THEMES = [
  { code: 'Sulama', label: 'Sulama', evidence: 'Fotoğraf, süre, kullanılan su miktarı' },
  { code: 'Gubreleme', label: 'Gübreleme', evidence: 'Gübre adı, miktar, fotoğraf' },
  { code: 'Ilaclama', label: 'İlaçlama', evidence: 'İlaç adı, doz, su miktarı, fotoğraf' },
  { code: 'Dikim', label: 'Dikim', evidence: 'Fide sayısı, fotoğraf, başlangıç–bitiş zamanı' },
  { code: 'Hasat', label: 'Hasat', evidence: 'Ürün miktarı, kasa sayısı, fotoğraf' },
  { code: 'Bakim', label: 'Bakım', evidence: 'Öncesi–sonrası fotoğrafı, açıklama' },
] as const

export type TaskThemeCode = (typeof TASK_THEMES)[number]['code']

/** API TaskEvidenceDto ile aynı anahtarlar (camelCase). */
export type TaskEvidence = {
  durationMinutes?: number | null
  waterAmount?: number | null
  waterUnit?: string | null
  fertilizerName?: string | null
  amount?: number | null
  amountUnit?: string | null
  pesticideName?: string | null
  dose?: string | null
  seedlingCount?: number | null
  startedAt?: string | null
  endedAt?: string | null
  productQuantity?: number | null
  productUnit?: string | null
  crateCount?: number | null
  description?: string | null
}

export type PlannedEvidenceForm = {
  durationMinutes: string
  waterAmount: string
  fertilizerName: string
  amount: string
  pesticideName: string
  dose: string
  seedlingCount: string
  productQuantity: string
  crateCount: string
  description: string
}

export const emptyPlannedForm = (): PlannedEvidenceForm => ({
  durationMinutes: '',
  waterAmount: '',
  fertilizerName: '',
  amount: '',
  pesticideName: '',
  dose: '',
  seedlingCount: '',
  productQuantity: '',
  crateCount: '',
  description: '',
})

export function themeLabel(code?: string | null): string | null {
  if (!code) return null
  const found = TASK_THEMES.find((t) => t.code === code)
  return found?.label ?? code
}

export function themeEvidenceHint(code?: string | null): string | null {
  if (!code) return null
  return TASK_THEMES.find((t) => t.code === code)?.evidence ?? null
}

function parseNum(raw: string): number | null {
  const t = raw.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Form state → API plannedEvidence (tema alanları). */
export function buildPlannedEvidence(
  theme: string,
  form: PlannedEvidenceForm,
): TaskEvidence {
  switch (theme) {
    case 'Sulama':
      return {
        durationMinutes: parseNum(form.durationMinutes),
        waterAmount: parseNum(form.waterAmount),
        waterUnit: 'litre',
      }
    case 'Gubreleme':
      return {
        fertilizerName: form.fertilizerName.trim() || null,
        amount: parseNum(form.amount),
        amountUnit: 'kg',
      }
    case 'Ilaclama':
      return {
        pesticideName: form.pesticideName.trim() || null,
        dose: form.dose.trim() || null,
        waterAmount: parseNum(form.waterAmount),
        waterUnit: 'litre',
      }
    case 'Dikim':
      return { seedlingCount: parseNum(form.seedlingCount) }
    case 'Hasat':
      return {
        productQuantity: parseNum(form.productQuantity),
        productUnit: 'kg',
        crateCount: parseNum(form.crateCount),
      }
    case 'Bakim':
      return { description: form.description.trim() || null }
    default:
      return {}
  }
}

/** Planlanan kanıt istemci doğrulaması (API ValidatePlanned ile uyumlu). */
export function validatePlannedEvidence(
  theme: string | null | undefined,
  evidence: TaskEvidence,
): string | null {
  if (!theme) return null
  switch (theme) {
    case 'Sulama':
      if (evidence.durationMinutes == null || evidence.durationMinutes <= 0)
        return 'Planlanan sulama süresi (dakika) girin.'
      if (evidence.waterAmount == null || evidence.waterAmount <= 0)
        return 'Planlanan su miktarını girin.'
      return null
    case 'Gubreleme':
      if (!evidence.fertilizerName?.trim()) return 'Planlanan gübre adını girin.'
      if (evidence.amount == null || evidence.amount <= 0)
        return 'Planlanan gübre miktarını girin.'
      return null
    case 'Ilaclama':
      if (!evidence.pesticideName?.trim()) return 'Planlanan ilaç adını girin.'
      if (!evidence.dose?.trim()) return 'Planlanan ilaç dozunu girin.'
      if (evidence.waterAmount == null || evidence.waterAmount <= 0)
        return 'Planlanan su miktarını girin.'
      return null
    case 'Dikim':
      if (evidence.seedlingCount == null || evidence.seedlingCount <= 0)
        return 'Planlanan fide sayısını girin.'
      return null
    case 'Hasat':
      if (evidence.productQuantity == null || evidence.productQuantity <= 0)
        return 'Planlanan ürün miktarını girin.'
      if (evidence.crateCount == null || evidence.crateCount < 0)
        return 'Planlanan kasa sayısını girin.'
      return null
    case 'Bakim':
      if (!evidence.description?.trim()) return 'Planlanan bakım açıklamasını girin.'
      return null
    default:
      return null
  }
}

export function plannedFormFromJson(
  theme: string | null | undefined,
  json: string | null | undefined,
): PlannedEvidenceForm {
  const base = emptyPlannedForm()
  if (!json) return base
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(json) as Record<string, unknown>
  } catch {
    return base
  }
  const str = (v: unknown) => (v == null || v === '' ? '' : String(v))
  switch (theme) {
    case 'Sulama':
      return {
        ...base,
        durationMinutes: str(raw.durationMinutes),
        waterAmount: str(raw.waterAmount),
      }
    case 'Gubreleme':
      return {
        ...base,
        fertilizerName: str(raw.fertilizerName),
        amount: str(raw.amount),
      }
    case 'Ilaclama':
      return {
        ...base,
        pesticideName: str(raw.pesticideName),
        dose: str(raw.dose),
        waterAmount: str(raw.waterAmount),
      }
    case 'Dikim':
      return { ...base, seedlingCount: str(raw.seedlingCount) }
    case 'Hasat':
      return {
        ...base,
        productQuantity: str(raw.productQuantity),
        crateCount: str(raw.crateCount),
      }
    case 'Bakim':
      return { ...base, description: str(raw.description) }
    default:
      return base
  }
}

/** EvidenceJson / PlannedEvidenceJson satırlarını Türkçe etiketlerle göster. */
export function formatEvidenceEntries(
  theme: string | null | undefined,
  evidenceJson: string | null | undefined,
  options?: { planned?: boolean },
): { label: string; value: string }[] {
  if (!evidenceJson) return []
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(evidenceJson) as Record<string, unknown>
  } catch {
    return []
  }

  const planned = Boolean(options?.planned)
  const entries: { label: string; value: string }[] = []
  const push = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return
    entries.push({ label, value: String(value) })
  }

  switch (theme) {
    case 'Sulama':
      push(planned ? 'Hedef süre (dk)' : 'Süre (dk)', raw.durationMinutes)
      push(planned ? 'Hedef su' : 'Su miktarı', joinAmount(raw.waterAmount, raw.waterUnit ?? 'litre'))
      break
    case 'Gubreleme':
      push(planned ? 'Planlanan gübre' : 'Gübre adı', raw.fertilizerName)
      push(planned ? 'Hedef miktar' : 'Miktar', joinAmount(raw.amount, raw.amountUnit))
      break
    case 'Ilaclama':
      push(planned ? 'Planlanan ilaç' : 'İlaç adı', raw.pesticideName)
      push(planned ? 'Planlanan doz' : 'Doz', raw.dose)
      push(planned ? 'Hedef su' : 'Su miktarı', joinAmount(raw.waterAmount, raw.waterUnit ?? 'litre'))
      break
    case 'Dikim':
      push(planned ? 'Hedef fide' : 'Fide sayısı', raw.seedlingCount)
      if (!planned) {
        push('Başlangıç', formatDateTime(raw.startedAt))
        push('Bitiş', formatDateTime(raw.endedAt))
      }
      break
    case 'Hasat':
      push(planned ? 'Hedef ürün' : 'Ürün miktarı', joinAmount(raw.productQuantity, raw.productUnit ?? 'kg'))
      push(planned ? 'Hedef kasa' : 'Kasa sayısı', raw.crateCount)
      break
    case 'Bakim':
      push(planned ? 'Planlanan iş' : 'Açıklama', raw.description)
      break
    default:
      for (const [k, v] of Object.entries(raw)) {
        if (v != null && v !== '') push(k, v)
      }
  }

  return entries
}

function joinAmount(amount: unknown, unit: unknown) {
  if (amount === null || amount === undefined || amount === '') return null
  const u = unit ? ` ${unit}` : ''
  return `${amount}${u}`
}

function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || !value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('tr-TR')
}
