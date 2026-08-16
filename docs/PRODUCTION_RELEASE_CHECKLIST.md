# Üretim Yayını Kontrol Listesi

**Son güncelleme:** 16 Ağustos 2026  
**Mevcut durum:** Staging doğrulandı; üretim yayını henüz onaylanmadı.

## Tamamlanan kapılar

- [x] 4A-1 güvenlik kabulü
- [x] 4A-2 SQL Server, PostgreSQL ve MinIO yedek/geri-yükleme kabulü
- [x] 4A-3 gözlemlenebilirlik ve servis sağlık kontrolleri
- [x] Backend entegrasyon testleri
- [x] Tarım AI testleri ve production build
- [x] PWA lint ve production build
- [x] Üretici giriş, görev listesi, görev detayı ve görsel yükleme temel saha kontrolü
- [x] Dar ekranda mesaj kartı taşması ve profil kartı çakışması düzeltmesi
- [x] Production Compose tanımı demo seed kapalı ve yalnız immutable image digest kabul edecek şekilde hazırlandı
- [x] İlk gerçek yönetici için tek-seferlik, demo e-postasını reddeden güvenli bootstrap eklendi
- [x] Tarım AI runtime imajı root olmayan kullanıcıya ve yalnız production bağımlılıklarına geçirildi
- [x] Tarım AI analiz dosyaları kalıcı volume'a alındı
- [x] Frontend ve Tarım AI npm audit sonucu: 0 bilinen zafiyet
- [x] Tarım AI temiz npm kurulumu: 377 geçti, 22 atlandı, 1 todo
- [x] .NET Release build: 0 hata, 0 uyarı; entegrasyon testleri: 11/11 geçti

## Yayını engelleyen kapılar

### 1. Mobil arayüz kabulü

- [ ] 320 px, 360 px, 390 px ve tablet genişliğinde üretici ekranlarını tarama
- [ ] Görevler, sohbet, bildirimler, profil, arazi ve hesap ekranlarında taşma/çakışma olmadığını doğrulama
- [ ] Android PWA kurulumunu ve standalone açılışı doğrulama
- [ ] iPhone Safari “Ana Ekrana Ekle” ve standalone açılışı doğrulama
- [ ] Klavye açıkken sohbet ve form alanlarını doğrulama

### 2. Fiziksel cihaz işlev kabulü

- [ ] Çevrimdışı fotoğraf kuyruğu ve bağlantı gelince otomatik yükleme
- [ ] SignalR canlı bildirimi
- [ ] PWA arka planda ve tamamen kapalıyken Web Push
- [ ] Bildirime dokununca doğru görev/sohbet yönlendirmesi
- [ ] Oturumun yeniden açılışta korunması ve çıkışta temizlenmesi
- [ ] Android sonucu `docs/PWA_DEVICE_ACCEPTANCE.md` içinde kanıtla kapatma
- [ ] iPhone sonucu `docs/PWA_DEVICE_ACCEPTANCE.md` içinde kanıtla kapatma

### 3. Yayın verisi

- [ ] `asdfasdf` gibi sentetik kullanıcı test kayıtlarını hedefli biçimde temizleme
- [ ] Demo kullanıcı/parolalarını üretim verisinden kaldırma
- [ ] İlk gerçek yönetici hesabını güvenli kanaldan oluşturma
- [ ] Gerçek üretici/arazi verisinin KVKK ve yetki kapsamını onaylama

### 4. Üretim altyapısı

- [ ] Kalıcı sunucu/sağlayıcı seçimi
- [ ] Gerçek alan adı ve DNS kaydı
- [ ] Geçerli TLS sertifikası ve otomatik yenileme
- [ ] Cloudflare Quick Tunnel yerine kalıcı reverse proxy/yayın yolu
- [ ] Üretim secret'larını staging değerlerinden ayrı üretme
- [ ] Kalıcı diskler, kapasite sınırları ve log saklama politikasını tanımlama
- [x] Production Compose'da değişmez image digest zorunluluğu; `latest` etiketlerini reddeden preflight
- [ ] SQL, PostgreSQL ve MinIO yedeklerini zamanlama ve harici konuma kopyalama
- [ ] Dış HTTPS uptime probu ve alarm alıcısını bağlama

### 5. Son kalite kapısı

- [ ] Temiz checkout üzerinde CI'nın tamamının geçtiğini doğrulama
- [ ] Backend, frontend ve Tarım AI bağımlılık/zafiyet taramalarını yenileme
- [ ] Docker imaj taraması
- [ ] Yetki izolasyonu ve olumsuz güvenlik testlerini tekrar çalıştırma
- [ ] Yükleme boyutu, düşük bağlantı ve hata ekranı kontrolleri
- [ ] Kritik veya yüksek öncelikli açık hata kalmadığını onaylama

### 6. Sürüm ve geri dönüş

- [ ] İlk yayın sürümünü belirleme (öneri: `v1.0.0`)
- [ ] Release commit/tag ve sürüm notlarını oluşturma
- [ ] Yayın öncesi eşlenmiş veri yedeği alma
- [ ] Kullanılacak imaj digest'lerini kayıt altına alma
- [ ] Uygulama geri dönüşü ve veri geri-yükleme karar ağacını prova etme
- [ ] Yayından sonraki ilk 30–60 dakika sağlık/log takibini yapma

## Yayın kararı

Üretim yayını ancak yukarıdaki altı kapının tamamı geçtiğinde yapılır. Geçici cihaz kabul tüneli yalnızca deneme içindir ve üretim adresi olarak kullanılmaz.
