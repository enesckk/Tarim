# Render production deployment

The repository root `render.yaml` creates the complete backend in Frankfurt:

- public `tarim-api` web service;
- private `tarim-ai` and Microsoft SQL Server services;
- managed PostgreSQL and Render Key Value;
- persistent disks for SQL Server, API uploads, and AI-generated files.

## Blueprint values

Render asks for these values while creating the Blueprint:

1. `tarim-sqlserver / MSSQL_SA_PASSWORD`: at least 16 characters with uppercase,
   lowercase, number, and symbol.
2. `tarim-api / ConnectionStrings__DefaultConnection`: use the same password:
   `Server=tarim-sqlserver,1433;Database=AgricultureDb;User Id=sa;Password=YOUR_PASSWORD;TrustServerCertificate=True;MultipleActiveResultSets=true`
3. `tarim-ai / AMS_INTEGRATION_API_KEY`: a random secret of at least 64 characters.
   It is copied securely into the API service by the Blueprint.
4. `tarim-api / Jwt__Secret`: a different random secret of at least 64 characters.
5. `tarim-api / BootstrapAdmin__Email`: the real administrator email.
6. `tarim-api / BootstrapAdmin__Password`: a unique password of at least 14 characters.
7. `tarim-api / WebPush__Subject`: for example `mailto:you@example.com`.
8. `tarim-api / WebPush__PublicKey` and `WebPush__PrivateKey`: the existing VAPID pair.

Never commit those values. The first API and AI starts apply their idempotent database
migrations. After a successful first deployment, set both
`Database__ApplyMigrationsOnStartup` and `DATABASE_AUTO_MIGRATE` to `false` in Render.

## Connect Vercel

After `tarim-api` is live, add this Production environment variable to the Vercel
project and redeploy the frontend:

`VITE_API_URL=https://YOUR-TARIM-API.onrender.com`

Do not set `VITE_TARIM_AI_URL`; authenticated AI traffic is routed through the API to
the private AI service. Confirm `/health/live`, `/health/ready`, login, an image upload,
and one AI analysis before inviting users.
