# Tarım Yönetim Paneli (React)

Belediye **Yönetici** ve **Tarım Uzmanı** için operasyon odaklı yönetim SPA (tr-TR).  
Bilgi mimarisi: `docs/ADMIN_IA.md` · Eleştiri: `docs/ADMIN_PANEL_CRITIQUE.md`

## Tasarım

UI chrome (sidebar, topbar, renk/token, kart ve tablo dili) v0 export **AgroYönetim** admin panelinden (`admin-panel-interface`) Vite + React Router uygulamasına uyarlandı. Next.js iskeleti taşınmadı; AMS süreç grupları, rol menüleri ve API bağlantıları korundu. Tema: orman yeşili oklch token’lar, Geist tipografi, açık/koyu mod.

## Çalıştırma

```bash
# API (ayrı terminal)
dotnet run --project src/Hosts/Agriculture.Api --launch-profile http

# Panel
cd frontend
npm install
npm run dev
```

Aç: http://localhost:5173  
API tabanı: `.env.development` → `VITE_API_URL=http://localhost:5109`

## Giriş

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Yönetici | `admin@agriculture.local` | `Admin123!` |
| Tarım Uzmanı | `uzman@agriculture.local` | `Officer123!` |

Üreticiler mobil uygulamayı kullanır; SPA girişi reddedilir.

## Ekranlar (süreç grupları)

- **Operasyon** — Operasyon Merkezi (günlük işler), Görevler
- **Planlama** — Üreticiler, Araziler, Sezonlar, İş akışları
- **Saha** — Denetimler, Hasat ve teslimat
- **İzleme** — Bildirimler, Raporlar
- **İletişim** — Mesajlar (uzmana sor)
- **Profil** — üst çubuktan

> Destek programları admin UI’dan ertelendi (V1 opsiyonel; backend API duruyor).

## Build

```bash
cd frontend && npm run build
dotnet build
```
