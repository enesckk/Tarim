# 1. Aşama — Mobil uygulamadan PWA'ya tam geçiş

Nihai ve tek istemci `frontend` içindeki PWA'dır. Taşıma/eşitlik doğrulaması tamamlanmış ve `mobile` klasörü kaldırılmıştır.

## Silme kapısı

`mobile` klasörü aşağıdaki matrisin tüm satırları tamamlanmadan silinmez. Tamamlanma; kaynak karşılaştırması, telefon boyutunda görsel kontrol, üretim derlemesi ve ilgili API akışının canlı testiyle kanıtlanır.

| Alan | Mobil kaynak | PWA karşılığı | Durum |
|---|---|---|---|
| Dört alt sekme | `RootNavigator.tsx` | `ProducerApp.tsx` | Tamamlandı |
| Görev listesi / Yapılacak / Süreç | `TodayTasksScreen.tsx` | `TasksPage` | Tamamlandı |
| Görev detayı ve tema kanıtları | `TaskDetailScreen.tsx` | `TaskPage` | Tamamlandı; 390×844 görsel ve canlı API testi geçti |
| Kamera / galeri ve fotoğraf işleme | `CapturePhotoScreen.tsx` | `TaskPage` | Önizleme, kaldırma, işleme, yükleme ve kuyruk tamam; canlı dosya yükleme testi geçti |
| Başarısız fotoğraf kuyruğu | `offline/photoQueue.ts` | `offlinePhotoQueue.ts` | Tamamlandı; API kesintisi → kuyruk → bağlantı dönüşü → otomatik yükleme testi geçti |
| Onaya gönderme | `CompleteTaskScreen.tsx` | `TaskPage` | Tamamlandı; fotoğraf yükleme → onaya gönderme → durum 5 testi geçti |
| Sohbet listesi | `MessagesScreen.tsx` | `MessagesPage` | Tamamlandı |
| Uzmana sor | `AskExpertScreen.tsx` | `MessagesPage` | Tamamlandı |
| Sohbet detayı | `ChatThreadScreen.tsx` | `ChatPage` | Tamamlandı; 390×844 görsel, konuşma oluşturma ve mesaj API testi geçti |
| Bildirimler | `NotificationsScreen.tsx` | `NotificationsPage` | Tamamlandı; 390×844 görsel ve canlı API testi geçti |
| Profil | `ProfileScreen.tsx` | `ProfilePage` | Tamamlandı; 390×844 görsel, arazi ve hesap API testi geçti |
| Sorun bildir | `ReportProblemScreen.tsx` | `ReportProblemPage` | Tamamlandı |
| Üretici giriş tasarımı | `LoginScreen.tsx` | `LoginPage.tsx` | Tamamlandı; 390×844 görsel ve üretici giriş testi geçti |
| Push bildirimi | `notifications/registerPush.ts` | `webPush.ts`, `push-sw.js`, `WebPushDelivery.cs`, `useSignalR.ts` | SignalR, kapalı PWA Web Push kodu ve abonelik API testi tamam; gerçek cihaz teslimi üretim saha kabulinde izlenecek |
| PWA kurulum/güncelleme/çevrimdışı kabuk | — | `PwaManager.tsx`, `vite.config.ts` | Manifest, ikonlar, SW, güncelleme ve çevrimdışı kabuk tamam; Chromium PWA çıktısı doğrulandı |

## Son doğrulama

- Backend temiz derleme
- Frontend TypeScript, lint ve üretim PWA derlemesi
- Üretici giriş, görev, fotoğraf, onay, sohbet, bildirim ve profil API testleri
- 390×844 telefon görünümünde her ekran için görsel kontrol
- Çevrimdışı kuyruk ve bağlantı geri dönüş testi
- Android Chromium ve iOS Safari kurulum testi
- Gerekli mobil varlıklarının PWA altında bulunduğunun doğrulanması
- `mobile` kaldırıldıktan sonra tüm repo derleme/testlerinin yeniden çalıştırılması — tamamlandı

Fiziksel telefon kabul adımları ve sonuç kaydı için [PWA_DEVICE_ACCEPTANCE.md](./PWA_DEVICE_ACCEPTANCE.md) kullanılır.

## Varlık denetimi

- `mobile/src` altında paketlenmiş yerel görsel kullanımı yoktur; görev eğitim ve kanıt görselleri API üzerinden gelir.
- Eski Expo `mobile/assets/icon.png` dosyası varsayılan Expo yer tutucusudur ve ürün markası değildir; PWA'ya taşınmamıştır.
- PWA için ürünle uyumlu 192×192, 512×512, maskable 512×512 ve Apple Touch 180×180 ikonları `frontend/public` altında bulunmaktadır ve manifestte doğrulanmıştır.
- Kamera ve galeri PWA'da tarayıcının `capture="environment"` ve dosya seçici yetenekleriyle çalışır; ek yerel mobil varlık gerektirmez.
