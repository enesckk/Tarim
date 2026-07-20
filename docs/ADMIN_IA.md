# Admin Panel Information Architecture

**Status:** Implementation target for `frontend/`  
**Normative refs:** SDS-R11 … SDS-R16 (land hub + combined expert; messaging/alerts split), SDS-R01  
**Companion:** [ADMIN_PANEL_CRITIQUE.md](./ADMIN_PANEL_CRITIQUE.md)

---

## 1. Design intent

The municipal SPA is an **Operations Center** for Administrator and **Tarım Uzmanı** (`Officer` = expert + inspector for V1).  
Producer remains on mobile. **Land (arsa/tarla) is the operational hub.**

Every screen exists because of a **business process**, not because an entity table exists.

---

## 2. Navigation structure (Turkish) — land-first (SDS-R16)

| Group | Item | Route | Admin | Officer |
|---|---|---|---|---|
| **Merkez** | Operasyon Merkezi | `/` | ✓ | ✓ |
| | **Araziler** (primary) | `/lands` | ✓ | ✓ (assigned only) |
| | Arazi merkezi (hub) | `/lands/:id` | ✓ | ✓ (assigned) |
| | Mesajlar (personel) | `/messages` | ✓ | ✓ |
| **Saha ve üretim** | Denetimler | `/inspections` | ✓ | ✓ |
| | Hasat ve teslimat | `/harvest` | ✓ | ✓ |
| | İş akışı şablonları | `/workflows` | ✓ | ✓ |
| **İzleme** | Bildirimler | `/notifications` | ✓ | ✓ |
| | Raporlar | `/reports` | ✓ | ✓ |

> **Deferred (V1 optional later):** Destek programları (`/support`) is **not** in the admin UI for now — stakeholder decision. Backend Support module/API remains for a future release.

Redundant global CRUD (Üreticiler / Sezonlar / Görevler as top-level day-to-day) is de-emphasized; APIs remain. Day-to-day assignment and production live on the land hub.

---

## 3. Land hub (`/lands/:id`) — one composition center

| Zone | Who | Content |
|---|---|---|
| Atamalar | **Admin only** | Producer + Tarım Uzmanı (`AssignedOfficerUserId`) |
| **Uyarılar** | Admin + assigned uzman | Overdue / missing step reports (e.g. “Demo Tarla — Can suyu verildi bilgisi gönderilmedi”) |
| Üretim planı | Admin + uzman | Crop → workflow template → tasks |
| Notlar | Admin + uzman | `LandNote` |
| Denetimler link | Admin + uzman | Inspections for this land |
| **Üretici ↔ Uzman sohbet** | Admin + uzman | Expert conversations with `LandId` — **not** mixed with staff chat |

---

## 4. Messaging placement (NORMATIVE — SDS-R16)

| Channel | Participants | UI surface |
|---|---|---|
| Expert | Producer ↔ Tarım Uzmanı | **Land detail only** (`Type=Expert`, `LandId` set) |
| Staff | Admin ↔ Tarım Uzmanı | **Mesajlar panel only** (`Type=Staff`) |

Admin may open/follow both; producer chat is never listed in Mesajlar.

---

## 5. Alerts + Notifications (NORMATIVE — SDS-R16)

- Land page **Uyarılar** = overdue / missing completion on that land.
- The **same events** are upserted as **Bildirimler** for Administrator(s) and the land’s Assigned Officer:
  - Title/body: “{Arazi} — «{adım}» bilgisi gönderilmedi / gecikti”
  - `RelatedEntityType=Land`, `RelatedEntityId=landId`
- Ops dashboard surfaces land-centric alerts; notifications inbox links back to the land hub.

---

## 6. Role shells

### Administrator
- Assign producer + uzman on every land; oversee all alerts and both message channels.
- Does **not** day-to-day enter every workflow (uzman does).

### Officer / Tarım Uzmanı
- Sees **only assigned lands**.
- On land: production, notes, inspections, reply to producer chat.
- May message admin via Mesajlar (Staff).
- Cannot assign uzman (admin only). V1 Officer may create/complete inspections.

### Producer
- Mobile only: tasks, photos, ask-expert → routes to land’s AssignedOfficerUserId.

---

## 7. Operations Center zones

| Zone | Content | Action |
|---|---|---|
| Arazi uyarıları | Land-labeled overdue/missing steps | → Araziler / land hub |
| Bugünün kritikleri | Due today | → Arazi |
| Bekleyen denetimler | Scheduled inspections | → Denetimler |
| Hasat → teslimat | Harvest pipeline | → Hasat |
| Son aktiviteler | Feed | → Raporlar |

---

## 8. Visual / UX constraints

- Keep AgroYönetim/v0 forest theme, fonts, cards — **no visual redesign**.
- Turkish throughout.
- Cards only for actionable lists/forms.

---

## 9. Success criteria

1. Admin assigns land → producer + uzman; uzman lists only that land.  
2. Overdue alert on land **and** in Bildirimler.  
3. Producer ask-expert → land officer; chat on land hub.  
4. Uzman ↔ admin only in Mesajlar.  
5. `dotnet build` + `frontend npm run build` pass.
