# Agriculture Management System

Municipal platform for digital agricultural production management — producers, lands, seasons, workflows, tasks, inspections, harvest, support, notifications, and producer messaging (**Uzmana sor**).

## Architecture

Modular monolith with Clean Architecture + CQRS:

```
src/
  BuildingBlocks/     SharedKernel, Application abstractions, Infrastructure
  Modules/            Identity, Producers, Lands, Seasons, Workflows, Tasks,
                      Inspections, Harvest, Support, Notifications, Communication
  Hosts/Agriculture.Api
frontend/             Tek istemci: yönetici/uzman SPA + üretici PWA (Vite + TypeScript, tr-TR)
                      Üretici istemcisi frontend PWA'ya taşındı; eski mobile/ kaldırıldı
```

**Stack:** ASP.NET Core 9, EF Core, SQL Server, MediatR, FluentValidation, JWT Identity, Serilog, `IMemoryCache` (dashboard). MinIO optional via docker-compose; photo upload falls back to local disk (`wwwroot/uploads`).

## Prerequisites

- .NET 9 SDK
- Node.js 20+
- SQL Server at `localhost,1433` (Docker Compose on macOS; LocalDB is Windows-only)

## Connection string (Development)

`src/Hosts/Agriculture.Api/appsettings.Development.json`:

```
Server=localhost,1433;Database=AgricultureDb;User Id=sa;Password=Your_strong_Password123;TrustServerCertificate=True;MultipleActiveResultSets=true
```

## Demo — exact run commands

### 1. SQL Server

```bash
docker compose up -d sqlserver
```

Optional MinIO: `docker compose up -d` (photo upload works **without** MinIO via local disk).

### 2. API

```bash
dotnet build
dotnet run --project src/Hosts/Agriculture.Api --launch-profile http
```

- Swagger: http://localhost:5109/swagger  
- Health: http://localhost:5109/health  
- Listens on `0.0.0.0:5109` (simulator + LAN device)

Startup seeds demo users and ensures the producer always has open tasks (re-seeds when none remain).

### 3. Admin panel (React — Operasyon Merkezi)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (API URL: `VITE_API_URL` in `frontend/.env.development`).  
IA: `docs/ADMIN_IA.md` · Critique: `docs/ADMIN_PANEL_CRITIQUE.md`

| Role | Email | Password | Home / scope |
|------|-------|----------|--------------|
| **Administrator** | `admin@agriculture.local` | `Admin123!` | Operasyon Merkezi + full process nav |
| **Officer (Tarım Uzmanı)** | `uzman@agriculture.local` | `Officer123!` | Operasyon Merkezi + ops / planlama / saha / iletişim / raporlar |
| **Officer** | `uzman1@agriculture.local` | `Officer123!` | Mehmet Yıldız — SK-DEMO parsellerinin bir kısmı |
| **Officer** | `uzman2@agriculture.local` | `Officer123!` | Elif Kara — SK-DEMO parsellerinin bir kısmı |
| **Officer** | `uzman3@agriculture.local` | `Officer123!` | Can Özer — SK-DEMO parsellerinin bir kısmı |

**Nav groups:** Merkez · Saha ve üretim · İzleme  
**Click-path:** Giriş → Operasyon Merkezi → **Arazi durumu haritası** → Denetimler / Hasat / Mesajlar.  
**Harita:** Yalnızca enlem/boylamı olan araziler. Marker rengi operasyon durumuna göre değişir (kırmızı = kritik, turuncu = bugün, mavi = hasat, yeşil = normal). Koordinat yoksa sakin boş durum gösterilir. Yeni arazi formunda veya arazi detayında enlem/boylam girilebilir.

**Şehitkamil demo (Gaziantep):** API açılışında idempotent seed `SK-DEMO-01`…`SK-DEMO-15` parsellerini (mahalle, ürün, sezon, iş akışı, görevler, uzman/üretici ataması) ekler. Eksik koordinat veya atamalar her açılışta repair edilir (parseller çoğaltılmaz). Görmek için: `admin@agriculture.local` / `Admin123!` → Operasyon Merkezi → **Arazi durumu haritası**. “Demo Tarla” da Şehitkamil kümesinde gösterilir.

**Note:** Destek programları deferred from admin UI (backend Support API kept for later).
### 4. Producer PWA

```bash
cd frontend
npm install
npm run dev
```

Üretici girişi: `http://localhost:5173/login`. Android Chromium veya iOS Safari'de açıp **Ana ekrana ekle** seçeneğini kullanın; mağaza kurulumu gerekmez.

## Demo credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Administrator | `admin@agriculture.local` | `Admin123!` | Web admin |
| Officer (Tarım Uzmanı) | `uzman@agriculture.local` | `Officer123!` | Ayşe Uzman — Demo Tarla + genel ops |
| Officer | `uzman1@agriculture.local` | `Officer123!` | Mehmet Yıldız |
| Officer | `uzman2@agriculture.local` | `Officer123!` | Elif Kara |
| Officer | `uzman3@agriculture.local` | `Officer123!` | Can Özer |
| **Producer** | `uretici@agriculture.local` | `Producer123!` | **PWA login** |
| Inspector | `denetci@agriculture.local` | `Inspector123!` | Field role |

Producer phone (login identifier): `05559876543`

## Demo click-path (Türkçe — üretici PWA)

1. Uygulamayı açın → **Giriş yap** (`uretici@agriculture.local` / `Producer123!`)
2. Alt sekme **Görevler** → bugünün açık görevleri
3. **Yaprak fotoğrafı** (veya fotoğraf gerektiren görev) → **Kamera veya galeriden seç** → önizleme → **Devam et** → **Evet, onaya gönder**
4. Görev listesi yenilenir
5. **Sohbet** → **Uzmana sor** → mesaj gönder
6. **Bildirimler** → seed hatırlatmaları
7. **Profil** → **Çıkış yap**

## Main API routes

| Area | Methods |
|------|---------|
| `/api/auth` | login, register, refresh |
| `/api/me` | current user + producer profile |
| `/api/dashboard` | summary counts |
| `/api/producers` | list, register |
| `/api/lands` | list, register |
| `/api/seasons` | list, create, start |
| `/api/workflows` | list, create, **PUT update**, assign |
| `/api/tasks` | list / today / detail / photos / complete |
| `/api/conversations` | list (staff = all) / ask-expert / thread / send |
| `/api/notifications` | in-app notification list |

## What works

- **Admin SPA:** Operations Center (role-aware), process-grouped Turkish nav, workflows, inspections, harvest+delivery, notifications, messages, reports (Support programs deferred from UI; API kept)
- Expo producer app: login → today’s tasks → photo → complete → chat
- Seed re-opens producer tasks on API start when none are open
- Photo files under `src/Hosts/Agriculture.Api/wwwroot/uploads/`

## Still deferred

- Heavy reporting, GIS, Hangfire UI, complex settings
- Offline SQLite sync, FCM push, MinIO as primary object store
- Controllers + `/api/v1` cutover (current surface: `/api` Minimal APIs)
