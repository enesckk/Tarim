export const TASK_THEMES = [
  { code: 'Sulama', label: 'Sulama', minPhotos: 1 },
  { code: 'Gubreleme', label: 'Gübreleme', minPhotos: 1 },
  { code: 'Ilaclama', label: 'İlaçlama', minPhotos: 1 },
  { code: 'Dikim', label: 'Dikim', minPhotos: 1 },
  { code: 'Hasat', label: 'Hasat', minPhotos: 1 },
  { code: 'Bakim', label: 'Bakım', minPhotos: 2 },
] as const;

export type TaskThemeCode = (typeof TASK_THEMES)[number]['code'];

export type TaskEvidence = {
  durationMinutes?: number | null;
  waterAmount?: number | null;
  waterUnit?: string | null;
  fertilizerName?: string | null;
  amount?: number | null;
  amountUnit?: string | null;
  pesticideName?: string | null;
  dose?: string | null;
  seedlingCount?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  productQuantity?: number | null;
  productUnit?: string | null;
  crateCount?: number | null;
  description?: string | null;
};

export function themeLabel(code?: string | null): string | null {
  if (!code) return null;
  return TASK_THEMES.find((t) => t.code === code)?.label ?? code;
}

export function themeMinPhotos(code?: string | null): number {
  if (!code) return 0;
  return TASK_THEMES.find((t) => t.code === code)?.minPhotos ?? 1;
}

export function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Client-side check mirroring API theme evidence rules. */
export function validateEvidence(
  theme: string | null | undefined,
  evidence: TaskEvidence,
): string | null {
  if (!theme) return null;
  switch (theme) {
    case 'Sulama':
      if (evidence.durationMinutes == null || evidence.durationMinutes <= 0)
        return 'Sulama süresi (dakika) girin.';
      if (evidence.waterAmount == null || evidence.waterAmount <= 0)
        return 'Kullanılan su miktarını girin.';
      return null;
    case 'Gubreleme':
      if (!evidence.fertilizerName?.trim()) return 'Gübre adını girin.';
      if (evidence.amount == null || evidence.amount <= 0)
        return 'Gübre miktarını girin.';
      return null;
    case 'Ilaclama':
      if (!evidence.pesticideName?.trim()) return 'İlaç adını girin.';
      if (!evidence.dose?.trim()) return 'İlaç dozunu girin.';
      if (evidence.waterAmount == null || evidence.waterAmount <= 0)
        return 'Su miktarını girin.';
      return null;
    case 'Dikim':
      if (evidence.seedlingCount == null || evidence.seedlingCount <= 0)
        return 'Fide sayısını girin.';
      if (!evidence.startedAt) return 'Başlangıç zamanını girin.';
      if (!evidence.endedAt) return 'Bitiş zamanını girin.';
      if (
        evidence.startedAt &&
        evidence.endedAt &&
        new Date(evidence.endedAt) < new Date(evidence.startedAt)
      ) {
        return 'Bitiş zamanı başlangıçtan önce olamaz.';
      }
      return null;
    case 'Hasat':
      if (evidence.productQuantity == null || evidence.productQuantity <= 0)
        return 'Ürün miktarını girin.';
      if (evidence.crateCount == null || evidence.crateCount < 0)
        return 'Kasa sayısını girin.';
      return null;
    case 'Bakim':
      if (!evidence.description?.trim()) return 'Bakım açıklamasını girin.';
      return null;
    default:
      return null;
  }
}

export function compactEvidence(evidence: TaskEvidence): TaskEvidence {
  const out: TaskEvidence = {};
  (Object.keys(evidence) as (keyof TaskEvidence)[]).forEach((key) => {
    const v = evidence[key];
    if (v === null || v === undefined || v === '') return;
    if (typeof v === 'string' && !v.trim()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out as any)[key] = typeof v === 'string' ? v.trim() : v;
  });
  return out;
}

/** PlannedEvidenceJson / EvidenceJson → Türkçe etiket satırları. */
export function formatEvidenceEntries(
  theme: string | null | undefined,
  evidenceJson: string | null | undefined,
  options?: { planned?: boolean },
): { label: string; value: string }[] {
  if (!evidenceJson) return [];
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(evidenceJson) as Record<string, unknown>;
  } catch {
    return [];
  }

  const planned = Boolean(options?.planned);
  const entries: { label: string; value: string }[] = [];
  const push = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return;
    entries.push({ label, value: String(value) });
  };

  switch (theme) {
    case 'Sulama':
      push(planned ? 'Hedef süre (dk)' : 'Süre (dk)', raw.durationMinutes);
      push(
        planned ? 'Hedef su' : 'Su miktarı',
        joinAmount(raw.waterAmount, raw.waterUnit ?? 'litre'),
      );
      break;
    case 'Gubreleme':
      push(planned ? 'Planlanan gübre' : 'Gübre adı', raw.fertilizerName);
      push(planned ? 'Hedef miktar' : 'Miktar', joinAmount(raw.amount, raw.amountUnit));
      break;
    case 'Ilaclama':
      push(planned ? 'Planlanan ilaç' : 'İlaç adı', raw.pesticideName);
      push(planned ? 'Planlanan doz' : 'Doz', raw.dose);
      push(
        planned ? 'Hedef su' : 'Su miktarı',
        joinAmount(raw.waterAmount, raw.waterUnit ?? 'litre'),
      );
      break;
    case 'Dikim':
      push(planned ? 'Hedef fide' : 'Fide sayısı', raw.seedlingCount);
      if (!planned) {
        push('Başlangıç', formatDateTime(raw.startedAt));
        push('Bitiş', formatDateTime(raw.endedAt));
      }
      break;
    case 'Hasat':
      push(
        planned ? 'Hedef ürün' : 'Ürün miktarı',
        joinAmount(raw.productQuantity, raw.productUnit ?? 'kg'),
      );
      push(planned ? 'Hedef kasa' : 'Kasa sayısı', raw.crateCount);
      break;
    case 'Bakim':
      push(planned ? 'Planlanan iş' : 'Açıklama', raw.description);
      break;
    default:
      for (const [k, v] of Object.entries(raw)) {
        if (v != null && v !== '') push(k, v);
      }
  }

  return entries;
}

function joinAmount(amount: unknown, unit: unknown) {
  if (amount === null || amount === undefined || amount === '') return null;
  const u = unit ? ` ${unit}` : '';
  return `${amount}${u}`;
}

function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('tr-TR');
}
