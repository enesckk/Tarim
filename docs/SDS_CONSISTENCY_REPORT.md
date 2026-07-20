# SDS Consistency Report

# Agriculture Management System

| Attribute | Value |
|---|---|
| **Document Title** | SDS Consistency Report |
| **Version** | 1.4 |
| **Date** | 2026-07-19 |
| **Status** | Approved companion to SDS 1.3 |
| **Owner** | Chief Software Architect / Architecture Board |
| **Related** | [SOFTWARE_DESIGN_SPECIFICATION.md](./SOFTWARE_DESIGN_SPECIFICATION.md) |

---

## 1. Purpose

This report documents contradictions found across prior `docs/` materials and the MVP scaffold, the **Chief Architect resolutions** encoded in SDS 1.0, gaps that were filled by the SDS, and items still deferred. It is the audit trail for why SDS supersedes conflicting statements.

**Precedence restated:** SDS > Accepted ADR > MODULE_DESIGN > specialized architecture docs > product/domain narrative docs > MVP scaffold.

---

## 2. Contradictions Found and Resolved

### C-01 — Harvest owns Delivery vs Delivery as separate module

| Field | Detail |
|---|---|
| **Evidence A** | PRODUCT_VISION §7 lists “Harvest Management” and “Delivery Management” as peer modules; DOMAIN_ANALYSIS lists Harvest Domain and Delivery Domain as separate domains. |
| **Evidence B** | MODULE_DESIGN §6.8, ENGINEERING_HANDBOOK, DATABASE_DESIGN, BACKEND_ARCHITECTURE: one module `Harvest` owns both aggregates/schemas; **MUST NOT** create `Modules/Delivery`. |
| **Impact** | Teams could create a sibling Delivery module, forcing cross-module transactions for quantity safety or weakening invariants. |
| **Resolution** | **SDS-R01:** Delivery is a separate **aggregate** + `delivery` schema under **Harvest module**. HTTP `/api/v1/deliveries` retained. No `Modules/Delivery`. |
| **Supersedes** | PRODUCT_VISION / DOMAIN_ANALYSIS module-peer framing on this point. |
| **SDS reference** | Part C §C.2, Part B SDS-R01, Part E Harvest/Delivery, Volume DE-01 |

### C-02 — Administrator vs Officer naming in roles

| Field | Detail |
|---|---|
| **Evidence A** | PRODUCT_VISION, SRS, PRD define municipal staff primarily as **Administrator** only (plus Producer, Inspector). |
| **Evidence B** | SECURITY_ARCHITECTURE, MODULE_DESIGN, API_CONTRACT, REACT_ARCHITECTURE: coarse roles include **Administrator** and **Agriculture Officer / Officer**. |
| **Impact** | Separation of duties and permission matrix impossible if only Administrator exists; SoD and least privilege fail. |
| **Resolution** | **SDS-R02:** Four coarse roles — Administrator, Officer, Inspector, Producer. Administrator is break-glass; Officer is day-to-day ops. |
| **Supersedes** | PRODUCT_VISION / SRS / PRD actor lists insofar as they omit Officer. |
| **SDS reference** | Part A §A.2, Part G RBAC matrix |

### C-03 — Single `agriculture` schema vs schema-per-module

| Field | Detail |
|---|---|
| **Evidence A** | MVP scaffold `AgricultureDbContext` uses `HasDefaultSchema("agriculture")` and maps many module entities into one context. |
| **Evidence B** | ADR-016, MODULE_DESIGN, DATABASE_DESIGN, BACKEND_ARCHITECTURE, ENGINEERING_HANDBOOK: schema-per-module; one DbContext per module; no cross-schema FKs. |
| **Impact** | Extraction seams destroyed; migration ownership unclear; accidental cross-module joins. |
| **Resolution** | **SDS-R03:** Schema-per-module is normative. Single `agriculture` schema is noncompliant scaffold debt (Part J). |
| **Supersedes** | MVP scaffold persistence approach; any informal “one schema is fine” notes. |
| **SDS reference** | Part E §E.1, Part D §D.4, Part J |

### C-04 — Controllers vs Minimal APIs

