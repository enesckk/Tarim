# Soil Parameter Aliases (Phase 2.2C)

## Amaç

Farklı laboratuvarların kullandığı parametre adlarını merkezi `SoilParameter.Code` ile eşleştirmek.

## SoilParameterAlias

| Alan | Not |
|------|-----|
| ParameterId | FK |
| Alias | Lab / rapor metni |
| Language | opsiyonel |
| LaboratoryId | LAB_SPECIFIC için |
| MatchType | `EXACT \| NORMALIZED_TEXT \| LAB_SPECIFIC \| MANUAL` |
| Priority | Çözüm sırası |

## Eşleşme kuralları

- **Tek parametre** → `MATCHED`
- **Birden fazla parametre** → `AMBIGUOUS` → normalization `REQUIRES_REVIEW`
- **Eşleşme yok** → `UNMATCHED`

Otomatik eşleşme kesin değilse sonuç **REQUIRES_REVIEW** kalır; ham değer silinmez.

## API

| Method | Path |
|--------|------|
| GET | `/api/soil-parameter-aliases` |
| POST | `/api/soil-parameter-aliases` |
| PUT | `/api/soil-parameter-aliases/{id}` |

## Seed

Alias satırları **seed edilmez** — laboratuvar bazlı eşlemeler operasyonel olarak eklenir.
