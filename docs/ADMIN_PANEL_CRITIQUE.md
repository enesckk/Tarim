# Admin Panel Critique — Product & Technical

**Scope:** Municipal React SPA (`frontend/`) vs Product Vision, SRS, Domain Analysis, Aggregate Design, Event Storming, Backend Architecture, SDS (esp. SDS-R11 / SDS-R12 / SDS-R13).  
**Date:** 2026-07-19  
**Verdict:** The current panel is a **CRUD catalog with a count dashboard**, not an **Operations Center** for daily municipal agriculture work.

---

## 1. Product verdict

Domain Analysis is explicit: *“This application is NOT a CRUD application. It is a Workflow Driven Production Management Platform.”*  
Product Vision requires real-time visibility, inspections, harvest measurability, reporting, and notifications.  
Event Storming’s main flow is: Producer → Land → Season → Workflow → Tasks → Inspection → Harvest → Delivery → Season complete.

The SPA today mostly exposes **entity lists and forms**. It does not surface the **day’s work**, **blocking gates**, or **pipeline progress**. That is a product-architecture failure, not only a visual one.

---

## 2. Current IA vs documented processes

| Documented process (Event Storming / domains) | Current SPA | Gap |
|---|---|---|
| Register / manage producers | `/producers` list + create | Present as CRUD; no ops context (open tasks, season) |
| Register / manage lands | `/lands` Admin-only | Officer blocked despite SDS-R12 operational CRUD |
| Create / start seasons | `/seasons` Admin-only | Same Officer gap |
| Author / assign workflows | `/workflows` | Strongest screen; still not home for Officer |
| Generate / monitor tasks | `/tasks` list + filters | No “today / overdue / critical” cockpit |
| Inspections (gate harvest) | **Missing** | API exists (`/api/inspections`); no UI |
| Harvest + Delivery (SDS-R01) | **Missing** | API harvest exists; deliveries not exposed in SPA |
| Support programs | **Missing** | API `/api/support/programs` unused |
| Notifications (system alerts) | **Missing** | API `/api/notifications` unused |
| Messaging (“uzmana sor”) | `/messages` | Present; not role-home or ops-linked |
| Reporting / dashboards | `/` Admin-only counts | Counts ≠ operational reports |
| Identity / system admin | Profile seed note only | Acceptable V1 minimalism; not the main gap |

**Missing processes are the highest severity issue.** Decorative extras are not the problem — **undocumented modules would be**; **documented modules without screens** violate the brief.

---

## 3. Dashboard critique — CRUD stats ≠ Operations Center

Current `/` (“Özet”) shows four integers: producers, lands, active seasons, pending tasks.

| Operations Center need | Current |
|---|---|
| Today’s critical / due tasks | Absent |
| Overdue tasks | Absent (status exists in domain; not prioritized) |
| Pending inspections | Field in `DashboardSummary` type unused in UI |
| Harvest → delivery pipeline | Absent |
| Unread messages / notifications | Absent |
| Workflow progress (assigned instances) | Absent |
| Recent activity feed | Absent |
| Role-filtered content | Dashboard **Admin-only**; Officer lands on `/workflows` |

Officer (Tarım Uzmanı) is the day-to-day ops identity (SDS-R12) yet has **no Operations Center home**. That inverts the product model.

---

## 4. Role model gaps (SDS-R11 / R12 / R13)

| Expectation | Current behavior |
|---|---|
| Dual surfaces: Admin vs Tarım Uzmanı | Partially: nav hides some Admin items; same CRUD chrome |
| Officer home = operational cockpit | Home = `/workflows` (definition editor), not ops |
| Officer sees producers / lands / seasons in scope | Lands & seasons Admin-only; producers shared |
| Assignment-scoped visibility (SDS-R13) | Not implemented (municipality-wide lists) |
| Producer stays on mobile | Correctly blocked from SPA |
| Inspector primary on mobile | No SPA surface (acceptable for V1 admin panel) |
| Notifications vs Communication not conflated | Messages exist; notifications omitted → risk of conflation later |

---

## 5. Information architecture problems

1. **Flat nav** — entity names (“Üreticiler”, “Araziler”) without process grouping (Operasyon / Planlama / Saha / …).
2. **No process order** — Event Storming left-to-right flow is invisible; user jumps between unrelated CRUD pages.
3. **Profile as nav peer** — account chrome competes with business processes.
4. **Harvest owns Delivery** — if Harvest appears without Delivery, SDS-R01 is violated in UX.
5. **Reporting** — SRS/Reporting domain reduced to four KPI tiles; no operational report view.

---

## 6. Technical debt (frontend + API wiring)

| Issue | Impact |
|---|---|
| SPA ignores inspections, harvest, support, notifications endpoints | Dead API surface; docs claim capabilities staff cannot operate |
| Dashboard cache returns counts only | Cannot power ops zones without richer query |
| No `/api/deliveries` (or harvest-scoped delivery) in host | Delivery aggregate exists in DB/repo; no HTTP write/read for staff |
| Officer route matrix inconsistent with SDS | Lands/seasons/ops home misaligned |
| Pages are independent lists | No cross-links (task → producer → inspection → harvest) |
| Types include `openInspections` / `harvestRecords` unused | Drift between API contract and UI |
| Minimalist CSS is fine (SDS-R11) | Visual system is acceptable; **IA and content model** are not |

Backend module structure (Producers … Reporting) and MediatR handlers are closer to the architecture docs than the SPA. The **admin UI is the lagging consumer**.

---

## 7. What to keep

- JWT + refresh + TanStack Query stack
- Forest green / stone visual language aligned with mobile
- Turkish (`tr-TR`) copy and low-literacy-friendly density (SDS-R12)
- Workflow step editor + assign (core SDS-R12 value)
- Staff-only gate (Producer → mobile)
- Thin host endpoints pattern (extend, don’t invent a second API style)

---

## 8. Redesign principles (input to ADMIN_IA)

1. **Home = Operations Center** for both Admin and Officer (role-filtered zones).
2. **Nav groups by process**, not by table name; few items; Turkish labels.
3. **Every Event Storming stage that staff owns has a screen** — no orphan domains in the panel.
4. **Harvest screen includes Delivery** (same nav item / page).
5. **No speculative modules** (GIS, IoT, marketplace, etc.).
6. **Wire existing APIs first**; add only minimal endpoints where Delivery / ops summary are missing.
7. **Officer menu** = Operasyon + Planlama (scoped) + Saha + İletişim + Raporlar; Admin adds full Planlama + Destek oversight + system profile.

---

## 9. Severity summary

| Severity | Finding |
|---|---|
| Critical | Not an Operations Center; Officer has no ops home |
| Critical | Inspections, Harvest/Delivery, Support, Notifications, Reports missing from UI |
| High | Role routing contradicts SDS-R12 dual panels |
| Medium | Flat CRUD IA; no activity/pipeline integration |
| Low | Visual polish; Profile placement |

**Conclusion:** Rebuild IA and SPA around **daily municipal operations**, mapping each nav item to Event Storming processes, before polishing aesthetics further.