| Field | Detail |
|---|---|
| **Evidence A** | MVP `Program.cs` exposes business routes via `MapGroup` Minimal APIs. |
| **Evidence B** | BACKEND_ARCHITECTURE §10.1, ENGINEERING_HANDBOOK, SOLUTION_ARCHITECTURE: MVC Controllers are Accepted v1 host surface; handbook forbids introducing Minimal APIs as default without ADR. |
| **Impact** | Inconsistent auth filters, OpenAPI grouping, handbook enforceability; dual styles in codebase. |
| **Resolution** | **SDS-R04:** Thin MVC Controllers for `/api/v1` business resources. Minimal APIs **MAY** for health/trivial only. |
| **Supersedes** | MVP Minimal API business endpoints as target pattern. |
| **SDS reference** | Part D §D.5, Part B SDS-R04, Part J |

### C-05 — EnsureCreated vs EF migrations

| Field | Detail |
|---|---|
| **Evidence A** | MVP `Program.cs` calls `EnsureCreatedAsync` (and related bootstrap) for Identity/agriculture tables. |
| **Evidence B** | DATABASE_DESIGN, TESTING_ARCHITECTURE, DEPLOYMENT_ARCHITECTURE, GIT_RELEASE_STRATEGY, ENGINEERING_HANDBOOK: EF migrations mandatory; EnsureCreated forbidden as migration substitute in CI/Staging/Production. |
| **Impact** | No safe evolutionary schema story; history unverifiable; Production risk. |
| **Resolution** | **SDS-R05:** EF migrations only for durable environments; migrator identity; expand-contract rules. |
| **Supersedes** | MVP EnsureCreated bootstrap as architecture. |
| **SDS reference** | Part H §H.6, Part D, Part J |

### C-06 — GitFlow-inspired vs trunk-based as primary

| Field | Detail |
|---|---|
| **Evidence A** | GIT_RELEASE_STRATEGY explicitly rejects pure trunk-based as **primary** municipal model and adopts GitFlow-inspired. |
| **Evidence B** | Some industry default / potential tribal preference for trunk-based continuous Production deploy (noted as alternative in GIT_RELEASE “why not trunk”). |
| **Impact** | Release approval culture vs continuous deploy mismatch; UAT freeze needs. |
| **Resolution** | **SDS-R06:** GitFlow-inspired (`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`) is primary. Trunk-based requires ADR-021+. |
| **Supersedes** | Any assumption that trunk-based is default AMS process. |
| **SDS reference** | Part H §H.5 |

### C-07 — Soft-delete / audit / RowVersion consistency

| Field | Detail |
|---|---|
| **Evidence A** | Early product docs mention history/traceability without specifying concurrency tokens. |
| **Evidence B** | ADR-016, DATABASE_DESIGN, BACKEND, SECURITY, handbook: soft delete + audit columns + `RowVersion` on contested aggregates; immutability after certain statuses independent of soft delete. |
| **Impact** | Lost updates on delivery quantities; unclear purge vs soft delete. |
| **Resolution** | Affirm ADR-016 as SDS persistence baseline; soft delete ≠ soft edit forever; purge paths distinct; RowVersion mandatory on contested roots. |
| **Supersedes** | Vague “keep history” without concurrency/purge semantics. |
| **SDS reference** | Parts D–E, G; ADR-016 summary in Part B |

### C-08 — Cross-module FK vs Guid references only

| Field | Detail |
|---|---|
| **Evidence A** | Traditional ER thinking / MVP shared context encourages FKs across all tables. |
| **Evidence B** | ADR-016/017, DATABASE_DESIGN, MODULE_DESIGN: no cross-schema FKs; Guid logical refs; Harvest↔Delivery intra-module FK allowed. |
| **Impact** | Hard extraction; distributed monolith coupling. |
| **Resolution** | Cross-module Guid only; intra-module FKs OK; Harvest↔Delivery FK preferred inside HarvestDbContext. |
| **Supersedes** | Shared-context FK-everywhere approach. |
| **SDS reference** | Part E §E.1, Part C communication rules |

### C-09 — Identity DbContext vs unified DbContext

