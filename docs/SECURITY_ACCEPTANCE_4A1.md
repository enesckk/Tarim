# 4A-1 Güvenlik kabulü

**Tarih:** 13 Ağustos 2026

**Durum:** Geçti
**Ortam:** Docker staging + geçici HTTPS cihaz kabul tüneli

## Uygulanan kontroller

- Staging JWT ve Tarım AI entegrasyon anahtarları 64 bayt kriptografik rastgele değerlerle döndürüldü; iki anahtarın aynı olması production başlangıcında reddediliyor.
- Production başlangıç koruması JWT ve entegrasyon anahtarlarında en az 64 karakter, HTTPS-only tekil CORS originleri, güvenli MinIO kimlik bilgileri ve açık reverse-proxy güven ilişkisi şart koşuyor.
- Reverse proxy başlıkları kontrollü biçimde işleniyor; rate-limit kimliği doğrulanmış kullanıcı veya gerçek istemci IP’sine göre bölümleniyor.
- Staging/Production kimlik doğrulama sınırı 10 istek/dakika; Development test ortamı ayrı yüksek limite sahip.
- Nginx sürümü gizlendi; HSTS, CSP, clickjacking, MIME-sniffing, referrer ve permissions-policy başlıkları tüm yanıt sınıflarında etkinleştirildi.
- `/swagger` staging’de açıkça 404 döndürüyor; veri servisleri host portu yayımlamıyor.
- Tam JWT medya URL’lerinden kaldırıldı. Medya erişimi yalnızca `/api/files` yoluna kapsamlı `Secure; HttpOnly; SameSite=Strict` cookie kullanıyor.
- Logout refresh tokenı sunucuda iptal ediyor ve medya cookie’sini siliyor.
- Bilinen zafiyetli geçişli paketler güvenli sürümlere sabitlendi: MessagePack 2.5.302, Newtonsoft.Json 13.0.4 ve SQLitePCLRaw bundle 2.1.12.
- Uygulama secret’larını değerleri ekrana yazdırmadan yenileyen `scripts/rotate-staging-app-secrets.ps1` eklendi.

## Doğrulama kanıtı

| Kontrol | Sonuç |
|---|---|
| API integration testleri | 11/11 geçti |
| Frontend lint | Hata yok; yalnız önceden var olan uyarılar |
| Frontend production/PWA build | Geçti; 99 precache girdisi |
| Nginx yapılandırması | `nginx -t` geçti |
| Frontend production bağımlılık taraması | Bilinen zafiyet yok |
| .NET doğrudan + geçişli bağımlılık taraması | Bilinen zafiyet yok |
| Git tarafından izlenen gerçek `.env`/anahtar dosyası | Yok |
| HTTPS güvenlik başlıkları | 6/6 mevcut |
| Yetkisiz `/api/me` | 401 |
| Kötü CORS origin | Reddedildi |
| Staging Swagger | 404 |
| Auth rate-limit | İlk 10 istek işlendi, 11. istek 429 |
| JWT içeren medya query parametresi | 401 |
| Logout sonrası refresh tekrar kullanımı | 401 |
| Üretici arazi izolasyonu | 1 arazi: Şehitkamil Demo Tarlası |
| Docker servisleri | 8/8 çalışıyor; health tanımlı servisler sağlıklı |

## Aşama sınırı

4A-1 güvenlik kabulü tamamlandı. 3C fiziksel Android/iPhone kabulü gerçek cihaz kanıtı gelene kadar ayrı bir açık yayın kapısıdır. Sonraki çalışma 4A-2 SQL Server ve MinIO yedekleme/geri-yükleme kabulüdür.
