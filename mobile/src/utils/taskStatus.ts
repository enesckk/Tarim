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

/** List / card status label (Turkish). */
export function taskStatusLabel(
  task: TaskLike,
  overdue: boolean,
): string {
  if (task.status === TaskStatus.AwaitingApproval) return 'Onay bekleniyor';
  if (task.status === TaskStatus.NeedsRevision) return 'Düzeltme gerekli';
  if (task.status === TaskStatus.Approved) return 'Onaylandı';
  if (task.status === TaskStatus.Cancelled) return 'İptal';
  if (overdue || task.status === TaskStatus.Overdue) return 'Gecikti';
  const photos = task.photoCount ?? task.photos?.length ?? 0;
  if (task.requiresPhoto && photos === 0) return 'Foto gerekli';
  return 'Yapılacak';
}
