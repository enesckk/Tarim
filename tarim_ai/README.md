# Tarım AI — Sentinel Uydu Görüntüsü Servisi

Copernicus Data Space Ecosystem (Sentinel Hub) üzerinden Sentinel-2 L2A görüntülerini arayan ve parsel poligonu için True Color / NDVI PNG üreten Express API.

## Gereksinimler

- Node.js 18+
- npm 9+
- Copernicus Data Space hesabı ve OAuth client credentials

## Mac kurulum

```bash
# Depoyu klonlayın / proje klasörüne gidin
cd tarim_ai

# Bağımlılıkları yükleyin
npm install

# Ortam değişkenlerini ayarlayın
cp .env.example .env
# .env dosyasını düzenleyip COPERNICUS_CLIENT_ID ve COPERNICUS_CLIENT_SECRET değerlerini girin
```

## Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `COPERNICUS_CLIENT_ID` | OAuth client id |
| `COPERNICUS_CLIENT_SECRET` | OAuth client secret |
| `COPERNICUS_TOKEN_URL` | Token endpoint (varsayılan CDSE) |
| `COPERNICUS_BASE_URL` | Sentinel Hub base URL |
| `PORT` | HTTP port (varsayılan `4000`) |

## Komutlar

```bash
# Geliştirme (hot reload)
npm run dev

# Production build
npm run build
npm start

# Testler
npm test

# Lint / format
npm run lint
npm run format
```

## Field Survey (Saha Doğrulama)

`POST /api/field-surveys` ve ilgili workflow endpointleri saha ölçümlerini kaydeder.

**Depolama:** Varsayılan repository `InMemoryFieldSurveyRepository`dır. Veriler yalnızca process belleğinde tutulur; process restart sonrası kalıcılık yoktur ve kalıcı storage olarak sunulmamalıdır. PostgreSQL vb. için `FieldSurveyRepository` arayüzü kullanılabilir.

Fotoğraflar için yalnızca metadata (`fileReference`) desteklenir; gerçek dosya/S3 depolama yoktur.


Varsayılan provider `mock` (`PARCEL_PROVIDER=mock`). Gerçek TKGM için `PARCEL_PROVIDER=tkgm` (resmi/stabil public API değildir; kırılgan olabilir).

```bash
curl -X POST http://localhost:4000/api/parcel/resolve \
  -H 'Content-Type: application/json' \
  -d '{"province":"Gaziantep","district":"Şehitkamil","neighborhood":"Güngürge","block":"108","parcel":"7"}'
```

## API

Base URL: `http://localhost:4000`

### `GET /health`

Sağlık kontrolü.

### `POST /api/satellite/search`

Son N gündeki Sentinel-2 L2A ürünlerini listeler (en yeniden eskiye).

```bash
curl -s -X POST http://localhost:4000/api/satellite/search \
  -H 'Content-Type: application/json' \
  -d @- <<'EOF'
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [36.93712, 37.54821],
      [36.93845, 37.54821],
      [36.93845, 37.54935],
      [36.93712, 37.54935],
      [36.93712, 37.54821]
    ]]
  },
  "days": 30
}
EOF
```

### `POST /api/satellite/latest/true-color`

En güncel ürün için True Color PNG üretir ve `outputs/` altına kaydeder.

### `POST /api/satellite/latest/ndvi`

En güncel ürün için NDVI PNG üretir.

### `POST /api/satellite/surface-analysis`

Sentinel-2 zaman serisi üzerinden yüzey sürekliliği, mevsimsel bitki aktivitesi, tarımsal döngü sinyali, sürekli açık yüzey ve bilgilendirici muhtemel kayalık / sığ yüzey risk sinyali üretir.

```bash
curl -s -X POST http://localhost:4000/api/satellite/surface-analysis \
  -H 'Content-Type: application/json' \
  -d '{"parcelQuery":{"province":"Gaziantep","district":"Şehitkamil","neighborhood":"Güngürge","block":"108","parcel":"7"},"months":12}'
```

### `POST /api/satellite/surface-persistence`

Aynı girdilerle yüzey sürekliliği / açık yüzey / muhtemel kayalık alt kümesini döner.

Sınırlamalar:

- Kesin kaya yüzdesi veya gerçek toprak derinliği değildir.
- Bu sürüm ürün skorlarını veya senaryo sıralamasını değiştirmez.
- Calibration profile `v1.3` surface eşikleri henüz saha doğrulamasından geçmemiştir.

## Terrain Analysis

Parsel geometrisi üzerinden rakım, eğim, bakı, engebelilik ve terrain tabanlı mekanizasyon uygunluğu üretir.

