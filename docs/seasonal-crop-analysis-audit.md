# Gaziantep Sezonluk Ürün Fiziksel Uygunluk Analiz Sistemi — Mevcut Durum Audit (V1)

**Durum:** Sadece analiz — production kod değişikliği yok.  
**Tarih:** 2026-07-30  
**Kapsam:** `tarim_ai` analiz motoru + AMS (Tarım) tüketim yüzeyi  
**Hedef ürün vizyonu:** Gaziantep sezonluk ürünler için fiziksel arazi uygunluğu (ekonomik / reçete / sulama planı hariç)

---

## 1. Yönetici özeti

Mevcut sistem, parsel bazlı **çok katmanlı fiziksel uygunluk** üretmek için yeterli altyapıya sahiptir: TKGM parsel, Sentinel-2 (NDVI/NDMI/BSI + zaman serisi), NASA POWER iklim, SoilGrids toprak, Copernicus DEM arazi, land usability, crop recommendation, crop physical compatibility, orchestrator, cache, observability.

Ancak bugünkü ürün çıktısı **V1 sezonluk hedefle uyumlu değildir**:

| Konu | Mevcut durum | V1 hedefi |
|------|--------------|-----------|
| Ürün seti | 14 ürün; içinde Antep fıstığı, zeytin, üzüm (çok yıllık) | Yalnızca sezonluk 16 ürün |
| Eksik sezonluk | Patates, soğan, sarımsak, kavun, karpuz yok | Katalogda olmalı |
| Skor bileşenleri | İklim 35 + toprak 40 + uydu 15 + güvenilirlik 10 | İklim / toprak / arazi / uydu / sulama / saha / veri güveni ayrı |
| Arazi (DEM) skoru | Land usability ayrı; crop skoruna doğrudan eklenmez | Ürün skorunda arazi boyutu |
| Fiziksel uyumluluk | Hesaplanır ama **skor/rank etkilemez** (kalibrasyon notu) | Skoru ve riski etkilemeli |
| UI ilk ekran | Top-5 + genel land usability | En uygun ürün + sıralama + puan; tıklayınca detay |
| Ekonomik çıktı | Yok (doğru) | Yok kalmalı |

**Sonuç:** V1 için “sıfırdan yazmak” gerekmez. Gerekli olan; **katalog filtresi + sezonluk bilgi modelleri + skor boyutlarının yeniden düzenlenmesi + UI sözleşmesi**. Mevcut provider / orchestrator / ops katmanı korunmalıdır.

---

## 2. Mevcut mimari

### 2.1 Servis sınırları

| Sistem | Rol | Konum |
|--------|-----|--------|
| **tarim_ai** | Analiz motoru (Express, :4000) | `/Users/enescikcik/tarim_ai` |
| **Agriculture.Api (AMS)** | Arazi / kullanıcı / bildirim / entegrasyon | `/Users/enescikcik/Desktop/Tarım/src/Hosts/Agriculture.Api` |
| **Admin frontend** | Tarım AI sayfası, arazi detay, raporlar | `/Users/enescikcik/Desktop/Tarım/frontend` |
| **Mobile** | Üretici uygulaması | `/Users/enescikcik/Desktop/Tarım/mobile` |

### 2.2 tarim_ai modül haritası (korunacak)

```
src/modules/
  parcel/                         # TKGM / verified / mock parsel
  satellite/                      # NDVI, NDMI, BSI, surface analysis, time series
  environment/climate/            # NASA POWER (+ mock/fallback)
  environment/soil/               # SoilGrids (+ mock/fallback)
  terrain/                        # Copernicus DEM
  field-survey/                   # Saha gözlemi
  land-usability/                 # Parsel fiziksel kullanılabilirlik (ürün bağımsız)
  crop-recommendation/            # Ürün skorlama + sıralama (ana motor)
  crop-physical-compatibility/    # Derinlik / eğim / taşlılık / mekanizasyon
  analysis-orchestrator/          # Tek pipeline + PDF + land cache
  calibration-management/         # Kalibrasyon profili
  database/                       # PostgreSQL opsiyonel
  operations/                     # Correlation, idempotency, metrics, logging
  drone-imagery/                  # Drone görüntüleri
  fao-external/                   # GAEZ / EcoCrop yardımcı (harici)
```