| Field | Detail |
|---|---|
| **Evidence A** | MVP: `IdentityDbContext` (Identity) **plus** shared `AgricultureDbContext` for almost everything else. |
| **Evidence B** | Target docs: one `{Module}DbContext` per module including Producers/Tasks/etc.; Identity separate; **MUST NOT** shared AppDbContext. |
| **Impact** | Half-modular structure; false sense of modularity. |
| **Resolution** | **SDS-R07:** Per-module DbContexts; Identity remains separate; unified business context is noncompliant. |
| **Supersedes** | `AgricultureDbContext` as target. |
| **SDS reference** | Part D §D.4, Part J |

### C-10 — React admin dark mode / stack vs handbook

| Field | Detail |
|---|---|
| **Evidence A** | REACT_ARCHITECTURE mandates dark mode via CSS variable tokens and modern SPA stack (TanStack Query, i18n, headless primitives). |
| **Evidence B** | ENGINEERING_HANDBOOK focuses on naming/DoD; does not forbid dark mode; MVP `frontend/package.json` lacks TanStack Query/i18n. |
| **Impact** | Perceived conflict (“handbook vs fancy UI”) or under-built SPA mistaken as target. |
| **Resolution** | Dark mode via tokens is **normative for admin SPA** and compatible with handbook shared UI stewardship. MVP frontend is a gap, not a counter-decision. |
| **Supersedes** | None of the normative docs conflict; scaffold incompleteness clarified. |
| **SDS reference** | Part F §F.1, Part J |

### C-11 — Messaging module readiness ambiguous

| Field | Detail |
|---|---|
| **Evidence A** | PRODUCT_VISION/SRS include Messaging; API_CONTRACT has Communication endpoints; MODULE_DESIGN §6.11 defines module. |
| **Evidence B** | Implementation readiness and depth (reactions/presence vs baseline) not consistently decided as V1 vs deferred. |
| **Impact** | Scope blowup or accidental omission. |
| **Resolution** | **SDS-R10:** Communication module **MUST** exist with baseline inbox/send/close; rich chat deferred; **MUST NOT** replace Notifications. |
| **Supersedes** | Ambiguous “full messaging platform in V1” readings. |
| **SDS reference** | Part C §C.7 |

### C-12 — Multi-tenancy stance underspecified for V1

| Field | Detail |
|---|---|
| **Evidence A** | Docs describe `TenantId` hooks and future multi-municipality reuse. |
| **Evidence B** | Whether V1 ships multi-municipality admin UX / schema-per-tenant unclear across narratives. |
| **Impact** | Over-building SaaS tenancy or omitting TenantId columns. |
| **Resolution** | **SDS-R08:** `TenantId` on roots + filters mandatory; V1 **MAY** single municipality seed; schema-per-tenant deferred. |
| **SDS reference** | Part E §E.2 |

### C-13 — i18n / locale default missing as hard decision

| Field | Detail |
|---|---|
| **Evidence A** | REACT / RN architectures say Turkish municipal default + English ops. |
| **Evidence B** | Not elevated uniformly as a cross-cutting SDS decision; API language vs UI language sometimes ambiguous. |
| **Impact** | Inconsistent UI locale; hard-coded English strings. |
| **Resolution** | **SDS-R09:** UI default `tr-TR`; English optional for ops; API stable `errorCode` with optional English `detail`. |
| **SDS reference** | Part E §E.6, Part F |

### C-14 — Hangfire queues / outbox ownership scattered

| Field | Detail |
|---|---|
| **Evidence A** | Multiple docs require Hangfire + per-module outbox. |
| **Evidence B** | Named queue taxonomy and “Hangfire ≠ outbox” not always restated together. |
| **Impact** | Teams using Hangfire tables as business outbox or single undifferentiated queue. |
| **Resolution** | SDS Part D defines named queues (`critical`, `default`, `notifications`, `reporting`, `maintenance`) and per-module outbox mandate. |
| **SDS reference** | Part D §D.6, Part E §E.4 |

### C-15 — Environment matrix not centralized

| Field | Detail |
|---|---|
| **Evidence A** | DEPLOYMENT/GIT describe Local/CI/Staging/Production behaviors. |
| **Evidence B** | No single product-facing matrix in early docs. |
| **Impact** | Confusion about where EnsureCreated might be “ok,” who approves Production, data sensitivity. |
| **Resolution** | SDS Part H §H.2 environment matrix; EnsureCreated banned for CI/Staging/Production. |
| **SDS reference** | Part H §H.2 |

