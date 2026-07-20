# Producer mobile app (Expo)

React Native (Expo) client for municipal **Producer** users. Turkish UI (`tr-TR`).

## Prerequisites

1. SQL Server (repo root): `docker compose up -d sqlserver`
2. API: `dotnet run --project src/Hosts/Agriculture.Api --launch-profile http` → `http://localhost:5109`

## Run

```bash
npm install
npx expo start
```

Simulator: press `i` (iOS) or `a` (Android).

### Demo login

| Field | Value |
|-------|--------|
| Email / phone | `uretici@agriculture.local` or `05559876543` |
| Password | `Producer123!` |

### API URL (`src/api/config.ts`)

| Target | Base URL |
|--------|----------|
| iOS Simulator / web | `http://127.0.0.1:5109` (default) |
| Android emulator | `http://10.0.2.2:5109` (default) |
| Physical device | `EXPO_PUBLIC_API_URL=http://<LAN-IP>:5109` |

Example for a phone on the same Wi‑Fi:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:5109 npx expo start
```

API launch profile binds `0.0.0.0:5109` so LAN devices can reach the host.

Optional: set `extra.apiBaseUrl` in `app.json`.

## Demo click-path (Türkçe)

1. **Giriş yap** → `uretici@agriculture.local` / `Producer123!`
2. **Görevler** sekmesi → bugünün açık görevleri
3. Fotoğraf gerektiren göreve dokunun → **Kamera ile çek** veya **Galeriden seç** → **Yükle ve devam et** → **Evet, tamamla**
4. Liste otomatik yenilenir (tamamlanan görev kaybolur; API yeniden başlatılınca seed tekrar açık görev ekler)
5. **Sohbet** → **Uzmana sor** → mesaj yazıp **Gönder**
6. **Bildirimler** sekmesi
7. **Profil** → **Çıkış yap**

## Typecheck

```bash
npx tsc --noEmit
```
