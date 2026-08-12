import { useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import toast from "react-hot-toast";

export type LiveNotification = {
  id?: string;
  title?: string;
  message?: string;
  body?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
};

/** Keeps the authenticated PWA connected to backend notifications while open. */
function storedToken() {
  try {
    return (
      (
        JSON.parse(localStorage.getItem("agriculture.auth") || "null") as {
          token?: string;
        } | null
      )?.token ?? null
    );
  } catch {
    return null;
  }
}

function defaultNotification(notification: LiveNotification) {
  toast.success(
    `${notification.title || "Yeni bildirim"}\n${notification.message || notification.body || "Yeni bir güncelleme var."}`,
  );
}

export function useSignalR(
  token: string | null = storedToken(),
  onNotification: (
    notification: LiveNotification,
  ) => void = defaultNotification,
) {
  useEffect(() => {
    if (!token) return;

    const configured = String(import.meta.env.VITE_API_URL || "").replace(
      /\/$/,
      "",
    );
    const hubUrl = `${configured}/hubs/notifications`;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
    let disposed = false;

    connection.on("ReceiveNotification", onNotification);
    // Defer startup by one task. React StrictMode mounts and immediately cleans
    // up the first effect in development; starting synchronously there creates
    // a noisy, harmless "stopped during negotiation" error.
    const startTimer = window.setTimeout(() => {
      if (disposed) return;
      void connection.start().catch((error: unknown) => {
        if (disposed || (error instanceof Error && error.name === "AbortError"))
          return;
        console.warn("Canlı bildirim bağlantısı kurulamadı.", error);
      });
    }, 0);

    return () => {
      disposed = true;
      window.clearTimeout(startTimer);
      connection.off("ReceiveNotification", onNotification);
      void connection.stop();
    };
  }, [onNotification, token]);
}
