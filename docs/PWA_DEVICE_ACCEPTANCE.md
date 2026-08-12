# PWA Fiziksel Cihaz Kabul Testi

`mobile/` eşitlik, API, çevrimdışı kuyruk, üretim derlemesi ve 390×844 Chromium testleri tamamlandıktan sonra kaldırılmıştır. Bu liste PWA'nın üretim ortamına çıkışından önce gerçek cihazlarda uygulanacak son saha kabulüdür.

## Test ortamı kaydı

| Bilgi | Android | iPhone |
|---|---|---|
| Cihaz / model |  |  |
| İşletim sistemi |  |  |
| Tarayıcı ve sürüm |  |  |
| Test edilen URL |  |  |
| Test tarihi / tester |  |  |

## Kurulum ve uygulama kabuğu

- [ ] Android Chromium'da “Ana ekrana ekle / Uygulamayı yükle” çalışıyor.
- [ ] iOS Safari'de “Ana Ekrana Ekle” çalışıyor.
- [ ] Açılış `/producer` ekranına gidiyor; tarayıcı çubuğu olmadan standalone açılıyor.
- [ ] İkon, uygulama adı, tema rengi ve açılış görünümü doğru.
- [ ] Görevler, Sohbet, Bildirimler ve Profil sekmeleri taşmadan görünüyor.
- [ ] Ekran döndürme veya klavye açılması kullanılabilirliği bozmuyor.

## Ana üretici akışları

- [ ] Telefon/e-posta ve parola ile giriş yapılabiliyor; oturum yeniden açılışta korunuyor.
- [ ] Görev listesi ve detayları açılıyor; eğitim içeriği gösteriliyor.
- [ ] Kamera, galeri seçimi, önizleme ve fotoğraf kaldırma çalışıyor.
- [ ] Fotoğraf yüklendikten sonra görev iki aşamalı onayla gönderilebiliyor.
- [ ] İnternet kapalıyken fotoğraf kuyruğa alınıyor; bağlantı gelince otomatik yükleniyor.
- [ ] Sohbet oluşturma, mesaj gönderme ve sorun bildirme çalışıyor.
- [ ] Bildirimler ve profil/arazi bilgileri doğru geliyor.
- [ ] Çıkış yapınca oturum ve push aboneliği temizleniyor.

## Bildirim ve yaşam döngüsü

- [ ] Bildirim izni kullanıcı eylemiyle isteniyor ve abonelik oluşuyor.
- [ ] Uygulama açıkken SignalR bildirimi ekranda beliriyor.
- [ ] PWA arka plandayken Web Push bildirimi geliyor.
- [ ] PWA tamamen kapalıyken Web Push bildirimi geliyor.
- [ ] Bildirime dokununca doğru görev veya sohbet açılıyor.
- [ ] Uygulama güncellemesi veri kaybı olmadan yükleniyor.
- [ ] Zayıf bağlantı, API hatası ve çevrimdışı durumda beyaz ekran oluşmuyor.

## Kabul sonucu

| Platform | Sonuç | Kritik hata / not | Kanıt |
|---|---|---|---|
| Android | Bekliyor |  |  |
| iPhone | Bekliyor |  |  |

Her iki platform “Geçti” olmadan ve kritik hata kalmadan PWA üretim yayınına alınmaz.
