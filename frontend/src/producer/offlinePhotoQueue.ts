import { api } from "../api/client";

const DB_NAME = "agriculture-producer-pwa";
const STORE = "photo-upload-queue";
const VERSION = 1;

export type QueuedPhoto = {
  id: string;
  taskId: string;
  file: Blob;
  fileName: string;
  contentType: string;
  createdAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readAll(): Promise<QueuedPhoto[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as QueuedPhoto[]);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function write(method: "put" | "delete", value: QueuedPhoto | string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    if (method === "put") store.put(value as QueuedPhoto);
    else store.delete(value as string);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function enqueuePhoto(taskId: string, file: File) {
  await write("put", {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    taskId,
    file,
    fileName: file.name,
    contentType: file.type || "image/jpeg",
    createdAt: new Date().toISOString(),
  });
}

export async function queuedPhotoCount() {
  return (await readAll()).length;
}

export async function flushPhotoQueue(): Promise<{
  sent: number;
  left: number;
}> {
  const items = await readAll();
  if (!navigator.onLine) return { sent: 0, left: items.length };
  let sent = 0;
  for (const item of items) {
    try {
      const form = new FormData();
      form.append(
        "file",
        new File([item.file], item.fileName, { type: item.contentType }),
        item.fileName,
      );
      await api(`/api/tasks/${item.taskId}/photos`, {
        method: "POST",
        body: form,
      });
      await write("delete", item.id);
      sent += 1;
    } catch {
      /* Retain for the next online retry. */
    }
  }
  return { sent, left: (await readAll()).length };
}
