# Analysis API Contract

Frontend için tek analiz orkestrasyon API sözleşmesi.

## Endpoints

### POST /api/analyses

Analiz başlatır.

**Request:**

```json
{
  "province": "Gaziantep",
  "district": "Şehitkamil",
  "neighborhood": "Güngürge",
  "block": "108",
  "parcel": "7"
}
```

**Response 201:**

```json
{
  "analysisId": "uuid",
  "parcelId": null,
  "status": "queued",
  "createdAt": "ISO-8601"
}
```

Golden modda `status` doğrudan `completed` olabilir.

---

### GET /api/analyses/:analysisId/status

İlerleme durumu.

**Response 200:**

```json
{
  "analysisId": "uuid",
  "status": "processing",
  "progress": 55,
  "currentStep": "soil",
  "steps": [
    {
      "key": "parcel",
      "label": "Parsel sınırı alınıyor",
      "status": "completed",
      "startedAt": "...",
      "completedAt": "...",
      "error": null
    }
  ]
}
```

**Step keys (sıra):**
`parcel` → `satellite_catalog` → `satellite_imagery` → `satellite_statistics` → `satellite_time_series` → `terrain` → `climate` → `soil` → `field_survey` → `land_usability` → `crop_compatibility` → `recommendations` → `report_ready`

**Step status:** `pending` | `processing` | `completed` | `partial` | `missing` | `failed` | `skipped`

**Analysis status:** `queued` | `processing` | `completed` | `partial_completed` | `failed`

---

### GET /api/analyses/:analysisId

Tamamlanmış analiz sonucu (tek normalize contract).

İşlenirken: HTTP 202 + progress özeti.

Tamamlandığında: `AnalysisResultResponse`

```json
{
  "analysisId": "uuid",
  "status": "completed",
  "parcel": {},
  "dataSources": [],
  "satellite": {},
  "terrain": {},
  "climate": {},
  "soil": {},
  "fieldSurvey": {},
  "landUsability": {},
  "cropRecommendations": [],
  "confidence": {},
  "limitations": [],
  "recommendedNextActions": [],
  "recommendationsArePreliminary": true,
  "generatedAt": "ISO-8601"
}
```

---

### GET /api/demo/readiness

Demo hazırlık kontrolü.

```json
{
  "status": "ready | degraded | not_ready",
  "mode": "live | golden",
  "database": { "status": "healthy" },
  "goldenDataset": { "status": "ready", "parcel": "Güngürge 108/7" },
  "providers": {},
  "reportGeneration": { "status": "missing" },
  "warnings": []
}
```

---

## Data Sources

| key | Anlam | estimated | measured | approved |
|-----|-------|-----------|----------|----------|
| parcel_provider | Kadastro parsel | hayır | evet | hayır |
| sentinel_2 | Sentinel-2 uydu | hayır | hayır | hayır |
| copernicus_dem | DEM yükseklik | evet | hayır | hayır |
| nasa_power | Bölgesel iklim tahmini | evet | hayır | hayır |
| soilgrids | Model toprak tahmini | evet | hayır | hayır |
| field_survey | Onaylı saha ölçümü | hayır | evet | evet |
| laboratory_analysis | Lab toprak (yoksa missing) | — | — | — |
| irrigation_water_analysis | Sulama suyu (yoksa missing) | — | — | — |

**Önemli:** SoilGrids measured değildir. NASA POWER station measurement değildir. Yalnızca approved field survey authoritative kabul edilir.

---

## Satellite Index Meanings

| Layer | Anlam | Üretilmemesi gereken çıkarım |
|-------|-------|------------------------------|
| True Color | Gerçek renkli görünüm | — |
| NDVI | Bitki gelişim göstergesi | Kesin verim |
| NDMI | Nem göstergesi | Kesin sulama ihtiyacı |
| BSI | Çıplak yüzey göstergesi | Kesin taşlılık |

---

## Confidence

Presentation summary (yeni keyfi puan sistemi değil):

- `level`: low | medium | high
- `availableSources` / `missingSources`
- `approvedFieldSurveyAvailable`
- `laboratoryAnalysisAvailable` (şu an false)
- `irrigationWaterAnalysisAvailable` (şu an false)

---

## Limitations (örnekler)

- `laboratory_soil_analysis_missing`
- `irrigation_water_analysis_missing`
- `field_survey_missing`
- `soilgrids_is_estimated` / `soil_data_unavailable`
- `nasa_power_is_regional` / `climate_data_unavailable`
- `sentinel_imagery_not_available`
- `report_generation_missing`

---

## Error Codes

Tüm hatalar:

```json
{
  "error": {
    "code": "PARCEL_NOT_FOUND",
    "message": "Belirtilen ada/parsel bulunamadı.",
    "correlationId": "...",
    "retryable": false
  }
}
```

| Code | HTTP | Retryable |
|------|------|-----------|
| PARCEL_NOT_FOUND | 404 | false |
| PARCEL_PROVIDER_UNAVAILABLE | 503 | true |
| PARCEL_GEOMETRY_INVALID | 422 | false |
| ANALYSIS_NOT_FOUND | 404 | false |
| ANALYSIS_ALREADY_PROCESSING | 409 | false |
| ANALYSIS_INSUFFICIENT_DATA | 422 | false |
| PROVIDER_TIMEOUT | 504 | true |
| PROVIDER_UNAVAILABLE | 503 | true |
| PROVIDER_RESPONSE_INVALID | 502 | true |
| SENTINEL_AUTH_FAILED | 503 | true |
| SENTINEL_NO_USABLE_OBSERVATION | 422 | false |
| SENTINEL_IMAGE_INVALID | 502 | true |
| DEM_COVERAGE_INSUFFICIENT | 422 | false |
| SOIL_DATA_UNAVAILABLE | 503 | true |
| CLIMATE_DATA_UNAVAILABLE | 503 | true |
| FIELD_SURVEY_NOT_APPROVED | 422 | false |
| GOLDEN_DATASET_NOT_READY | 503 | false |
| DATABASE_UNAVAILABLE | 503 | true |
| INTERNAL_ERROR | 500 | false |

Raw SQL, provider URL, token veya stack trace response'a sızmaz.

---

## Modes

`ANALYSIS_DATA_MODE=live|golden`

- **live:** gerçek provider çağrıları
- **golden:** `fixtures/golden/gungurge-108-7/` önceden yakalanmış veri

Frontend aynı contract'ı kullanır; mode farkı için ayrı kod yazılmaz.

---

## Report

`report_generation = missing` — PDF motoru bu turda yok. `reportAvailable` false kabul edilmeli.
