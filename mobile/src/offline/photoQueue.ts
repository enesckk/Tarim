import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadTaskPhoto } from '../api/client';

const KEY = 'ams.photoUploadQueue.v1';

export type QueuedPhoto = {
  id: string;
  taskId: string;
  localUri: string;
  fileName?: string;
  contentType?: string;
  createdAt: string;
};

async function readQueue(): Promise<QueuedPhoto[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QueuedPhoto[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedPhoto[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function enqueuePhotoUpload(
  item: Omit<QueuedPhoto, 'id' | 'createdAt'>,
) {
  const queue = await readQueue();
  queue.push({
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  });
  await writeQueue(queue);
}

export async function flushPhotoQueue(
  accessToken: string | null,
  refreshToken: string | null,
): Promise<{ sent: number; left: number }> {
  if (!accessToken) return { sent: 0, left: (await readQueue()).length };
  const queue = await readQueue();
  if (queue.length === 0) return { sent: 0, left: 0 };

  const remaining: QueuedPhoto[] = [];
  let sent = 0;
  for (const item of queue) {
    try {
      await uploadTaskPhoto(item.taskId, item.localUri, accessToken, refreshToken, {
        fileName: item.fileName,
        contentType: item.contentType,
      });
      sent += 1;
    } catch {
      remaining.push(item);
    }
  }
  await writeQueue(remaining);
  return { sent, left: remaining.length };
}

export async function queuedPhotoCount() {
  return (await readQueue()).length;
}