**Wiring:** `src/app.ts` → `createAnalysisOrchestratorModule(...)` tüm provider servislerini orkestratöre enjekte eder.

### 2.3 Analiz orkestrasyon akışı

`AnalysisOrchestratorService.runAnalysis` adımları (özet):

1. Parcel resolve (TKGM)
2. Satellite observation + layers
3. Terrain (DEM)
4. Climate (NASA POWER)
5. Soil (SoilGrids)
6. Field survey (varsa)
7. Surface analysis
8. Land usability
9. Crop physical compatibility (opsiyonel adım)
10. Crop recommendations (`CropRecommendationService.evaluate`, `topN: 5`)
11. PDF rapor + **land analysis cache** (`storage/land-analyses/`)

Kanıt: `src/modules/analysis-orchestrator/services/analysis-orchestrator.service.ts` (recommendations bloğu ~1162–1232).

### 2.4 AMS tüketimi

- Admin: `TarimAiPage`, `LandDetailPage` (arazi analizi özeti), `ReportsPage` (analiz + drone)
- Entegrasyon: `POST/GET /api/integrations/tarim-ai/*` (haftalık analiz / bildirim)
- Analiz sonuçları AMS DB’de tutulmaz; **tarim_ai dosya önbelleği** kaynak gerçektir

---

## 3. Mevcut analiz motoru

### 3.1 İki katmanlı “uygunluk” kavramı

| Katman | Ne yapar | Ürün skorunu etkiler mi? |
|--------|----------|---------------------------|
| **Land usability** | Parselin tarıma elverişliliği (kaya, derinlik, eğim, yüzey) | Hayır — ayrı blok |
| **Crop recommendation** | Her ürün için iklim+toprak+uydu+güvenilirlik skoru | Evet — ana sıralama |
| **Crop physical compatibility** | Derinlik, eğim, taşlılık, mekanizasyon | **Hayır** (v1.7 kalibrasyon notu: skor/rank etkilemez; yalnızca annotate) |

Bu ayrım V1 vizyonundaki “her ürün için iklim / toprak / arazi / uydu / sulama / saha / güven” birleşik modelinden **farklıdır**.

### 3.2 Crop suitability hesaplama

`CropSuitabilityService.evaluate`:

```
gross = climate + soil + sentinel + reliability
final = clamp(gross − constraintPenalty)
classification = calibrate(final)
```

Dosya: `crop-recommendation/services/crop-suitability.service.ts`

### 3.3 Ağırlıklar (toplam 100)

Kaynak: `crop-recommendation/rules/scoring-weights.ts` + `knowledge/calibration/default-calibration.json`

| Kategori | Ağırlık | Alt faktörler |
|----------|---------|----------------|
| **İklim** | 35 | sezon sıcaklığı 10, yağış 8, don 5, aşırı sıcak 4, kuraklık 4, sulama uyumu 4 |
| **Toprak** | 40 | pH 10, tekstür 7, drenaj 6, tuzluluk 5, OM 4, derinlik 4, WHC 2, CaCO₃ 2 |
| **Uydu (Sentinel)** | 15 | alım kalitesi 4, vejetasyon 3, nem 3, zamansal tutarlılık 3, çıplak toprak 2 |
| **Güvenilirlik** | 10 | veri kalitesi / mock cezası |

**Eksik boyutlar (V1’e göre):**

- Arazi (rakım / eğim / bakı / erozyon) **ürün skorunda yok** (DEM land usability / physical compat’te)
- Sulama (durum, su EC, SAR) **kısmi** — yalnızca iklim “irrigationCompatibility” senaryosu
- Saha gözlemi **ürün skorunda yok** (field-survey land usability’ye besler)
- Growing Degree Days ayrı skor kalemi olarak yok (phenology sıcaklık/yağış ağırlıkları var)

