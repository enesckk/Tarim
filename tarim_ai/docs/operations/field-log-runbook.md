# Field Log Runbook

Bu runbook, sistem yöneticileri (Admin) ve DevOps ekipleri için Field Log (Tarla Günlüğü) modülündeki yaygın sorunların çözümlerini içerir.

## 1. Export Sorunları
**Sorun**: `/api/field-logs/export?format=csv` çağrıldığında 500 hatası dönüyor veya dosya çok büyük.
**Çözüm**: Geri dönen log miktarını sınırlandırmak için `dateFrom` ve `dateTo` query parametrelerini kullanın. 

## 2. Idempotency Çakışmaları
**Sorun**: İstemci geçerli bir işlem yapmaya çalışıyor ancak 409 IDEMPOTENCY_KEY_REUSED hatası alıyor.
**Sebep**: Aynı Idempotency Key, farklı bir payload ile gönderilmiştir.
**Çözüm**: Frontend'de yeni bir işlem için mutlaka yeni bir key (`uuidv4()`) üretildiğinden emin olun. Cache'te takılı kalmış bir key olup olmadığını kontrol edin.

## 3. Storage Yetkilendirme
**Sorun**: Evidence dosyaları (resimler) yüklenirken izin hatası veya storage path'in dışarı sızması uyarısı.
**Çözüm**: Client'lara doğrudan internal storage URL'leri dönülmez. Güvenli erişim için geçici presigned URL mekanizmasını (eğer kullanımdaysa) kontrol edin veya `sanitizeEvidenceForClient` metodunun çalıştığından emin olun.

## 4. Migration Kontrolü
Veritabanının durumunu görmek için PostgreSQL konsolundan şu komutu çalıştırın:
```sql
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'fld_log_%';
```
13 adet tablo dönmelidir. Aksi takdirde `npm run db:migrate` işlemini `DATABASE_ENABLED=true` env bayrağıyla tekrar çalıştırın.
