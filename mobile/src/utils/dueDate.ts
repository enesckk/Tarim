import { TaskStatus } from './taskStatus';

/** Parse API DateOnly (`YYYY-MM-DD`) as local calendar day. */
export function parseDueDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole calendar days from today to due (negative = overdue). */
export function daysUntilDue(dueDate: string, now = new Date()): number | null {
  const due = parseDueDate(dueDate);
  if (!due) return null;
  const ms = startOfLocalDay(due).getTime() - startOfLocalDay(now).getTime();
  return Math.round(ms / 86_400_000);
}

/** e.g. "Son tarih: 20.07.2026 (3 gün sonra)" */
export function formatDueLabel(dueDate: string, now = new Date()): string {
  const due = parseDueDate(dueDate);
  if (!due) return `Son tarih: ${dueDate}`;

  const formatted = due.toLocaleDateString('tr-TR');
  const diff = daysUntilDue(dueDate, now);
  if (diff == null) return `Son tarih: ${formatted}`;
  if (diff === 0) return `Son tarih: ${formatted} (bugün)`;
  if (diff === 1) return `Son tarih: ${formatted} (yarın)`;
  if (diff > 1) return `Son tarih: ${formatted} (${diff} gün sonra)`;
  if (diff === -1) return `Son tarih: ${formatted} (1 gün gecikti)`;
  return `Son tarih: ${formatted} (${Math.abs(diff)} gün gecikti)`;
}

/** Short card label matching producer design: "Bugün", "2 gün gecikti". */
export function shortDueLabel(dueDate: string | null | undefined, now = new Date()): string {
  if (!dueDate) return 'Tarih yok';
  const diff = daysUntilDue(dueDate, now);
  if (diff == null) return dueDate;
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Yarın';
  if (diff > 1) return `${diff} gün sonra`;
  if (diff === -1) return '1 gün gecikti';
  return `${Math.abs(diff)} gün gecikti`;
}

export function isOverdueTask(
  status: number,
  dueDate: string | null | undefined,
  now = new Date(),
): boolean {
  if (
    status === TaskStatus.Approved ||
    status === TaskStatus.Cancelled ||
    status === TaskStatus.AwaitingApproval
  ) {
    return false;
  }
  if (status === TaskStatus.Overdue) return true;
  if (!dueDate) return false;
  const diff = daysUntilDue(dueDate, now);
  return diff != null && diff < 0;
}