### 3.4 Kısıt cezaları

`CONSTRAINT_PENALTIES`: critical 25, major 12, moderate 5  
Hard constraint’ler `hardConstraints` + `ConstraintEvaluationService` ile uygulanır.

### 3.5 Sınıflandırma eşikleri

| Skor | Sınıf |
|------|--------|
| ≥ 85 | very_high |
| ≥ 70 | high |
| ≥ 55 | moderate |
| ≥ 40 | low |
| < 40 | very_low |

≤ 40 → “not recommended” aday havuzu (`NOT_RECOMMENDED_SCORE_THRESHOLD`).

### 3.6 Phenology

`CropPhenologyService` aylık NASA POWER climatology varsa sıcaklık / yağış / don / sıcak stresi **büyüme evrelerine** göre ağırlıklandırır. Aylık veri yoksa yıllık/sezon özet aralık skorlamasına düşer.

### 3.7 Land usability (ürün bağımsız)

`PhysicalSuitabilityService` kural motoru: hard constraint → insufficient data → field verification → preliminary suitable → caution kuralları.  
Çıktı: `classification`, `score` (ör. 40/55/70), limiting/positive factors.  
Bu skor **ürün sıralamasını değiştirmez**; parsel genel uygunluğudur.

### 3.8 Crop physical compatibility

`CropPhysicalCompatibilityEngine` bileşenleri: rootable depth, slope, ruggedness, mechanization, stoniness, bedrock, drainage.  
Kalibrasyon notu (default-calibration.json):

> “Crop physical compatibility eşikleri unvalidated başlangıç kurallarıdır; **skor/rank etkilemez**.”

V1 için bu, kritik bir boşluktur: “arazi” boyutu ürün skoruna bağlanmalıdır.

---

## 4. Mevcut veri modeli

### 4.1 Crop knowledge (JSON)

Konum: `tarim_ai/src/modules/crop-recommendation/knowledge/crops/*.json`

Şema alanları (ör. `wheat.json`):  
`id`, `name`, `scientificName`, `category`, `growingType`, `climate`, `soil`, `remoteSensing`, `management`, `hardConstraints`, `sourceMetadata`, `phenology`, `physicalRequirements`

`category` değerleri: `field_crop` | `vegetable` | `perennial`

### 4.2 Mevcut katalog (14 ürün)

| id | Ad | category | V1 sezonluk? |
|----|-----|----------|--------------|
| wheat | Buğday | field_crop | ✅ |
| barley | Arpa | field_crop | ✅ |
| corn | Mısır | field_crop | ✅ |
| cotton | Pamuk | field_crop | ✅ |
| sunflower | Ayçiçeği | field_crop | ✅ |
| chickpea | Nohut | field_crop | ✅ |
| lentil | Mercimek | field_crop | ⚠️ “Kırmızı Mercimek” ayrımı yok |
| tomato | Domates | vegetable | ✅ |
| pepper | Biber | vegetable | ✅ |
| eggplant | Patlıcan | vegetable | ✅ |
| cucumber | Salatalık | vegetable | ✅ |
| pistachio | Antep fıstığı | perennial | ❌ V1 dışı (bahçe sistemi) |
| olive | Zeytin | perennial | ❌ |
| grape | Üzüm | perennial | ❌ |

### 4.3 V1 pilot listesinde eksikler

| Hedef ürün | Durum |
|------------|--------|
| Patates | ❌ knowledge yok |
| Soğan | ❌ |
| Sarımsak | ❌ |
| Kavun | ❌ |
| Karpuz | ❌ |
| Kırmızı Mercimek | ⚠️ sadece genel `lentil` |

Bahçe (ayrı proje): Ceviz, Badem, Nar, Kayısı — katalogda da yok (doğru).

### 4.4 Analysis result (orchestrator)

