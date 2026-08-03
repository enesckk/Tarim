# FAO ECOCROP + GAEZ Discovery & API Audit

**Date:** 2026-07-30  
**Scope:** Official FAO surfaces only (no unofficial scrapers).  
**Design rule:** ECOCROP = knowledge-base seed layer; GAEZ = regional validation layer. Neither is a hard live dependency during parcel analysis.

## 1. ECOCROP

| Item | Finding |
|------|---------|
| Official portals | https://gaez.fao.org/pages/ecocrop · https://ecocrop.apps.fao.org/ecocrop/srv/en/home · https://ecocrop.review.fao.org |
| Search | HTML `cropSearchForm` / Find plant UI |
| Crop detail | HTML `dataSheet?id={ecocropId}` |
| Programmatic JSON API | **Not available.** `crop.json` returns HTML. Some review hosts require IAP tokens. |
| Status | Developed 1990s; discontinued ~2015; re-exposed via GAEZ tooling |
| Content | 2000+ species; temp/precip/pH/light/soil/Köppen/photoperiod/altitude ranges |
| Rate limits | Not published (HTML app) |
| Runtime decision | **Never fetch during analysis.** Import from versioned snapshots only; profiles start as `draft`. |

## 2. GAEZ v4

| Item | Finding |
|------|---------|
| Search API | OGC API – Records at `https://gaez.fao.org/api/search/v1` (collections: document, dataset, appAndMap, all). Spec UI: `/api/search/definition/` |
| ImageServer | `https://gaez-services.fao.org/server/rest/services` → LR, res01, res02, res05, res06, res07 |
| Catalog fields (res05) | `crop`, `water_supply`, `input_level`, `variable`, `units`, `year`, `model`, `rcp`, `filepath`, `download_url`, `file_id`, … |
| Sampling | `getSamples` (point), `identify`, mosaic `where` filters |
| Spatial resolution | `pixelSize ≈ 0.083333°` (~5 arc-minutes) — **regional, not parcel-scale** |
| Units (examples) | `Class`, `kg DW/ha`, `mm` |
| Water supply (observed) | Rainfed, Irrigation, Sprinkler Irrigation, … |
| Input levels (observed) | High, Intermediate, Low (layer-dependent) |
| Climate / RCP | Present on some themes via `model` / `rcp` / `year` |
| Caps | `maxRecordCount` ≈ 1000 → sync must paginate |
| Rate limits | No public quota doc; use cache + polite retries |

## 3. GAEZ v5 (do not mix with v4)

| Item | Finding |
|------|---------|
| Launch | April 2025; baseline 2020; CMIP6 SSPs; HWSD v2 |
| Access | Platform + Google Cloud Storage `gs://fao-gismgr-gaez-v5-data/` · STAC / ISO 19115 |
| Docs | https://github.com/un-fao/gaezv5/wiki |
| Code rule | `gaezVersion: 'v4' \| 'v5'` required on every GAEZ artifact |

## 4. Pilot crop GAEZ v4 availability (res05 suitability class layers)

Present: Wheat, Barley, Chickpea, Maize, Cotton, Tomato, Olive.  
**Absent (no fabricated mapping):** Grape, Lentil / red lentil, Pistachio.

## 5. Architecture

1. **ECOCROP import** → versioned snapshot → `EcocropProfileSource` (`draft|reviewed|approved|rejected`) → optional later promotion into Crop Knowledge Base (never auto-approve).  
2. **GAEZ catalog sync** → local DB (`GaezDataset`, layers) via `npm run gaez:catalog:sync`.  
3. **Regional sample** → cache-first provider → `GaezRegionalSample` with `regional_resolution_not_parcel_scale` when parcel ≪ cell.  
4. **Comparison** → `GaezComparisonResult` parallel to local score; **does not mutate** local compatibility/recommendation scores.
