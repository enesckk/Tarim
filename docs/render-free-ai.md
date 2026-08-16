# Render free AI service

Create a second **Web Service** from the same repository. This service runs the
AI analysis engine; the existing `tarim-api` service cannot run it by itself.

## AI service settings

- Runtime: Docker
- Dockerfile path: `tarim_ai/Dockerfile`
- Docker build context: `tarim_ai`
- Health check path: `/health`
- Instance type: Free

Set these environment variables:

```text
NODE_ENV=production
ANALYSIS_DATA_MODE=live
PARCEL_PROVIDER=fallback
PARCEL_PROVIDER_ORDER=tkgm,verified_geojson
CLIMATE_PROVIDER=nasa-power
SOIL_PROVIDER=soilgrids
TERRAIN_PROVIDER=fallback
TERRAIN_DEM_ENABLED=false
DATABASE_ENABLED=false
PERSISTENCE_PROVIDER=in-memory
DATABASE_AUTO_MIGRATE=false
WEEKLY_ANALYSIS_ENABLED=false
AMS_INTEGRATION_API_KEY=<64+ character random secret>
```

NASA POWER and SoilGrids do not need API keys. The verified GeoJSON parcel
fallback is bundled into the image. TKGM is tried first and the verified data is
used if TKGM blocks the server request.

Copernicus satellite imagery and Copernicus DEM require a CDSE account. After
creating credentials, add `COPERNICUS_CLIENT_ID` and
`COPERNICUS_CLIENT_SECRET`; then set `TERRAIN_PROVIDER=copernicus-dem` and
`TERRAIN_DEM_ENABLED=true` only if the account has DEM Process API access.

## Existing API service settings

Copy the AI service's public `https://...onrender.com` URL and add/update:

```text
TarimAi__BaseUrl=https://<ai-service>.onrender.com
TarimAi__IntegrationApiKey=<the exact same 64+ character secret>
```

Redeploy the API after saving these values. The browser talks only to the
authenticated .NET API proxy; the AI service rejects direct `/api` calls.