`AnalysisResultResponse` özet alanları:

- `parcel`, `dataSources[]`
- `satellite` (NDVI/NDMI/BSI stats + time series)
- `terrain`, `climate`, `soil`, `fieldSurvey`
- `landUsability` { classification, score, limitingFactors, positiveFactors, explanation }
- `cropRecommendations[]` { cropId, cropName, rank, score, classification, isTopFive, factors, explanation }
- `confidence`, `limitations[]`, `recommendedNextActions[]`
- `recommendationsArePreliminary: true` (her zaman)
- `generatedAt`

Önbellek: `storage/land-analyses/land_{landId}.json` + `parcel_*.json` (tam `result` + summary).

### 4.5 Provider veri gerçekliği (Gaziantep sahası)

| Katman | Tipik kaynak | Ölçülen mü? | V1 etkisi |
|--------|--------------|-------------|-----------|
| Parsel | TKGM | Resmi | Geometri güvenilir |
| İklim | NASA POWER | Tahmini (grid) | Don/sıcak/yağış bölgesel |
| Toprak | SoilGrids | Tahmini (250 m) | pH/OM var; EC/kireç/tekstür çoğu zaman zayıf/eksik |
| DEM | Copernicus 30 m | Tahmini | Eğim/rakım/bakı |
| Uydu | Sentinel-2 | Ölçülen yansıma | NDVI/NDMI/BSI |
| Lab / sulama suyu | — | Genelde **missing** | Güven orta/düşük |
| Saha | field-survey | Opsiyonel | Çoğu analizde yok |

Bu yüzden mevcut çıktılar zaten `recommendationsArePreliminary` ve “saha + lab doğrulaması gerekir” next-action üretir — V1 ile uyumlu bir dürüstlük sinyali.

---

## 5. Ürün sıralama algoritması

### 5.1 Adımlar

1. `cropKnowledgeService.listAll()` → **tüm** knowledge dosyaları (perennial dahil)
2. Her ürün için `suitabilityService.evaluate`
3. `sort((a,b) => b.score.final - a.score.final || id)`
4. `slice(0, topN)` — orchestrator’da **topN = 5**
5. `selectCropsForReport` ile rank etiketleme (`isTopFive`)
6. Physical compatibility summary **eklenir**, skor değiştirilmez

Kanıt: `crop-recommendation.service.ts` ~200–336; orchestrator `topN: 5`.

### 5.2 Gözlenen pratik sonuç (Gaziantep demo önbelleği)

Çok yıllık **Antep fıstığı** sıkça rank #1 çıkıyor; sezonluk V1 hedefiyle çelişir.  
Sebze/bostan seti katalog eksikliği nedeniyle sıralamada temsil edilmiyor.

### 5.3 Risk / güçlü-zayıf yönler

`RecommendationExplanationService` strengths / risks / requiredVerifications üretir (max 4’er).  
Orchestrator DTO’suna `positiveFactors` / `limitingFactors` / `explanation` map edilir; UI’da kısmen gösterilir.

---

## 6. Altyapı — korunacaklar (dokunulmayacak çekirdek)

Aşağıdakiler V1’de **kaldırılmamalı / bozulmamalı**:

- Parcel (TKGM + fallback)
- Sentinel pipeline (tek görüntü + time series + surface)
- NASA POWER, SoilGrids, DEM
- NDVI / NDMI / BSI statistics, trend, surface analysis
- Land usability motoru
- Analysis orchestrator + step machine
- Land analysis file cache
- PostgreSQL opsiyonel persistence
- Operations: structured logging, correlation id, idempotency, metrics, replay
- Calibration profile altyapısı
- Drone imagery (saha kanıtı için tamamlayıcı)
- AMS land bağlama (`landId`) + bildirim entegrasyonu

V1 değişikliği bu çekirdeğin **üstünde** (katalog + skor boyutları + API/UI sözleşmesi) olmalıdır.

---

## 7. Geliştirilmesi gereken alanlar (gap analizi)