### C-16 — ADR vs MODULE_DESIGN vs BACKEND minor surface conflicts

| Field | Detail |
|---|---|
| **Evidence** | Generally aligned on modular monolith/CQRS/MediatR; residual risk was API style (Controllers) and persistence topology vs scaffold, already covered in C-03–C-05, C-09. |
| **Resolution** | SDS Part B master table consolidates ADR-001…020; SDS-R* resolve residual conflicts. On silence, MODULE_DESIGN then BACKEND apply. |
| **SDS reference** | Part B, Front Matter precedence |

### C-17 — Database / minimalism / caching underspecified vs stakeholder mandate

| Field | Detail |
|---|---|
| **Evidence A** | ADR-005/015 and SDS framed SQL Server as primary but left a portable EF/PostgreSQL path open; caching was “conservative / Redis when Stage criteria met,” often read as future-only. |
| **Evidence B** | Stakeholder (Chief Architect product constraint): **MSSQL confirmed for V1**; **minimalist** product & architecture mandatory; **caching WILL be used in V1** (not deferred). |
| **Impact** | Teams could speculate on Cosmos/Postgres for V1, ship decorative UI/unused modules, or skip cache until “later Redis,” leaving hot reads uncached on day one. |
| **Resolution** | **SDS-R11:** (1) Microsoft SQL Server only for V1 OLTP — no alternate DB. (2) Minimalist design mandatory (YAGNI/KISS for UX and architecture). (3) V1 caching in scope: default `IMemoryCache` / ASP.NET memory cache; Redis only when horizontally scaling (>1 API instance); invalidate on writes; no unnecessary PII in cache. Approved stack (Hangfire/Seq/MinIO) retained. |
| **Supersedes** | Readings of ADR-015 / PHYSICAL “Redis later” as “no cache in V1”; any V1 alternate-DB speculation; decorative/speculative extras conflicting with minimalism. |
| **SDS reference** | Part B SDS-R11, §B.5–B.6, Volume XXX |

### C-18 — Workflow configuration, dual staff panels, and expert messaging underspecified vs stakeholder mandate

| Field | Detail |
|---|---|
| **Evidence A** | PRODUCT_VISION / PRD / SRS describe a single municipal **Administrator**, imply workflows as product structure, and mention simplicity/literacy without stating continuous expert authoring in UI, dual staff panels, or “ask the expert” as first-class Producer→Officer messaging. SDS-R02 already named **Officer** but did not bind the Turkish label **Tarım Uzmanı** or separate Admin vs Expert SPA shells. |
| **Evidence B** | Stakeholder clarification (Turkish municipality AMS): (1) workflows are **continuously configured** in admin/expert UI—not hardcoded; vary by producer/crop/season; (2) Admin and **Tarım Uzmanı** enter production workflows from expert knowledge (steps, norms, dates, reminders); producers complete tasks; experts monitor; (3) **minimalist, low digital-literacy** UI; (4) users can message / **uzmana sor**; (5) **two municipal staff surfaces** — Administrator (full) vs Tarım Uzmanı (operational; not full system admin); (6) map Tarım Uzmanı to existing role **Officer**. |
| **Impact** | Teams could hardcode crop calendars, ship one undifferentiated admin SPA with over-privileged expert accounts, omit ask-expert messaging, or invent a second coarse role (`AgriculturalExpert`) diverging from SDS-R02. |
| **Resolution** | **SDS-R12:** (1) Workflow definitions **MUST** be authored/edited continuously in SPA by Administrator and Officer—not hardcoded for municipal crop/season variation. (2) Coarse role key remains **`Officer`**; Turkish UI label **SHALL** be **Tarım Uzmanı** (no parallel `AgriculturalExpert` role). (3) React SPA **SHALL** provide dual shells: **Administrator panel** (full access) vs **Tarım Uzmanı panel** (workflows, progress monitoring, messaging, scoped ops—no unrestricted Identity/Administration unless explicitly granted). (4) Communication V1 **MUST** include Producer **uzmana sor** → Officer reply; Administrator retains messaging oversight. (5) UX **MUST** stay minimalist and literacy-friendly (extends SDS-R11). |
| **Supersedes** | PRODUCT_VISION / SRS / PRD single-Administrator staffing and any implication that workflows are fixed in code; informal “Agriculture Officer” without Tarım Uzmanı UI binding. |
| **SDS reference** | Part A §A.2–A.2.3, §A.7.3; Part B SDS-R12, §B.6a, §B.7; Part C §C.7; Part F §F.1–F.2; Part G §G.3; Workflow Definition annex |

