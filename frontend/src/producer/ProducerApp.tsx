import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Bell,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Droplets,
  Flag,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Plus,
  PlayCircle,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sprout,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, ApiError } from "../api/client";
import { mediaUrl } from "../api/media";
import { formatEvidenceEntries } from "../api/taskThemes";
import type {
  ConversationDetail,
  ConversationListItem,
  Land,
  NotificationItem,
  TaskItem,
} from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useSignalR, type LiveNotification } from "../hooks/useSignalR";
import { enqueuePhoto, flushPhotoQueue } from "./offlinePhotoQueue";
import {
  hasWebPushSubscription,
  registerWebPush,
  supportsWebPush,
  unregisterWebPush,
} from "../pwa/webPush";
import "./producer.css";
import "./producer-mobile.css";

type Me = {
  userId: string;
  email?: string | null;
  roles: string[];
  producerId?: string | null;
  fullName?: string | null;
  phone?: string | null;
};
type Overview = {
  me: Me;
  tasks: TaskItem[];
  lands: Land[];
  notifications: NotificationItem[];
};
const labels = [
  "Bekliyor",
  "Devam ediyor",
  "Onaylandı",
  "Gecikmiş",
  "İptal",
  "Onay bekliyor",
  "Düzeltme gerekli",
];
const actionable = (s: number) => [0, 1, 3, 6].includes(s);
const date = (v?: string | null) =>
  v && !Number.isNaN(new Date(v).getTime())
    ? new Date(v).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Tarih belirtilmedi";
const errorText = (e: unknown, fallback: string) =>
  !navigator.onLine
    ? "İnternet bağlantısı yok. Bağlantı geldiğinde tekrar deneyin."
    : e instanceof ApiError && e.message
      ? e.message
      : fallback;