### 7.1 Ürün kapsamı (P0)

1. Perennial’leri V1 evaluate setinden çıkar (`category !== 'perennial'` veya allowlist).
2. Eksik sezonluk knowledge JSON’ları ekle: potato, onion, garlic, melon, watermelon.
3. `lentil` → kırmızı mercimek profili netleştir (veya `red_lentil` ayrı id).
4. Category ayrımı: `field_crop` / `vegetable` / `melon_crop` (bostan) — raporlama için.

### 7.2 Skor modeli (P0)

Hedef boyutlar ve mevcut karşılık:

| V1 boyut | Mevcut | Aksiyon |
|----------|--------|---------|
| İklim | Var (35) | GDD, kurak dönem, min/max günlerini açık faktör yap |
| Toprak | Var (40) | EC, kum/kil/silt, kireç — SoilGrids boşluklarını “eksik veri” olarak skorla |
| Arazi | Land usability / physical compat ayrı | Ürün skoruna DEM+uyumluluk boyutu ekle |
| Uydu | Var (15) | Homojenlik + zamansal değişim faktörlerini netleştir |
| Sulama | Zayıf (senaryo) | Sulama durumu / su kalitesi (EC, SAR) — yoksa unknown penalty |
| Saha | Yok (ürün skorunda) | Field survey varsa ağırlık; yoksa eksik veri |
| Veri güveni | Reliability 10 | Boyut skorlarından ayrı “confidence” çıktısı güçlendir |

### 7.3 Çıktı sözleşmesi (P0)

Her ürün için V1’in istediği:

- Fiziksel uygunluk skoru
- Risk seviyesi
- Güçlü yönler / zayıf yönler
- Eksik veriler

Mevcut `CropRecommendationItem` + explanation buna yakın; orchestrator DTO’sunu genişletmek yeterli olabilir.  
**İlk ekran:** en uygun ürün + tam sıralama (yalnızca top-5 değil; sezonluk setin tamamı veya top-N≥16).

### 7.4 UI / ürün akışı (P1)

1. Parsel seç  
2. Sezonluk seti analiz et  
3. Sıralı liste + en uygun  
4. Ürün detay sayfası (boyut kırılımları)

Admin `TarimAiPage` bugün genel analiz + top crops gösterir; sezonluk-özel ilk ekran yok.

### 7.5 Kalibrasyon & doğrulama (P1)

- Gaziantep Şehitkamil parselleri ile fixture seti
- Hasat / üretici geri bildirimi için skor–gerçek karşılaştırma hattı (V1 amacı)
- Physical compatibility’nin skor etkisi **açıkça versioned** olmalı (`SCORING_MODEL_VERSION`)

### 7.6 Bilinçli olarak yapılmayacaklar (V1 dışı)

- Ekonomik analiz, kâr, fiyat, pazar
- Gübre / ilaç reçetesi
- Detaylı sulama planı (yalnızca sulama uygunluk sinyali)
- Bahçe tesisi (Antep fıstığı vb.)

---

## 8. Yeni mimariye geçiş planı (kod yazmadan yol haritası)

### Faz 0 — Sözleşme (1 sprint)

- Sezonluk ürün allowlist + API flag: `cropSet=seasonal_gaziantep_v1`
- Response şeması: `bestCrop`, `rankedCrops[]`, `dimensions[]`, `missingData[]`, `riskLevel`
- Mevcut `/api/analyses` geriye uyumlu kalsın; yeni alanlar additive

### Faz 1 — Katalog (1 sprint)

- Perennial’leri seasonal evaluate’den filtrele
- 5 eksik ürün knowledge dosyası + phenology/physicalRequirements
- Kırmızı mercimek netleştirme

### Faz 2 — Skor v2 (1–2 sprint)

- Boyut skorları: climate / soil / terrain / satellite / irrigation / field / confidence
- Physical compatibility’yi terrain boyutuna bağla (skor etkiler)
- Land usability’yi “parsel bağlamı” olarak tut; ürün skorundan ayrı göster
- Kalibrasyon profili `scoringModelVersion: seasonal-v1`

