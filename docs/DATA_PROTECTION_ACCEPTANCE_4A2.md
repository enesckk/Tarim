# 4A-2 Veri koruma kabulü

**Tarih:** 13 Ağustos 2026

**Durum:** Geçti
**Kapsam:** Agriculture SQL Server + Tarım AI PostgreSQL + MinIO özel bucket

## Uygulanan çözüm

- `scripts/test-staging-backup-restore.ps1` eşlenmiş bir veri koruma paketi oluşturur.
- SQL Server yedeği `COPY_ONLY`, `CHECKSUM` ve `COMPRESSION` ile alınır.
- SQL yedeği `RESTORE VERIFYONLY ... WITH CHECKSUM` ile doğrulanır, ayrı geçici veritabanına restore edilir ve `DBCC CHECKDB` çalıştırılır.
- Tarım AI PostgreSQL verisi custom-format `pg_dump` ile alınır, `pg_restore --list` ile okunabilirliği doğrulanır ve ayrı geçici veritabanına restore edilir.
- MinIO özel bucket’ı `mc mirror` ile aynı artifact paketine alınır, temiz geçici MinIO container’ına restore edilir ve rastgele canary nesnesinin SHA-256 değeri karşılaştırılır.
- Manifest SQL ve PostgreSQL artifact hash’lerini, restore sonuçlarını, tablo/nesne sayılarını ve MinIO canary hash’ini kaydeder.
- Script geçici SQL/PostgreSQL veritabanlarını, container içi dump dosyalarını, restore container’ını ve kaynak bucket canary’sini temizler.
- Artifact’ler Git tarafından yok sayılan `backups/staging/<UTC-damga>/` altında kalır.

## Nihai tatbikat sonucu

| Kontrol | Sonuç |
|---|---|
| SQL checksum backup | Geçti |
| SQL `RESTORE VERIFYONLY WITH CHECKSUM` | Geçti |
| SQL izole restore | Geçti |
| SQL `DBCC CHECKDB` | Geçti |
| Restore edilen SQL kullanıcı tablosu | 39 |
| PostgreSQL custom archive/list | Geçti |
| PostgreSQL izole restore | Geçti |
| Restore edilen PostgreSQL kullanıcı tablosu | 128 |
| MinIO izole restore | Geçti |
| MinIO canary SHA-256 | Eşleşti |
| Nihai MinIO restore nesnesi | 1 canary; kaynak bucket tatbikat öncesinde boştu |
| SQL artifact SHA-256 / manifest | Eşleşti |
| PostgreSQL artifact SHA-256 / manifest | Eşleşti |
| Geçici SQL veritabanı | 0 |
| Geçici PostgreSQL veritabanı | 0 |
| Geçici MinIO container | 0 |
| Kaynak bucket canary kalıntısı | 0 |
| Docker servisleri | 8/8 çalışıyor; health tanımlı servisler sağlıklı |

Nihai doğrulanmış paket: `backups/staging/20260813-124008/manifest.json`.

## Aşama sınırı

4A-2 tamamlandı. Redis yalnız cache/SignalR backplane olarak kullanıldığı ve otoritatif veri saklamadığı için restore kapsamına alınmadı. Sonraki çalışma 4A-3 gözlemlenebilirlik, hata izleme ve servis uyarılarıdır.
