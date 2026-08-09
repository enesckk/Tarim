# Field Input Usage

Bu doküman, tarla günlüğüne (Field Log) eklenen tarımsal girdi (Input) kullanımlarının nasıl kaydedildiğini açıklar.

## Girdi Türleri (Input Types)
- **SEED (Tohum)**: Ekim işlemlerinde kullanılan tohum türü ve miktarı.
- **FERTILIZER (Gübre)**: Gübreleme işlemlerinde kullanılan besin maddesi.
- **PESTICIDE (Zirai İlaç)**: Hastalık, zararlı ve yabancı ot kontrolü için kullanılan kimyasal.
- **WATER (Su)**: Sulama işlemlerinde kullanılan su hacmi.

## API Kullanımı
Endpoint: `POST /api/field-logs/:id/inputs`

Payload Örneği:
```json
{
  "inputType": "FERTILIZER",
  "productName": "Üre %46",
  "quantity": 25,
  "unit": "kg"
}
```

## İş Kuralları
- Girdiler yalnızca durum `DRAFT` veya `REVISION_REQUIRED` iken eklenebilir.
- Her bir girdi, genel `fld_log_input_usages` tablosuna kaydedilir ve ana kayıt ile ilişkilendirilir (Foreign Key).
- Üretim planında belirtilen tahmini girdiler ile gerçekleşen girdiler bu tablolar aracılığıyla kıyaslanarak maliyet/verim analizlerinde kullanılabilir.