### C-19 — Delivery order, Officer visibility, chat UX, locale, and local SQL underspecified vs stakeholder mandate

| Field | Detail |
|---|---|
| **Evidence A** | SDS Part J phased delivery listed SPA maturity and RN offline-first together in late Phase 5; Officer RBAC matrix showed broad `F` on Producers/Lands/Workflows without stating assignment-only default; SDS-R10 / DE-10 framed Communication as “baseline inbox” and deferred “threading depth”; SDS-R09 already set `tr-TR` but delivery docs did not reaffirm UI language as day-one; Local/Dev SQL hosting (installed instance vs Docker) left informal. |
| **Evidence B** | Stakeholder answers (2026-07-18): (1) **design mobile first** (producer app), then web Admin + Tarım Uzmanı panels; (2) Tarım Uzmanı sees **only assigned** producers/lands/workflows—not the whole municipality by default; (3) messaging is **chat-like** threaded conversations including **uzmana sor**; (4) UI **Turkish (`tr-TR`)** from the start; (5) **local SQL Server** is acceptable for development (Docker SQL optional later). |
| **Impact** | Teams could build Admin SPA before producer mobile UX, give Officers municipality-wide lists by default, ship form-style inbox instead of chat threads, ship English-first UI, or block Local/Dev on Docker Compose SQL when a local MSSQL instance already works. |
| **Resolution** | **SDS-R13:** (1) Delivery/design order **MUST** be **mobile-first** (Producer RN UX/app), then React Admin + Tarım Uzmanı web panels. (2) Officer (Tarım Uzmanı) data visibility **MUST** be **assignment-scoped** by default (assigned producers, lands, workflows/production instances); municipality-wide browse **MUST NOT** be the default Officer grant. (3) Communication V1 UX **MUST** be **chat-like** (conversation list + message thread + send text), including uzmana sor; rich extras (reactions, presence, photo-in-chat) remain optional/later. (4) All primary UI surfaces **SHALL** ship `tr-TR` from day one (reinforces SDS-R09). (5) Local/Dev **MAY** use an installed **local SQL Server**; Dockerized SQL remains optional later—not a Local/Dev gate. |
| **Supersedes** | Readings of Part J Phase 5 as “SPA before mobile”; Officer `F` matrix as municipality-wide default visibility; SDS-R10 / DE-10 “defer threading” insofar as it blocked chat-like threads (reactions/presence still deferred); any requirement that Local/Dev must wait for Docker SQL. |
| **SDS reference** | Part A §A.2.2–A.2.3, §A.8; Part B SDS-R13, §B.5, §B.7; Part C §C.7; Part F §F.1–F.2; Part G §G.3; Part H §H.2; Part J §J.3; `docs/MOBILE_UX_DESIGN.md` |

### C-20 — Workflow steps as checklist + evidence + deadline

| Field | Detail |
|---|---|
| **Evidence A** | Early scaffold `WorkflowStep` only had Name / Description / Order / DueDaysFromStart / RequiresPhoto. |
| **Evidence B** | Stakeholder Domates example requires rich steps (guidance questions, son gün, photo/quantity/date evidence through harvest & delivery). |
| **Impact** | Admin could not author production checklists that mobile/tasks can later collect as structured evidence. |
| **Resolution** | **SDS-R14 (implementation note):** Workflow steps are checklist + evidence + deadline driven. V1 fields: `DueDaysFromStart`, `RequiresPhoto`, `RequiresQuantity`, `RequiresDate`, `QuantityUnit`. Assignment copies these onto `ProductionTask`. UI may offer crop templates (e.g. Domates) as prefill only—definitions remain SPA-authored (SDS-R12). Unbounded step count (N steps). |
| **SDS reference** | Part C workflows; ADMIN_IA §10 |

