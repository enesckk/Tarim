# Field Log Expert Review

Bu doküman, uzmanların (Ziraat Mühendisi, Danışman) üreticiler tarafından onaya gönderilen tarla kayıtlarını nasıl incelediğini açıklar.

## Süreç İşleyişi
1. Üretici, tarladaki işlemini kaydeder ve `SUBMITTED` durumuna getirir.
2. Uzman ekranına (`field-log-expert.html`) yeni bir bildirim ve inceleme kaydı düşer.
3. Uzman, kaydın detaylarını (Tarih, Miktar, Hava Durumu, Parsel vb.) inceler.
4. Uzman, varsa yüklenen kanıt (Evidence) dosyalarını (fiş, traktör ekranı, tarla fotoğrafı vb.) doğrular.

## Karar Seçenekleri
- **VERIFIED (Doğrula)**: İşlem geçerli ve uygun. Kayıt kilitlenir (Immutable). Eğer bu log bir üretim planı göreviyle (Production Task) ilişkiliyse ve `completeLinkedTask = true` işaretlenmişse, event bus üzerinden görev tamamlandı olarak işaretlenir (`LINKED_TASK_COMPLETION_REQUESTED`).
- **REVISION_REQUIRED (Düzeltme İste)**: Kayıt hatalı veya eksik. Üreticiye eksik kısımları belirten bir not (reviewNotes) iletilir. Üretici düzeltip yeniden onaya sunar.
- **REJECTED (Reddet)**: Kayıt tamamen geçersiz, mükerrer veya yanlış parsele aitse reddedilir.

## Güvenlik & İzolasyon
Uzmanlar, yalnızca sorumlu oldukları veya atandıkları parsellerin kayıtlarını inceleyebilir. İdempotency sistemi sayesinde çift tıklama veya ağ kopmalarında mükerrer onay işlemi engellenir.