const safeExternalUrl = (value?: string | null) => {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

async function preparePhoto(file: File): Promise<File> {
  if (file.size > 25 * 1024 * 1024)
    throw new Error(`${file.name} 25 MB sınırını aşıyor.`);
  const source: ImageBitmap | HTMLImageElement =
    typeof createImageBitmap === "function"
      ? await createImageBitmap(file)
      : await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          const url = URL.createObjectURL(file);
          image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
          };
          image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Fotoğraf açılamadı."));
          };
          image.src = url;
        });
  const scale = Math.min(1, 1920 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Fotoğraf işlenemedi.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Fotoğraf dönüştürülemedi.")),
      "image/jpeg",
      0.82,
    ),
  );
  const name = `${file.name.replace(/\.[^.]+$/, "") || "fotoğraf"}.jpg`;
  return new File([blob], name, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function State({
  icon,
  title,
  text,
  retry,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  retry?: () => void;
}) {
  return (
    <div className="pr-state">
      {icon}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {retry && (
        <button className="pr-primary" onClick={retry}>
          <RefreshCw />
          Tekrar dene
        </button>
      )}
    </div>
  );
}

function useOverview() {
  const [data, setData] = useState<Overview | null>(() => {
    try {
      const cached = sessionStorage.getItem("tarim_producer_overview_cache");
      return cached ? (JSON.parse(cached) as Overview) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!data) setLoading(true);
    setError(null);
    try {
      // Parallel fetch of identity, today tasks, lands and notifications
      const [me, todayTasks, lands, notifications] = await Promise.all([
        api<Me>("/api/me"),
        api<TaskItem[]>("/api/tasks/today"),
        api<Land[]>("/api/lands"),
        api<NotificationItem[]>("/api/notifications"),
      ]);

      const tasks = me.producerId
        ? await api<TaskItem[]>(
            `/api/tasks?producerId=${encodeURIComponent(me.producerId)}`,
          ).catch(() => todayTasks)
        : todayTasks;

      const payload: Overview = { me, tasks, lands, notifications };
      setData(payload);
      try {
        sessionStorage.setItem("tarim_producer_overview_cache", JSON.stringify(payload));
      } catch {
        // ignore
      }
    } catch (e) {
      if (!data) setError(errorText(e, "Bilgiler yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, load };
}

function TaskCard({ task, land }: { task: TaskItem; land?: Land }) {
  return (
    <NavLink className="pr-task" to={`/producer/tasks/${task.id}`}>
      <div className="pr-task-icon">
        <CheckCircle2 />
      </div>
      <div>
        <header>
          <strong>{task.title}</strong>
          <span className={`pr-status s${task.status}`}>
            {labels[task.status] ?? "Görev"}
          </span>
        </header>
        <p>
          {land?.name ?? "Arazi"} · {date(task.dueDate)}
        </p>
        {task.revisionReason && (
          <em>
            <TriangleAlert />
            {task.revisionReason}
          </em>
        )}
      </div>
    </NavLink>
  );
}

type ProcessGroup = {
  id: string;
  land?: Land;
  tasks: TaskItem[];
};

function primaryProcessGroup(tasks: TaskItem[], lands: Land[]) {
  const grouped = new Map<string, TaskItem[]>();
  tasks
    .filter((task) => task.status !== 4)
    .forEach((task) => {
      const key = task.productionWorkflowId || task.landId;
      grouped.set(key, [...(grouped.get(key) ?? []), task]);
    });

  const groups = Array.from(grouped, ([id, items]) => ({
    id,
    land: lands.find((land) => land.id === items[0]?.landId),
    tasks: items.sort((a, b) =>
      (a.dueDate ?? "9999-12-31").localeCompare(
        b.dueDate ?? "9999-12-31",
      ),
    ),
  }));

  return (
    groups.sort((a, b) => {
      const aRevision = a.tasks.some((task) => task.status === 6);
      const bRevision = b.tasks.some((task) => task.status === 6);
      if (aRevision !== bRevision) return Number(bRevision) - Number(aRevision);
      const aOpen = a.tasks.find((task) => task.status !== 2);
      const bOpen = b.tasks.find((task) => task.status !== 2);
      if (Boolean(aOpen) !== Boolean(bOpen)) return Number(Boolean(bOpen)) - Number(Boolean(aOpen));
      return (aOpen?.dueDate ?? "9999-12-31").localeCompare(
        bOpen?.dueDate ?? "9999-12-31",
      );
    })[0] ?? null
  );
}

function currentProcessTask(group: ProcessGroup | null) {
  if (!group) return null;
  return (
    group.tasks.find((task) => task.status === 6) ??
    group.tasks.find((task) => task.status !== 2) ??
    group.tasks.at(-1) ??
    null
  );
}

function processStatus(task: TaskItem, current: boolean) {
  if (task.status === 2) return "Tamamlandı";
  if (task.status === 5) return "Uzman onayında";
  if (task.status === 6) return "Düzeltme gerekli";
  if (task.status === 3) return "Gecikmiş";
  if (task.status === 1) return "Devam ediyor";
  return current ? "Şimdi" : "Sırada";
}

function ProcessView({
  group,
}: {
  group: ProcessGroup | null;
}) {
  if (!group)
    return (
      <State
        icon={<Sprout />}
        title="Henüz üretim süreci yok"
        text="Bir üretim planı atandığında tüm adımlar burada görünecek."
      />
    );

  const completed = group.tasks.filter((task) => task.status === 2).length;
  const total = group.tasks.length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  const currentTask = currentProcessTask(group);
  const currentIndex = currentTask
    ? group.tasks.findIndex((task) => task.id === currentTask.id)
    : total - 1;
  const seasonYear = group.tasks
    .map((task) => task.dueDate?.slice(0, 4))
    .find(Boolean);

  return (
    <div className="pr-process">
      <section className="pr-process-summary">
        <div className="pr-process-summary-top">
          <div>
            <span>{seasonYear ? `${seasonYear} sezonu` : "Üretim planı"}</span>
            <h2>{group.land?.name ?? "Üretim yolculuğun"}</h2>
          </div>
          <strong>{percentage}%</strong>
        </div>
        <div
          className="pr-process-progress"
          role="progressbar"
          aria-label="Üretim süreci ilerlemesi"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <i style={{ width: `${percentage}%` }} />
        </div>
        <div className="pr-process-meta">
          <span>
            <CheckCircle2 /> {completed} adım tamamlandı
          </span>
          <span>{Math.max(total - completed, 0)} adım kaldı</span>
        </div>
      </section>

      {currentTask && currentTask.status !== 2 && (
        <NavLink
          className={`pr-process-now s${currentTask.status}`}
          to={`/producer/tasks/${currentTask.id}`}
        >
          <span className="pr-process-now-icon">
            <Sprout />
          </span>
          <span>
            <small>ŞU ANKİ ADIM</small>
            <strong>{currentTask.title}</strong>
            <em>{processStatus(currentTask, true)}</em>
          </span>
          <ChevronRight />
        </NavLink>
      )}

      <section className="pr-process-timeline" aria-label="Üretim adımları">
        <header>
          <span>Tüm adımlar</span>
          <small>{total} aşama</small>
        </header>
        {group.tasks.map((task, index) => {
          const done = task.status === 2;
          const current = index === currentIndex && !done;
          const accessible = done || current;
          const content = (
            <>
              <span className="pr-process-rail" aria-hidden="true">
                <i>{done ? <Check /> : current ? <Sprout /> : index + 1}</i>
                {index < group.tasks.length - 1 && <b />}
              </span>
              <span className="pr-process-step-content">
                <span className="pr-process-step-heading">
                  <strong>{task.title}</strong>
                  <em className={`s${task.status}`}>
                    {processStatus(task, current)}
                  </em>
                </span>
                <span className="pr-process-step-detail">
                  {task.description ||
                    "Bu aşamanın görev ve talimatlarını incele."}
                </span>
                <span className="pr-process-step-foot">
                  <small>
                    <Clock3 /> {date(task.dueDate)}
                  </small>
                  <b>
                    {current ? (
                      <>Adıma git <ChevronRight /></>
                    ) : done ? (
                      <>Detayı gör <ChevronRight /></>
                    ) : (
                      <><LockKeyhole /> Önceki adımı tamamla</>
                    )}
                  </b>
                </span>
              </span>
            </>
          );
          return accessible ? (
            <NavLink
              key={task.id}
              to={`/producer/tasks/${task.id}`}
              className={`pr-process-step ${done ? "done" : ""} ${current ? "current" : ""}`}
            >
              {content}
            </NavLink>
          ) : (
            <div
              key={task.id}
              className="pr-process-step locked"
              aria-label={`${task.title}, önceki adım tamamlandıktan sonra açılacak`}
            >
              {content}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function TasksPage() {
  const { data, loading, error, load } = useOverview();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter: "open" | "process" =
    searchParams.get("view") === "process" ? "process" : "open";
  const setFilter = (next: "open" | "process") => {
    const params = new URLSearchParams(searchParams);
    params.delete("plan");
    if (next === "process") params.set("view", "process");
    else {
      params.delete("view");
    }
    setSearchParams(params, { replace: true });
  };
  const navigate = useNavigate();
  if (loading)
    return (
      <State
        icon={<LoaderCircle className="spin" />}
        title="Görevler yükleniyor"
      />
    );
  if (!data || error)
    return (
      <State
        icon={<WifiOff />}
        title="Görevler yüklenemedi"
        text={error ?? undefined}
        retry={() => void load()}
      />
    );
  const processGroup = primaryProcessGroup(data.tasks, data.lands);
  const currentTask = currentProcessTask(processGroup);
  const revisionTasks =
    processGroup?.tasks.filter((task) => task.status === 6) ?? [];
  const tasks = revisionTasks.length
    ? revisionTasks
    : currentTask && actionable(currentTask.status)
      ? [currentTask]
      : [];
  const awaitingApproval = currentTask?.status === 5;
  const unread = data.notifications.filter((n) => !n.isRead).length;
  return (
    <div className="pr-page pr-tasks-page">
      <div className="pr-mobile-head">
        <span className="pr-leaf" aria-label="Tarım logosu">
          <i />
        </span>
        <button
          aria-label="Bildirimler"
          onClick={() => navigate("/producer/notifications")}
        >
          <Bell />
          {unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
        </button>
      </div>
      <div className="pr-screen-title">
        <h1>{filter === "open" ? "Görevlerin" : "Üretim sürecin"}</h1>
        <p>
          {filter === "open"
            ? tasks.length
              ? revisionTasks.length
                ? `${tasks.length} düzeltme bekliyor`
                : "Sıradaki adım hazır"
              : awaitingApproval
                ? "Görevin uzman kontrolünde"
              : "Şimdilik sıradaki iş yok"
            : "Tarladaki yolculuğunu adım adım takip et"}
        </p>
      </div>
      <Segments value={filter} setValue={setFilter} />
      {filter === "process" ? (
        <ProcessView group={processGroup} />
      ) : (
        <>
          <div className="pr-section-label">
            {revisionTasks.length ? "Düzeltmen gereken görev" : "Sıradaki adım"}
          </div>
          <div className="pr-list">
            {tasks.length ? (
              tasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  land={data.lands.find((l) => l.id === t.landId)}
                />
              ))
            ) : awaitingApproval ? (
              <State
                icon={<Clock3 />}
                title="Uzman kontrolünde"
                text="Görevin gönderildi. Uzman onayladığında sıradaki adım otomatik açılacak."
              />
            ) : (
              <State
                icon={<CheckCircle2 />}
                title="Şimdilik tamam"
                text="Yeni adım açıldığında burada görünecek."
                retry={() => void load()}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TaskPage() {
  const { taskId } = useParams(),
    navigate = useNavigate();
  const { token } = useAuth();
  const [task, setTask] = useState<TaskItem | null>(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null),
    [notes, setNotes] = useState(""),
    [quantity, setQuantity] = useState(""),
    [files, setFiles] = useState<File[]>([]),
    [confirming, setConfirming] = useState(false),
    [ev, setEv] = useState<Record<string, string>>({});
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );
  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );
  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      setTask(await api<TaskItem>(`/api/tasks/${taskId}`));
    } catch (e) {
      setError(errorText(e, "Görev yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, [taskId]);
  useEffect(() => {
    void load();
  }, [load]);
  const choose = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, 4);
    setError(null);
    setFiles(selected);
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!task) return;
    if (!navigator.onLine) {
      for (const source of files) {
        await enqueuePhoto(task.id, await preparePhoto(source));
      }
      setFiles([]);
      setError(
        files.length
          ? "Fotoğraflar kuyruğa alındı. Bağlantı geldiğinde otomatik yüklenecek; ardından görevi onaya gönderebilirsiniz."
          : "Görevi göndermek için internet bağlantısı gereklidir.",
      );
      return;
    }
    const count = (task.photoCount ?? task.photos?.length ?? 0) + files.length;
    const minPhotos = task.theme
      ? task.theme === "Bakim"
        ? 2
        : 1
      : task.requiresPhoto
        ? 1
        : 0;
    if (count < minPhotos) {
      setError(
        minPhotos === 2
          ? "Bakım görevi için öncesi ve sonrası olmak üzere iki fotoğraf ekleyin."
          : "En az bir fotoğraf eklemelisiniz.",
      );
      return;
    }
    if (task.requiresQuantity && !quantity.trim()) {
      setError("Miktarı girin.");
      return;
    }
    if (
      task.theme === "Dikim" &&
      ev.startedAt &&
      ev.endedAt &&
      new Date(ev.endedAt) < new Date(ev.startedAt)
    ) {
      setError("Bitiş zamanı başlangıçtan önce olamaz.");
      return;
    }
    if (!confirming) {
      setError(null);
      setConfirming(true);
      return;
    }
    const num = (key: string) => (ev[key] ? Number(ev[key]) : null);
    let evidence: Record<string, unknown> | null = null;
    switch (task.theme) {
      case "Sulama":
        evidence = {
          durationMinutes: num("durationMinutes"),
          waterAmount: num("waterAmount"),
          waterUnit: "litre",
        };
        break;
      case "Gubreleme":
        evidence = {
          fertilizerName: ev.fertilizerName || null,
          amount: num("amount"),
          amountUnit: task.quantityUnit || "kg",
        };
        break;
      case "Ilaclama":
        evidence = {
          pesticideName: ev.pesticideName || null,
          dose: ev.dose || null,
          waterAmount: num("waterAmount"),
          waterUnit: "litre",
        };
        break;
      case "Dikim":
        evidence = {
          seedlingCount: num("seedlingCount"),
          startedAt: ev.startedAt ? new Date(ev.startedAt).toISOString() : null,
          endedAt: ev.endedAt ? new Date(ev.endedAt).toISOString() : null,
        };
        break;
      case "Hasat":
        evidence = {
          productQuantity: num("productQuantity"),
          productUnit: task.quantityUnit || "kg",
          crateCount: num("crateCount"),
        };
        break;
      case "Bakim":
        evidence = { description: ev.description || null };
        break;
      default:
        evidence = task.requiresQuantity
          ? { amount: Number(quantity), amountUnit: task.quantityUnit ?? null }
          : null;
    }
    setSaving(true);
    setError(null);
    try {
      for (const source of files) {
        const file = await preparePhoto(source);
        const form = new FormData();
        form.append("file", file, file.name);
        try {
          await api(`/api/tasks/${task.id}/photos`, {
            method: "POST",
            body: form,
          });
        } catch {
          await enqueuePhoto(task.id, file);
          throw new Error(
            "Fotoğraf yüklenemedi ve güvenli kuyruğa alındı. Bağlantı geldiğinde otomatik yüklenecek; onaya göndermeyi daha sonra tekrar deneyin.",
          );
        }
      }
      await api(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ notes: notes.trim() || null, evidence }),
      });
      toast.success("Görev uzman onayına gönderildi.");
      navigate("/producer/tasks", { replace: true });
    } catch (err) {
      setError(
        errorText(
          err,
          err instanceof Error ? err.message : "Görev gönderilemedi.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <State
        icon={<LoaderCircle className="spin" />}
        title="Görev yükleniyor"
      />
    );
  if (error && !task)
    return (
      <State
        icon={<TriangleAlert />}
        title="Görev açılamadı"
        text={error}
        retry={() => void load()}
      />
    );
  if (!task) return <Navigate to="/producer/tasks" replace />;
  const edit = actionable(task.status);
  const plannedEvidence = formatEvidenceEntries(
    task.theme,
    task.plannedEvidenceJson,
    { planned: true },
  );
  const actualEvidence = formatEvidenceEntries(task.theme, task.evidenceJson);
  const trainingVideoUrl = safeExternalUrl(task.videoUrl);
  const guidanceImageUrl = task.imageUrl
    ? mediaUrl(task.imageUrl, token)
    : null;
  const field = (key: string, label: string, type = "text", min?: string) => (
    <label>
      {label}
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={type === "number" ? (min ?? "0.01") : undefined}
        step={type === "number" ? "any" : undefined}
        value={ev[key] || ""}
        onChange={(e) => setEv((v) => ({ ...v, [key]: e.target.value }))}
        required
      />
    </label>
  );
  return (
    <div className="pr-page pr-detail">
      <button className="pr-back" onClick={() => navigate(-1)}>
        <ChevronLeft />
        Görevlere dön
      </button>
      <div className="pr-detail-head">
        <span className={`pr-status s${task.status}`}>
          {labels[task.status]}
        </span>
        <h1>{task.title}</h1>
        <p>
          <Clock3 />
          {date(task.dueDate)}
        </p>
      </div>
      {(task.description || task.imageUrl || trainingVideoUrl) && (
        <section className="pr-info pr-guidance-card">
          <header className="pr-guidance-head">
            <span><BookOpen /></span>
            <div>
              <small>UZMAN REHBERİ</small>
              <h2>Bu adımı nasıl yapmalısın?</h2>
            </div>
          </header>
          {task.description ? (
            <p className="pr-guidance-copy">{task.description}</p>
          ) : (
            <p className="pr-guidance-copy">
              Aşağıdaki görseli inceleyip eğitim bağlantısını açabilirsin.
            </p>
          )}
          {guidanceImageUrl && (
            <a
              className="pr-guidance-visual"
              href={guidanceImageUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${task.title} eğitim görselini büyüt`}
            >
              <img
                className="pr-guidance-image"
                src={guidanceImageUrl}
                alt={`${task.title} için uzman eğitim görseli`}
              />
              <span>Görseli büyüt</span>
            </a>
          )}
          {trainingVideoUrl && (
            <a
              className="pr-video-link"
              href={trainingVideoUrl}
              target="_blank"
              rel="noreferrer"
            >
              <PlayCircle />
              <span>
                <strong>Eğitim videosunu aç</strong>
                <small>Yeni sekmede güvenli bağlantı</small>
              </span>
              <ChevronRight />
            </a>
          )}
        </section>
      )}
      {plannedEvidence.length > 0 && (
        <section className="pr-info pr-evidence-card">
          <h2>Planlanan (hedef)</h2>
          {plannedEvidence.map((row) => (
            <p key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </p>
          ))}
        </section>
      )}
      <button
        className="pr-report-link"
        onClick={() =>
          navigate(
            `/producer/report-problem?taskId=${task.id}&taskTitle=${encodeURIComponent(task.title)}&landId=${task.landId}`,
          )
        }
      >
        <TriangleAlert />
        Sorun bildir
      </button>
      {task.revisionReason && (
        <div className="pr-warning">
          <TriangleAlert />
          <div>
            <strong>Düzeltme istendi</strong>
            <span>{task.revisionReason}</span>
          </div>
        </div>
      )}
      {edit ? (
        <form className="pr-form" onSubmit={submit}>
          <h2>Görevi tamamla</h2>
          {task.theme === "Sulama" && (
            <>
              {field("durationMinutes", "Sulama süresi (dakika)", "number")}
              {field("waterAmount", "Kullanılan su miktarı (litre)", "number")}
            </>
          )}
          {task.theme === "Gubreleme" && (
            <>
              {field("fertilizerName", "Gübre adı")}
              {field(
                "amount",
                `Gübre miktarı (${task.quantityUnit || "kg"})`,
                "number",
              )}
            </>
          )}
          {task.theme === "Ilaclama" && (
            <>
              {field("pesticideName", "İlaç adı")}
              {field("dose", "Uygulanan doz")}
              {field("waterAmount", "Su miktarı (litre)", "number")}
            </>
          )}
          {task.theme === "Dikim" && (
            <>
              {field("seedlingCount", "Fide sayısı", "number")}
              {field("startedAt", "Başlangıç zamanı", "datetime-local")}
              {field("endedAt", "Bitiş zamanı", "datetime-local")}
            </>
          )}
          {task.theme === "Hasat" && (
            <>
              {field(
                "productQuantity",
                `Ürün miktarı (${task.quantityUnit || "kg"})`,
                "number",
              )}
              {field("crateCount", "Kasa sayısı", "number", "0")}
            </>
          )}
          {task.theme === "Bakim" && (
            <label>
              Yapılan bakım
              <textarea
                value={ev.description || ""}
                onChange={(e) =>
                  setEv((v) => ({ ...v, description: e.target.value }))
                }
                required
              />
            </label>
          )}
          {!task.theme && task.requiresQuantity && (
            <label>
              Miktar ({task.quantityUnit || "birim"})
              <input
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </label>
          )}
          <label>
            Fotoğraf{" "}
            {task.requiresPhoto || task.theme ? "(zorunlu)" : "(isteğe bağlı)"}
            <span className="pr-file">
              <Camera />
              <b>
                {files.length
                  ? `${files.length} fotoğraf seçildi`
                  : "Kamera veya galeriden seç"}
              </b>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                capture="environment"
                multiple
                onChange={choose}
              />
            </span>
            <small>
              En fazla 4 fotoğraf; büyük görüntüler yüklemeden önce otomatik
              küçültülür.
            </small>
          </label>
          {previews.length > 0 && (
            <div className="pr-photo-preview" aria-label="Seçilen fotoğraflar">
              {previews.map(({ file, url }, index) => (
                <figure key={`${file.name}-${file.lastModified}`}>
                  <img src={url} alt={`Seçilen fotoğraf ${index + 1}`} />
                  <button
                    type="button"
                    onClick={() => {
                      setFiles((current) =>
                        current.filter((_, i) => i !== index),
                      );
                      setConfirming(false);
                    }}
                  >
                    Kaldır
                  </button>
                </figure>
              ))}
            </div>
          )}
          <label>
            Uzman için not
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              placeholder="İşlem hakkında kısa bilgi..."
            />
          </label>
          {error && <p className="pr-error">{error}</p>}
          {confirming && (
            <div className="pr-confirm-card">
              <CheckCircle2 />
              <div>
                <strong>Onaya göndermeye hazır</strong>
                <span>
                  {files.length
                    ? `${files.length} fotoğraf eklendi. Görev uzman incelemesine gönderilecek.`
                    : "Görev uzman incelemesine gönderilecek."}
                </span>
              </div>
            </div>
          )}
          <button className="pr-primary pr-submit" disabled={saving}>
            {saving ? (
              <>
                <LoaderCircle className="spin" />
                Gönderiliyor…
              </>
            ) : (
              <>
                <Send />
                {confirming ? "Evet, onaya gönder" : "Devam et"}
              </>
            )}
          </button>
          {confirming && (
            <button
              className="pr-secondary"
              type="button"
              disabled={saving}
              onClick={() => setConfirming(false)}
            >
              Vazgeç
            </button>
          )}
        </form>
      ) : (
        <>
          <div className="pr-success">
            <CheckCircle2 />
            <div>
              <strong>
                {task.status === 5
                  ? "Uzman onayı bekleniyor"
                  : "Görev tamamlandı"}
              </strong>
              <span>{task.completionNotes}</span>
            </div>
          </div>
          {(actualEvidence.length > 0 || task.completionNotes) && (
            <section className="pr-info pr-evidence-card">
              <h2>Gerçekleşen (üretici)</h2>
              {actualEvidence.map((row) => (
                <p key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </p>
              ))}
              {!actualEvidence.length && task.completionNotes && (
                <div className="pr-evidence-note">{task.completionNotes}</div>
              )}
            </section>
          )}
          {task.photos?.length > 0 && (
            <section className="pr-info">
              <h2>
                {task.theme === "Bakim"
                  ? "Kanıt fotoğrafları (öncesi / sonrası)"
                  : "Kanıt fotoğrafları"}
              </h2>
              <div className="pr-server-photos">
                {task.photos.map((photo, index) => (
                  <a
                    key={photo.id}
                    href={mediaUrl(photo.storageKey, token)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={mediaUrl(photo.storageKey, token)}
                      alt={`Kanıt fotoğrafı ${index + 1}`}
                    />
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function relativeTime(value?: string | null) {
  if (!value) return "";
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "Şimdi";
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days} g` : new Date(value).toLocaleDateString("tr-TR");
}

function MessagesPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<ConversationListItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [subject, setSubject] = useState(""),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [askOpen, setAskOpen] = useState(false),
    [starting, setStarting] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<ConversationListItem[]>("/api/conversations/expert"));
      setError(null);
    } catch (e) {
      setError(errorText(e, "Mesajlar yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    if (!needle) return items;
    return items.filter((item) =>
      `${item.subject} ${item.lastMessagePreview ?? ""}`
        .toLocaleLowerCase("tr-TR")
        .includes(needle),
    );
  }, [items, query]);
  async function start(e: FormEvent) {
    e.preventDefault();
    setStarting(true);
    try {
      const id = await api<string>("/api/conversations/ask-expert", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim() || "Genel soru",
          landId: null,
        }),
      });
      nav(`/producer/messages/${id}`);
    } catch (err) {
      setError(errorText(err, "Sohbet başlatılamadı."));
    } finally {
      setStarting(false);
    }
  }
  return (
    <div className="pr-page pr-messages-page">
      <div className="pr-page-header">
        <h1>Sohbet</h1>
        <button
          aria-label="Ara"
          onClick={() => {
            setSearchOpen((value) => !value);
            if (searchOpen) setQuery("");
          }}
        >
          <Search />
        </button>
      </div>
      {searchOpen && (
        <input
          className="pr-search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Konuşmalarda ara"
        />
      )}
      <section className="pr-chat-hero">
        <div className="pr-chat-art">
          <i />
          <i />
          <i />
        </div>
        <h2>Uzmanlarımıza sor</h2>
        <p>Tarımla ilgili her şeyi sorabilirsiniz — sulama, hastalık, gübre.</p>
        <button className="pr-primary" onClick={() => setAskOpen(true)}>
          Uzmana sor
        </button>
      </section>
      {askOpen && (
        <form className="pr-ask" onSubmit={start}>
          <label>
            Konu
            <input
              autoFocus
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={150}
              placeholder="Örn. Sulama hakkında soru"
              required
            />
          </label>
          <button className="pr-primary" disabled={starting}>
            <MessageCircle />
            {starting ? "Açılıyor…" : "Sohbet başlat"}
          </button>
          <button
            className="pr-secondary"
            type="button"
            onClick={() => setAskOpen(false)}
          >
            Vazgeç
          </button>
        </form>
      )}
      {error && <p className="pr-error">{error}</p>}
      {filtered.length > 0 && (
        <h2 className="pr-section-label">Son konuşmalar</h2>
      )}
      {loading ? (
        <State
          icon={<LoaderCircle className="spin" />}
          title="Mesajlar yükleniyor"
        />
      ) : (
        <div className="pr-list">
          {filtered.length ? (
            filtered.map((i) => (
              <button
                className="pr-message"
                key={i.id}
                onClick={() => nav(`/producer/messages/${i.id}`)}
              >
                <span className="pr-avatar">
                  {(i.subject.trim()[0] || "U").toLocaleUpperCase("tr-TR")}
                </span>
                <div>
                  <header>
                    <strong>{i.subject}</strong>
                    <time>{relativeTime(i.lastMessageAtUtc)}</time>
                  </header>
                  <span>{i.lastMessagePreview || "Henüz mesaj yok"}</span>
                </div>
                <span className="pr-message-end" aria-hidden="true">
                  {i.hasUnread && <i />}
                  <ChevronRight />
                </span>
              </button>
            ))
          ) : (
            <State
              title="Henüz görüşme yok"
              text="Yukarıdan sohbet başlatabilirsiniz."
            />
          )}
        </div>
      )}
    </div>
  );
}

function ChatPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [detail, setDetail] = useState<ConversationDetail | null>(null),
    [text, setText] = useState(""),
    [loading, setLoading] = useState(true),
    [sending, setSending] = useState(false),
    [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      setDetail(
        await api<ConversationDetail>(`/api/conversations/${conversationId}`),
      );
      setError(null);
    } catch (e) {
      setError(errorText(e, "Sohbet yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages.length]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !conversationId) return;
    setSending(true);
    try {
      await api(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text.trim() }),
      });
      setText("");
      await load();
    } catch (err) {
      setError(errorText(err, "Mesaj gönderilemedi."));
    } finally {
      setSending(false);
    }
  }
  if (loading)
    return (
      <State icon={<LoaderCircle className="spin" />} title="Sohbet açılıyor" />
    );
  return (
    <div className="pr-chat">
      <header>
        <NavLink to="/producer/messages">
          <ChevronLeft />
        </NavLink>
        <div>
          <strong>{detail?.subject || "Uzman görüşmesi"}</strong>
          <span>Tarım uzmanı</span>
        </div>
      </header>
      {error && <p className="pr-error">{error}</p>}
      <div className="pr-chat-list">
        {detail?.messages.map((m) => (
          <div
            key={m.id}
            className={`pr-bubble ${m.senderUserId === user?.userId ? "mine" : ""}`}
          >
            <p>{m.body}</p>
            <time>
              {new Date(m.sentAtUtc).toLocaleString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })}
            </time>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="pr-chat-form" onSubmit={send}>
        <textarea
          aria-label="Mesaj"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesajınızı yazın…"
          maxLength={2000}
        />
        <button
          type="submit"
          aria-label="Gönder"
          disabled={sending || !text.trim()}
        >
          <Send />
        </button>
      </form>
    </div>
  );
}

function ReportProblemPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const taskTitle = params.get("taskTitle");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const conversationId = await api<string>(
        "/api/conversations/ask-expert",
        {
          method: "POST",
          body: JSON.stringify({
            subject: `Sorun: ${title.trim()}`,
            landId: params.get("landId") || null,
          }),
        },
      );
      const body = [
        title.trim(),
        description.trim() || null,
        taskTitle ? `İlgili görev: ${taskTitle}` : null,
        photos.length
          ? `(Üretici ${photos.length} görsel seçti; sohbete dosya eki henüz desteklenmediği için açıklamada belirtildi.)`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n");
      await api(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      navigate(`/producer/messages/${conversationId}`, { replace: true });
    } catch (reason) {
      setError(errorText(reason, "Sorun gönderilemedi."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="pr-page pr-report">
      <button className="pr-back" onClick={() => navigate(-1)}>
        <ChevronLeft />
        Geri
      </button>
      <Title eyebrow="Uzmanınıza iletin" title="Sorun bildir" />
      <p className="pr-helper">
        Metin uzmana sohbet olarak gider. Görseller görev kanıtına eklenmez;
        yalnızca not olarak iletilir.
      </p>
      {taskTitle && <span className="pr-context-chip">{taskTitle}</span>}
      <form className="pr-form" onSubmit={submit}>
        <label>
          Başlık
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Örn. Sulama hattında kaçak"
            required
          />
        </label>
        <label>
          Açıklama (isteğe bağlı)
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Kısaca anlatın…"
          />
        </label>
        <label>
          Görsel (isteğe bağlı)
          <span className="pr-file">
            <Camera />
            <b>
              {photos.length
                ? `${photos.length} görsel seçildi`
                : "Galeriden seç"}
            </b>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                setPhotos(Array.from(event.target.files ?? []).slice(0, 3))
              }
            />
          </span>
        </label>
        {error && <p className="pr-error">{error}</p>}
        <button className="pr-primary" disabled={saving}>
          {saving ? "Gönderiliyor…" : "Gönder"}
        </button>
        <button
          className="pr-secondary"
          type="button"
          onClick={() => navigate(-1)}
        >
          Vazgeç
        </button>
      </form>
    </div>
  );
}

function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [unread, setUnread] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<NotificationItem[]>("/api/notifications"));
      setError(null);
    } catch (e) {
      setError(errorText(e, "Bildirimler yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("agriculture:notification", refresh);
    return () =>
      window.removeEventListener("agriculture:notification", refresh);
  }, [load]);
  async function read(n: NotificationItem) {
    try {
      if (!n.isRead) {
        await api(`/api/notifications/${n.id}/read`, { method: "POST" });
        setItems((v) =>
          v.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
        );
      }
      if (
        n.relatedEntityType?.toLocaleLowerCase("tr-TR") === "task" &&
        n.relatedEntityId
      )
        navigate(`/producer/tasks/${n.relatedEntityId}`);
    } catch (e) {
      setError(errorText(e, "Bildirim güncellenemedi."));
    }
  }
  async function all() {
    try {
      await api("/api/notifications/read-all", { method: "POST" });
      setItems((v) => v.map((x) => ({ ...x, isRead: true })));
    } catch (e) {
      setError(errorText(e, "Bildirimler güncellenemedi."));
    }
  }
  const visible = unread ? items.filter((x) => !x.isRead) : items;
  return (
    <div className="pr-page">
      <div className="pr-page-header pr-notification-header">
        <h1>Bildirimler</h1>
        <button className="pr-read-all" onClick={() => void all()}>
          Tümünü oku
        </button>
      </div>
      <div className="pr-segments">
        <button
          className={!unread ? "active" : ""}
          onClick={() => setUnread(false)}
        >
          Tümü
        </button>
        <button
          className={unread ? "active" : ""}
          onClick={() => setUnread(true)}
        >
          Okunmamış
        </button>
      </div>
      {error && <p className="pr-error">{error}</p>}
      {loading ? (
        <State
          icon={<LoaderCircle className="spin" />}
          title="Bildirimler yükleniyor"
        />
      ) : (
        <div className="pr-list">
          {visible.length ? (
            visible.map((n) => {
              const visual = notificationVisual(n);
              return (
                <button
                  key={n.id}
                  className={`pr-notification ${!n.isRead ? "unread" : ""}`}
                  onClick={() => void read(n)}
                >
                  <span className={`pr-notification-icon ${visual.tone}`}>
                    {visual.icon}
                  </span>
                  <div>
                    <header>
                      <strong>{n.title}</strong>
                      <time>{relativeTime(n.createdAtUtc)} önce</time>
                    </header>
                    <p>{n.body}</p>
                  </div>
                  {!n.isRead && <i className="pr-unread-dot" />}
                </button>
              );
            })
          ) : (
            <State
              title="Bildirim yok"
              text="Yeni bildirimler burada görünecek."
            />
          )}
        </div>
      )}
    </div>
  );
}

function notificationVisual(item: NotificationItem) {
  const value = `${item.title} ${item.body}`.toLocaleLowerCase("tr-TR");
  if (/onay|tamam|başar/.test(value))
    return { tone: "success", icon: <Check /> };
  if (/düzelt|redd|sorun|hata/.test(value))
    return { tone: "danger", icon: <Flag /> };
  if (/sula|su /.test(value)) return { tone: "water", icon: <Droplets /> };
  if (/sistem|güncelle/.test(value))
    return { tone: "system", icon: <Settings /> };
  if (/yeni|atan/.test(value)) return { tone: "new", icon: <Plus /> };
  return { tone: "default", icon: <Bell /> };
}

function ProfilePage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [lands, setLands] = useState<Land[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(supportsWebPush() ? Notification.permission : "unsupported");
  const [pushRegistering, setPushRegistering] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  useEffect(() => {
    void Promise.all([api<Me>("/api/me"), api<Land[]>("/api/lands")])
      .then(([m, l]) => {
        setMe(m);
        setLands(l);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (notificationPermission === "granted")
      void hasWebPushSubscription()
        .then(setPushEnabled)
        .catch(() => setPushEnabled(false));
  }, [notificationPermission]);
  if (loading)
    return (
      <State
        icon={<LoaderCircle className="spin" />}
        title="Profil yükleniyor"
      />
    );
  const name = me?.fullName || user?.fullName || "Üretici";
  const signOut = async () => {
    if (!confirm("Oturumu kapatmak istiyor musunuz?")) return;
    try {
      await unregisterWebPush();
    } catch {
      // Invalid subscriptions are also removed by the backend after delivery failure.
    }
    logout();
    nav("/login", { replace: true });
  };
  const enableNotifications = async () => {
    if (!supportsWebPush()) return;
    setPushRegistering(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") return;
      await registerWebPush();
      setPushEnabled(true);
      toast.success("Arka plan cihaz bildirimleri açıldı.");
    } catch (reason) {
      toast.error(errorText(reason, "Cihaz bildirimleri açılamadı."));
    } finally {
      setPushRegistering(false);
    }
  };
  const disableNotifications = async () => {
    setPushRegistering(true);
    try {
      await unregisterWebPush();
      setPushEnabled(false);
      toast.success("Arka plan cihaz bildirimleri kapatıldı.");
    } catch (reason) {
      toast.error(errorText(reason, "Cihaz bildirimleri kapatılamadı."));
    } finally {
      setPushRegistering(false);
    }
  };
  return (
    <div className="pr-page">
      <div className="pr-page-header">
        <h1>Profil</h1>
        <button
          aria-label="Hesap bilgileri"
          onClick={() => setAccountOpen((v) => !v)}
        >
          <Settings />
        </button>
      </div>
      <div className="pr-profile">
        <div>{name[0]?.toLocaleUpperCase("tr-TR")}</div>
        <h1>{name}</h1>
        <span>Üretici</span>
        <button onClick={() => setAccountOpen((v) => !v)}>
          Hesap bilgileri
        </button>
      </div>
      {accountOpen && (
        <section className="pr-profile-info">
          <h2>İletişim bilgileri</h2>
          <p>
            <span>Telefon</span>
            <strong>{me?.phone || "Kayıtlı değil"}</strong>
          </p>
          <p>
            <span>E-posta</span>
            <strong>{me?.email || user?.email || "Kayıtlı değil"}</strong>
          </p>
        </section>
      )}
      <section>
        <h2>Arazilerim</h2>
        <div className="pr-land-grid">
          {lands.map((l) => (
            <article className="pr-land" key={l.id}>
              <Sprout />
              <div>
                <strong>{l.name}</strong>
                <span>
                  {l.sizeInDecares} dekar ·{" "}
                  {l.neighborhood || l.district || "Konum belirtilmedi"}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="pr-profile-menu">
        {notificationPermission !== "unsupported" && (
          <button
            disabled={pushRegistering}
            onClick={() =>
              void (pushEnabled
                ? disableNotifications()
                : enableNotifications())
            }
          >
            <Bell />
            <span>
              Cihaz bildirimleri
              <small>
                {pushRegistering
                  ? "Kaydediliyor…"
                  : notificationPermission === "granted"
                    ? pushEnabled
                      ? "Arka planda açık · kapatmak için dokunun"
                      : "Açmak için dokunun"
                    : notificationPermission === "denied"
                      ? "Tarayıcı ayarlarından izin verin"
                      : "Açmak için dokunun"}
              </small>
            </span>
            <ChevronLeft />
          </button>
        )}
        <button onClick={() => nav("/producer/notifications")}>
          <Bell />
          <span>Bildirimler</span>
          <ChevronLeft />
        </button>
        <button onClick={() => nav("/producer/messages")}>
          <MessageCircle />
          <span>Sohbet</span>
          <ChevronLeft />
        </button>
        <button className="danger" onClick={() => void signOut()}>
          <LogOut />
          <span>Çıkış yap</span>
          <ChevronLeft />
        </button>
      </div>
    </div>
  );
}

function Title({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="pr-title">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  );
}
function Segments({
  value,
  setValue,
}: {
  value: "open" | "process";
  setValue: (v: "open" | "process") => void;
}) {
  return (
    <div className="pr-segments">
      <button
        type="button"
        className={value === "open" ? "active" : ""}
        aria-pressed={value === "open"}
        onClick={() => setValue("open")}
      >
        Yapılacak
      </button>
      <button
        type="button"
        className={value === "process" ? "active" : ""}
        aria-pressed={value === "process"}
        onClick={() => setValue("process")}
      >
        Süreç
      </button>
    </div>
  );
}

export function ProducerApp() {
  const { token } = useAuth();
  const receiveNotification = useCallback((notification: LiveNotification) => {
    const title = notification.title || "Yeni bildirim";
    const body =
      notification.message ||
      notification.body ||
      "Tarım uygulamasında yeni bir güncelleme var.";
    toast.success(`${title}\n${body}`);
    window.dispatchEvent(
      new CustomEvent("agriculture:notification", { detail: notification }),
    );
    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      document.visibilityState !== "visible"
    ) {
      const systemNotification = new Notification(title, {
        body,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: notification.id || notification.relatedEntityId || title,
      });
      systemNotification.onclick = () => {
        window.focus();
        if (
          notification.relatedEntityType?.toLocaleLowerCase("tr-TR") ===
            "task" &&
          notification.relatedEntityId
        )
          window.location.assign(
            `/producer/tasks/${notification.relatedEntityId}`,
          );
        else window.location.assign("/producer/notifications");
      };
    }
  }, []);
  useSignalR(token, receiveNotification);
  useEffect(() => {
    const flush = () =>
      void flushPhotoQueue().then((result) => {
        if (result.sent > 0)
          toast.success(`${result.sent} bekleyen fotoğraf yüklendi.`);
      });
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);
  return (
    <div className="pr-shell">
      <main>
        <Routes>
          <Route index element={<TasksPage />} />
          <Route path="tasks" element={<Navigate to="/producer" replace />} />
          <Route path="tasks/:taskId" element={<TaskPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/:conversationId" element={<ChatPage />} />
          <Route path="report-problem" element={<ReportProblemPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/producer" replace />} />
        </Routes>
      </main>
      <nav className="pr-tabs">
        <NavLink end to="/producer">
          <CheckCircle2 />
          <span>Görevler</span>
        </NavLink>
        <NavLink to="/producer/messages">
          <MessageCircle />
          <span>Sohbet</span>
        </NavLink>
        <NavLink to="/producer/notifications">
          <Bell />
          <span>Bildirimler</span>
        </NavLink>
        <NavLink to="/producer/profile">
          <CircleUserRound />
          <span>Profil</span>
        </NavLink>
      </nav>
    </div>
  );
}