### Faz 3 — Orchestrator & cache (0.5–1 sprint)

- Recommendations adımında seasonal set
- Cache summary’ye `bestCrop`, `cropSet`, `analysisDate` ekle
- PDF bölüm sırası: kaynaklar → öneriler → detaylar (rapor UI ile aynı)

### Faz 4 — UI (1 sprint)

- İlk sonuç: en uygun + sıralama + puan
- Ürün detay drawer/page: 7 boyut kırılımı + risk + eksikler
- AMS arazi detay / raporlar bu sözleşmeyi tüketsin

### Faz 5 — Saha doğrulama döngüsü (sürekli)

- Demo parsellerde haftalık analiz (mevcut scheduler)
- Hasat kaydı (AMS harvest) ile skor karşılaştırması
- Kalibrasyon güncellemesi (calibration-management)

**Risk kontrolü:** Her fazda mevcut full-catalog endpoint’leri bozmamak için feature flag / ayrı `cropSet` kullan.

---

## 9. Mimari öneri (hedef mantık — henüz kod değil)

```
Parsel
  → Providers (korunur)
  → ParcelContext (land usability + data quality)
  → SeasonalCropSet (allowlist)
  → For each crop:
        DimensionScores { climate, soil, terrain, satellite, irrigation, field, confidence }
        → PhysicalSuitabilityScore
        → RiskLevel + Strengths/Weaknesses + MissingData
  → Rank by score (tie-break: risk, then confidence)
  → UI: Best + Full ranking + Detail
```

Mevcut `CropSuitabilityService` + `CropPhysicalCompatibilityEngine` bu hedefe **evrilerek** gitmeli; paralel ikinci motor yazmak önerilmez.

---

## 10. Sonuç ve durma noktası

### Bulgular

1. Altyapı V1 için yeterli ve korunmalı.  
2. Katalog perennial içeriyor; sezonluk set eksik.  
3. Skor ağırlıkları iklim/toprak/uydu ağırlıklı; arazi/saha/sulama ürün skoruna tam entegre değil.  
4. Physical compatibility skor/rank’i değiştirmiyor — V1 için düzeltilmeli.  
5. Orchestrator top-5 kesiyor; V1 tam sezonluk sıralama ister.  
6. Ekonomik çıktı yok — hedefle uyumlu.

### Bu audit sonrası

- **Kod yazılmadı.**  
- Sonraki adım: ürün sahibi onayıyla Faz 0 (API/cropSet sözleşmesi) tasarımına geçilebilir.  
- Production implementasyon bu dokümanın onayından sonra başlamalıdır.

---

## 11. Referans dosyalar

| Konu | Yol |
|------|-----|
| Orchestrator | `tarim_ai/src/modules/analysis-orchestrator/services/analysis-orchestrator.service.ts` |
| Recommendation | `tarim_ai/src/modules/crop-recommendation/services/crop-recommendation.service.ts` |
| Suitability | `tarim_ai/src/modules/crop-recommendation/services/crop-suitability.service.ts` |
| Weights | `tarim_ai/src/modules/crop-recommendation/rules/scoring-weights.ts` |
| Thresholds | `tarim_ai/src/modules/crop-recommendation/rules/scoring-thresholds.ts` |
| Calibration | `tarim_ai/src/modules/crop-recommendation/knowledge/calibration/default-calibration.json` |
| Crop JSON | `tarim_ai/src/modules/crop-recommendation/knowledge/crops/` |
| Physical compat | `tarim_ai/src/modules/crop-physical-compatibility/` |
| Land usability | `tarim_ai/src/modules/land-usability/` |
| API contract | `tarim_ai/docs/analysis-api-contract.md` |
| App wiring | `tarim_ai/src/app.ts` |

---

*Audit tamamlandı. Production koduna geçilmedi.*
