# 4A-3 Gözlemlenebilirlik kabulü

**Tarih:** 14 Ağustos 2026

**Durum:** Geçti
**Ortam:** Docker staging + hosta özel Seq erişimi

## Uygulanan çözüm

- Seq staging Compose yığınına kalıcı veri birimiyle eklendi.
- Seq arayüzü yalnız dağıtım hostundaki `127.0.0.1:5341` adresine yayımlandı; ilk yönetici parolası ignored staging ortam dosyasından zorunlu olarak alınıyor.
- Agriculture API yapılandırılmış uygulama ve HTTP istek loglarını iç ağdaki `http://seq` adresine gönderiyor.
- Seq için gerçek `/health` Docker healthcheck'i tanımlandı; API başlangıcı Seq sağlıklı olana kadar bekliyor.
- `scripts/test-staging-observability.ps1` uzun süreli servislerin running/health durumlarını, restart sayılarını, dış health uçlarını, Seq erişimini ve yakın zamanlı kritik log imzalarını denetliyor.
- Her çalıştırma makinece okunabilir JSON kanıtını ignored `backups/staging-observability/` dizinine yazıyor; ihlalde non-zero exit code üreterek scheduler/monitor uyarısına bağlanabiliyor.
- API container yeniden yaratıldığında Nginx'in eski upstream IP'sini tutmasıyla oluşabilen 502 riski için staging doğrulaması frontend proxy'yi yakınsama sonrasında yeniden başlatıyor.

## Nihai kabul sonucu

| Kontrol | Sonuç |
|---|---|
| Compose yapılandırması | Geçerli |
| Seq container healthcheck | Healthy |
| SQL Server | Running, healthy, restart 0 |
| PostgreSQL | Running, healthy, restart 0 |
| MinIO | Running, healthy, restart 0 |
| Redis | Running, healthy, restart 0 |
| Tarım AI | Running, healthy, restart 0 |
| Agriculture API | Running, healthy, restart 0 |
| Frontend/Nginx | Running, healthy, restart 0 |
| Frontend `/healthz` | HTTP 200 |
| API `/health/live` | HTTP 200 |
| API `/health/ready` | HTTP 200 |
| Tarım AI `/health` | HTTP 200 |
| Seq `/health` | HTTP 200 |
| Son 5 dakika kritik log imzası | 0 |

Nihai doğrulanmış rapor: `backups/staging-observability/20260814-115426.json`.

## Operasyon sınırı

4A-3 tamamlandı. Production kullanımında script beş dakikalık host scheduler/monitor işi olarak çalıştırılmalı ve non-zero exit kurumsal nöbet kanalına bağlanmalıdır. Ayrıca host dışından HTTPS `/health/live` uptime probu kurulmalıdır. 3C fiziksel Android/iPhone kabulü gerçek cihaz kanıtı gelene kadar ayrı açık yayın kapısı olarak kalır.