### C-21 — Land-centric production planning vs producer-first assignment UX

| Field | Detail |
|---|---|
| **Evidence A** | SPA “İş akışları → Üreticiye ata” treated producer as the planning hub; land was a dropdown side-effect. |
| **Evidence B** | Stakeholder clarification: **land/plot is stable**; producer may change; day-to-day admin path is open Tarla → choose crop → attach workflow → assign/reassign producer → tasks generate. |
| **Impact** | Staff would re-plan from scratch when producer changes; plot history and “this period’s crop” would be hard to find. |
| **Resolution** | **SDS-R15:** Land is the stable center of production planning. Global `/workflows` holds reusable **templates**. Primary authoring/assignment happens on **land detail → Üretim planı** (crop + workflow + assign/reassign producer). Reassign updates producer on the production instance without discarding the land–workflow bond; task generation remains on assign. |
| **SDS reference** | ADMIN_IA land-centric section; Lands/Workflows modules |

### C-22 — Land hub operations + combined expert + message/alert split

| Field | Detail |
|---|---|
| **Evidence A** | Admin day-to-day mixed global CRUD; Officer lacked land assignment; Inspector separate; producer chat and staff chat mixed in one inbox; overdue steps only visible if you opened a land. |
| **Evidence B** | Stakeholder: land is hub; Admin assigns producer **and** Tarım Uzmanı; Officer = expert+inspector (`Officer` key); producer↔uzman chat on **land page**; uzman↔admin in **Mesajlar** only; land Uyarılar must also appear as **Bildirimler**. |
| **Impact** | Wrong inbox placement; uzman saw all lands; alerts missed unless navigating to plot. |
| **Resolution** | **SDS-R16:** `AssignedOfficerUserId` on Land; Officer-scoped `GET /lands`; land hub (assignments, alerts, notes, expert chat, production); Staff conversations (`Type=Staff`) in Mesajlar; Expert+LandId on land hub; overdue/missing steps upsert Notifications (`RelatedEntityType=Land`) for Admin + assigned Officer. |
| **SDS reference** | ADMIN_IA §§2–5; Lands/Communication/Notifications |

---

## 3. Contradiction Count Summary

| Metric | Count |
|---|---|
| **Distinct contradiction / ambiguity classes resolved** | **22** (C-01 … C-22) |
| **Named SDS resolutions (SDS-R01 … R16)** | **16** |
| **Scaffold noncompliance items registered in SDS Part J** | **8+** major |

---

## 4. Missing Decisions Filled by SDS

| Gap | SDS fill |
|---|---|
| Messaging V1 depth | Baseline Communication only (SDS-R10) |
| Municipality multi-tenancy V1 | TenantId hooks; single tenant seed (SDS-R08) |
| i18n default | `tr-TR` (SDS-R09) |
| Environment matrix | Local/CI/Staging/Production (H.2) |
| Hangfire queue names | D.6 table |
| Outbox vs Hangfire | Per-module outbox mandatory; Hangfire dispatches |
| MediatR pipeline order | Part B diagram + D.10 |
| Phase 0 scaffold retirement rule | Part J |
| Officer vs Admin SoD | Part A + G |
| Dark mode norm for SPA | Part F |
| Controller vs Minimal API | SDS-R04 |
| Delivery module folder | SDS-R01 |
| Git primary model | SDS-R06 |
| Critical endpoints index without duplicating full API_CONTRACT | Part E.5 |
| DoD Command/Event/Policy/Read Model elevated | Part I |
| Production playbook season spine | Volume XXI |
| V1 MSSQL + minimalist + caching | SDS-R11 (memory cache default; Redis on scale-out) |
| Continuous workflow config + dual Admin/Tarım Uzmanı panels + uzmana sor | SDS-R12 (role key `Officer`; low-literacy UX) |
| Mobile-first delivery + Officer assignment scope + chat threads + local SQL Server | SDS-R13 (Producer UX first; assignment-scoped Tarım Uzmanı; chat-like Messaging; `tr-TR`; Local MSSQL OK) |
| Workflow steps checklist + evidence + deadline | SDS-R14 |
| Land-centric production planning | SDS-R15 |
| Land hub + Officer assignment + message/alert split | SDS-R16 |

