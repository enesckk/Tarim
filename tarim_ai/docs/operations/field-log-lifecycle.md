# Field Log Lifecycle

Bu doküman, Tarla Günlüğü modülünün durum (state) geçişlerini açıklar.

## Durumlar (States)
1. **DRAFT (Taslak)**: Üretici tarafından oluşturulan ve henüz onaya gönderilmeyen kayıt. Düzenlenebilir.
2. **SUBMITTED (Onaya Gönderildi)**: Üretici kaydı tamamlayıp uzmanın incelemesine sunduğunda geçerilen durum.
3. **UNDER_REVIEW (İncelemede)**: Uzmanın kaydı incelemeye başladığı ara durum (opsiyonel ancak mimaride desteklenmektedir).
4. **VERIFIED (Onaylandı)**: Uzmanın kaydı doğru bulup onayladığı durum. Bu durum immutabledır.
5. **REVISION_REQUIRED (Düzeltme Gerekli)**: Uzmanın kayıtta eksik/hata bularak üreticiden düzeltme talep ettiği durum.
6. **REJECTED (Reddedildi)**: Geçersiz veya hatalı kaydın tamamen reddedildiği durum.
7. **CANCELLED (İptal Edildi)**: Üretici tarafından iptal edilen kayıt. Sadece onaylanmamış kayıtlar iptal edilebilir.

## Geçiş Kuralları (Transitions)
- DRAFT -> SUBMITTED: Yalnızca kaydı oluşturan (producer) yapabilir. `FIELD_LOG_SUBMITTED` eventi fırlatılır.
- SUBMITTED -> VERIFIED | REVISION_REQUIRED | REJECTED: Yalnızca yetkili bir uzman (expert) yapabilir.
- REVISION_REQUIRED -> SUBMITTED: Üretici hataları düzeltip tekrar onaya gönderebilir.
- *VERIFIED durumuna geçildiğinde hiçbir alan değiştirilemez, silinemez veya iptal edilemez.*
