/** Shared task status helpers for producer mobile. */

export const TaskStatus = {
  Pending: 0,
  InProgress: 1,
  /** Uzman onayladı */
  Approved: 2,
  Overdue: 3,
  Cancelled: 4,
  /** Üretici gönderdi, onay bekliyor */
  AwaitingApproval: 5,
  /** Uzman düzeltme istedi */
  NeedsRevision: 6,
} as const;

export type TaskLike = {
  status: number;
  requiresPhoto?: boolean;
  photoCount?: number;
  photos?: unknown[];
  dueDate?: string | null;
  revisionReason?: string | null;
};

function dueDiffDays(dueDate: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dueDate.trim());
  let due: Date | null = null;
  if (m) {
    due = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  } else {
    const fallback = new Date(dueDate);
    due = Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  if (!due) return null;
  const start = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(due) - start(now)) / 86_400_000);
}

export function isApproved(status: number) {
  return status === TaskStatus.Approved;
}

export function isAwaitingApproval(status: number) {
  return status === TaskStatus.AwaitingApproval;
}

export function isNeedsRevision(status: number) {
  return status === TaskStatus.NeedsRevision;
}

export function isClosedTask(status: number) {
  return (
    status === TaskStatus.Approved ||
    status === TaskStatus.Cancelled ||
    status === TaskStatus.AwaitingApproval
  );
}

export function isOpenWorkStatus(status: number) {
  return (
    status === TaskStatus.Pending ||
    status === TaskStatus.InProgress ||
    status === TaskStatus.Overdue ||
    status === TaskStatus.NeedsRevision
  );
}

/** Short badge label matching producer design (Gecikti / Bugün / Bekliyor). */
export function taskBadge(
  task: TaskLike,
  overdue: boolean,
): { label: string; tone: 'danger' | 'today' | 'wait' | 'success' | 'neutral' } {
  if (task.status === TaskStatus.NeedsRevision)
    return { label: 'Düzeltme', tone: 'danger' };
  if (task.status === TaskStatus.AwaitingApproval)
    return { label: 'Onayda', tone: 'today' };
  if (task.status === TaskStatus.Approved)
    return { label: 'Onaylandı', tone: 'success' };
  if (task.status === TaskStatus.Cancelled)
    return { label: 'İptal', tone: 'neutral' };
  if (overdue || task.status === TaskStatus.Overdue)
    return { label: 'Gecikti', tone: 'danger' };
  if (task.status === TaskStatus.InProgress) {
    const diff = task.dueDate ? dueDiffDays(task.dueDate) : null;
    if (diff === 0) return { label: 'Bugün', tone: 'today' };
    if (diff === 1) return { label: 'Yarın', tone: 'today' };
    return { label: 'Devam', tone: 'wait' };
  }
  return { label: 'Bekliyor', tone: 'wait' };
}

/** List / card status label (Turkish). */
export function taskStatusLabel(
  task: TaskLike,
  overdue: boolean,
): string {
  return taskBadge(task, overdue).label;
}