---

## 5. Open Risks / Deferred Items (Still Deferred)

| Item | Why deferred | Hook |
|---|---|---|
| GIS analysis | Out of V1 scope | Land coordinates only |
| MFA enforcement | MFA-ready design; enforce later | Identity/Admin flags |
| Municipal SSO/OIDC | Hooks only | Identity future |
| Schema-per-tenant | Premature | TenantId row filters first |
| Redis distributed cache / SignalR backplane | Only when >1 API instance or Stage criteria; **V1 memory cache is in scope (SDS-R11)** | PHYSICAL/ADR-015/SDS-R11 |
| Microservices extraction | Gates unmet | MODULE_DESIGN §10 |
| AI / yield / disease / IoT / weather / drones / satellite | Product out of scope V1 | Vision future list |
| SMS primary channel | Optional later | Notifications adapters |
| Rich messaging (reactions/presence/photo-in-chat) | After chat-like baseline (SDS-R13 threads in V1) | Communication |
| Virus scanning for uploads | Infra-dependent | MinIO pipeline |
| Temporal tables / partitioning | Capacity-triggered | DATABASE_DESIGN |
| OpenTelemetry full APM | Optional | Observability evolution |
| Broker (RabbitMQ/ASB) | Requires ADR | Outbox remains in-process |
| Pure trunk-based Git | Requires ADR-021 | GIT_RELEASE note |

These remain **open by design**, not unresolved contradictions.

---

## 6. MVP Scaffold Gap Snapshot (Non-Normative)

Observed at SDS authoring time:

- Shared `AgricultureDbContext` + schema `agriculture`
- Minimal API `MapGroup` business endpoints
- `EnsureCreatedAsync` startup path
- Partial module set; Communication/Reporting/Administration incomplete vs target
- Frontend Vite React without full feature/i18n/SignalR stack
- React Native app not present as prescribed architecture target

SDS Part J is authoritative for remediation sequencing (Phase 0 first).

---

## 7. Documents Reviewed

PRODUCT_VISION.md, SRS.md, PRD.md, DOMAIN_ANALYSIS.md, AGGREGATE_DESIGN.md, EVENT_STORMING.md, MODULE_DESIGN.md, ADR.md, PHYSICAL_ARCHITECTURE.md, SOLUTION_ARCHITECTURE.md, BACKEND_ARCHITECTURE.md, DATABASE_DESIGN.md, API_CONTRACT.md, REACT_ARCHITECTURE.md, REACT_NATIVE_ARCHITECTURE.md, SECURITY_ARCHITECTURE.md, DEPLOYMENT_ARCHITECTURE.md, TESTING_ARCHITECTURE.md, ENGINEERING_HANDBOOK.md, GIT_RELEASE_STRATEGY.md, README.md; plus brief MVP inspection of `src/` and `frontend/` (no application code rewritten).

---

## 8. Maintenance

When a new contradiction class is discovered, append C-NN with Evidence → Impact → Resolution → SDS section, and amend SDS in the same documentation PR.

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-07-18 | Initial report aligned to SDS 1.0 |
| 1.1 | 2026-07-18 | SDS-R11: MSSQL confirmed; minimalist mandatory; V1 caching in scope (C-17) |
| 1.2 | 2026-07-18 | SDS-R12: configurable workflows; dual Admin / Tarım Uzmanı (`Officer`) panels; uzmana sor; low-literacy UX (C-18) |
| 1.3 | 2026-07-18 | SDS-R13: mobile-first delivery; Officer assignment-scoped visibility; chat-like messaging; `tr-TR` day one; local SQL Server for Local/Dev (C-19) |
| 1.4 | 2026-07-19 | SDS-R14 workflow evidence steps (C-20); SDS-R15 land-centric production planning (C-21) |
| 1.5 | 2026-07-19 | SDS-R16 land hub; Officer=uzman+denetçi; producer chat on land; staff Mesajlar; alert→Bildirimler (C-22) |

---

**End of SDS Consistency Report v1.5**
