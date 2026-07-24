import { API_BASE_URL } from './config';

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
};

export type TaskDto = {
  id: string;
  producerId: string;
  landId: string;
  landName?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status: number;
  requiresPhoto: boolean;
  requiresQuantity?: boolean;
  requiresDate?: boolean;
  quantityUnit?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  revisionReason?: string | null;
  completedAtUtc?: string | null;
  photoCount?: number;
  photos?: Array<{
    id: string;
    storageKey: string;
    fileName: string;
    contentType: string;
    uploadedAtUtc: string;
  }>;
};

export type NotificationDto = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAtUtc: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
};

export type ConversationListItem = {
  id: string;
  subject: string;
  lastMessagePreview?: string | null;
  lastMessageAtUtc?: string | null;
  status: number;
  hasUnread?: boolean;
  landId?: string | null;
  landName?: string | null;
};

export type LandDto = {
  id: string;
  name: string;
  parcelNumber?: string | null;
  sizeInDecares?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  soilType?: string | null;
  producerId?: string | null;
  assignedOfficerUserId?: string | null;
  isActive?: boolean;
  alertCount?: number;
  activeCropType?: string | null;
  activeWorkflowName?: string | null;
  neighborhood?: string | null;
  cadastralBlock?: string | null;
  soilNotes?: string | null;
  mapStatus?: string | null;
  city?: string | null;
  district?: string | null;
};

export type ChatMessageDto = {
  id: string;
  senderUserId: string;
  body: string;
  sentAtUtc: string;
};

export type ConversationDetail = {
  id: string;
  subject: string;
  producerUserId: string;
  officerUserId?: string | null;
  messages: ChatMessageDto[];
};

export type MeResponse = {
  userId: string;
  email?: string | null;
  roles: string[];
  producerId?: string | null;
  fullName?: string | null;
  phone?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type TokenPair = { accessToken: string; refreshToken: string };

let refreshHandler: ((refreshToken: string) => Promise<TokenPair | null>) | null = null;

export function setRefreshHandler(handler: typeof refreshHandler) {
  refreshHandler = handler;
}

function isFormDataBody(body: BodyInit | null | undefined): boolean {
  if (body == null || typeof body !== 'object') return false;
  // RN/Hermes can fail `instanceof FormData` across realms; also detect by append().
  if (typeof FormData !== 'undefined' && body instanceof FormData) return true;
  return typeof (body as FormData).append === 'function';
}

async function doFetch(path: string, options: RequestInit, accessToken?: string | null) {
  const headers = new Headers(options.headers);
  if (!isFormDataBody(options.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError('Bağlantı kurulamadı. İnternetinizi veya sunucu adresini kontrol edin.', 0);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
  refreshToken?: string | null,
): Promise<T> {
  const response = await doFetch(path, options, accessToken);

  if (response.status === 401 && refreshToken && refreshHandler) {
    const refreshed = await refreshHandler(refreshToken);
    if (refreshed) {
      const retry = await doFetch(path, options, refreshed.accessToken);
      return parseResponse<T>(retry);
    }
  }

  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `İstek başarısız (${response.status})`;
    try {
      const body = await response.json();
      message = body.message ?? body.Message ?? body.title ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return api<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function refresh(refreshToken: string): Promise<LoginResponse> {
  return api<LoginResponse>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

/** Multipart photo upload — do not set Content-Type (boundary is set by fetch). */
export async function uploadTaskPhoto(
  taskId: string,
  localUri: string,
  accessToken: string | null,
  refreshToken?: string | null,
  opts?: { fileName?: string; contentType?: string },
): Promise<void> {
  const fileName = opts?.fileName ?? `photo-${Date.now()}.jpg`;
  const contentType = opts?.contentType ?? 'image/jpeg';
  const form = new FormData();
  form.append('file', {
    uri: localUri,
    name: fileName,
    type: contentType,
  } as unknown as Blob);

  await api<void>(
    `/api/tasks/${taskId}/photos`,
    { method: 'POST', body: form },
    accessToken,
    refreshToken,
  );
}