| Değişken | Açıklama |
|---|---|
| `TERRAIN_PROVIDER` | `mock` (varsayılan) \| `copernicus-dem` \| `fallback` |
| `TERRAIN_DEM_ENABLED` | `true` yalnızca CDSE Process API DEM erişimi açıksa |
| `TERRAIN_DEM_INSTANCE` | Varsayılan `COPERNICUS_30` (GLO-30) |
| `TERRAIN_DEM_TIMEOUT_MS` | DEM istek zaman aşımı |

Davranış:

- `mock`: deterministik temsili DEM; gerçek ölçüm değildir (`isMock=true`, confidence en fazla medium).
- `copernicus-dem`: CDSE Sentinel Hub Process API üzerinden DEM raster örneklemesi. Hesapta DEM koleksiyonu kapalıysa `not_configured` / kontrollü hata.
- `fallback`: önce Copernicus DEM dener; başarısızsa `mock-fallback` (`fallbackUsed=true`).

Sınırlamalar:

- ~30 m çözünürlük; küçük parsellerde örnek sayısı ve confidence düşer.
- Terrain uzaktan tahmindir; saha ölçümü yerine geçmez.
- Mekanizasyon sonucu yol erişimi / gerçek makine geçişini içermez.
- Bu sürümde terrain ürün skorlarını veya senaryo sıralamasını değiştirmez.

```bash
curl -s -X POST http://localhost:4000/api/terrain/profile \
  -H 'Content-Type: application/json' \
  -d '{"parcelQuery":{"province":"Gaziantep","district":"Şehitkamil","neighborhood":"Güngürge","block":"108","parcel":"7"}}'
```

## Örnek parsel

`data/parcels/gungurge-108-7.geojson` dosyasındaki geometry alanını request body'de kullanabilirsiniz.

## Çıktılar

Üretilen PNG dosyaları `outputs/` klasörüne yazılır:

```text
true-color-YYYY-MM-DDTHH-mm-ss.png
ndvi-YYYY-MM-DDTHH-mm-ss.png
```

## Mimari

```text
src/
  config/          # Ortam değişkenleri (Zod)
  modules/
    parcel/
    environment/   # climate + soil
    terrain/       # DEM / slope / aspect / mechanization
    satellite/     # surface-analysis (Sentinel time-series surface signals)
    crop-recommendation/
    analysis-orchestrator/  # Demo analysis orchestration API
  controllers/     # HTTP katmanı (satellite)
  routes/
  services/
  schemas/
  types/
  utils/
  evalscripts/
```

## Demo — Analysis Orchestrator

Tek endpoint üzerinden parsel analizi (frontend'in her servisi ayrı çağırmasına gerek yok).

### 1. PostgreSQL başlatma

```bash
npm run db:up
```

### 2. Migration

```bash
DATABASE_URL=postgresql://tarim:tarim@localhost:5433/tarim_ai \
PERSISTENCE_PROVIDER=postgresql \
DATABASE_ENABLED=true \
npm run db:migrate
```

### 3. Env hazırlama

`.env` içinde en az:

```bash
COPERNICUS_CLIENT_ID=...
COPERNICUS_CLIENT_SECRET=...
ANALYSIS_DATA_MODE=live   # veya golden
```

### 4. Live mode

```bash
ANALYSIS_DATA_MODE=live npm run dev
```

### 5. Golden capture (gerçek providerlardan)

```bash
npm run demo:golden:capture
```

Güngürge 108/7 için live analiz çalıştırır ve `fixtures/golden/gungurge-108-7/` altına kaydeder.

### 6. Golden verify

```bash
npm run demo:golden:verify
```

### 7. Golden mode

```bash
ANALYSIS_DATA_MODE=golden npm run dev
```

### 8. API başlatma

```bash
npm run build && npm start
```

### 9. Readiness kontrolü

```bash
npm run demo:readiness
# veya
curl http://localhost:4000/api/demo/readiness
```

### 10. Demo E2E testi

```bash
npm run test:demo:e2e
```

### Analysis API

```bash
# Analiz başlat
curl -X POST http://localhost:4000/api/analyses \
  -H 'Content-Type: application/json' \
  -d '{"province":"Gaziantep","district":"Şehitkamil","neighborhood":"Güngürge","block":"108","parcel":"7"}'

# Durum
curl http://localhost:4000/api/analyses/{analysisId}/status

# Sonuç
curl http://localhost:4000/api/analyses/{analysisId}
```

Sözleşme detayları: `docs/analysis-api-contract.md`  
Endpoint envanteri: `docs/api-contract-audit.md`
