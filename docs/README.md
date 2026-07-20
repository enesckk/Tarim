# Product Documentation

Product and architecture documents for the Agriculture Management System.

## Single Source of Truth

| Document | Role |
|---|---|
| **[SOFTWARE_DESIGN_SPECIFICATION.md](./SOFTWARE_DESIGN_SPECIFICATION.md)** | **Single Source of Truth (SDS v1.3 — Approved / Normative).** Implementation-ready unified design. Includes **SDS-R11** (MSSQL; minimalist; V1 caching), **SDS-R12** (continuously configured workflows; dual Admin / Tarım Uzmanı (`Officer`) panels; uzmana sor; low-literacy UX), and **SDS-R13** (mobile-first delivery; Officer assignment-scoped visibility; chat-like messaging; `tr-TR` day one; local SQL Server for Local/Dev). **On any conflict, SDS governs.** |
| **[SDS_CONSISTENCY_REPORT.md](./SDS_CONSISTENCY_REPORT.md)** | Contradiction log, Chief Architect resolutions (through SDS-R13), filled gaps, deferred risks. |
| **[MOBILE_UX_DESIGN.md](./MOBILE_UX_DESIGN.md)** | **Producer mobile UX** (primary): Turkish screen map, flows, empty/error, chat norms. Design before Admin/Expert web (SDS-R13). |

**Precedence:** SDS > Accepted ADR > MODULE_DESIGN > other architecture docs > product/domain narratives > MVP scaffold under `src/` / `frontend/`.

Prior documents below remain **historical / detailed reference** (encyclopedic depth, endpoint catalogues, index notes). They inform implementation when the SDS is silent, but they do **not** override the SDS.

---

## Reference library (historical / detailed)

Domain modules under `src/Modules/` map to the business domains defined in these documents; **target topology is defined by the SDS**, not by the current scaffold alone.

- [PRODUCT_VISION.md](./PRODUCT_VISION.md) — product vision
- [SRS.md](./SRS.md) — system requirements specification
- [PRD.md](./PRD.md) — product requirements document
- [DOMAIN_ANALYSIS.md](./DOMAIN_ANALYSIS.md) — domain analysis
- [AGGREGATE_DESIGN.md](./AGGREGATE_DESIGN.md) — aggregate design
- [EVENT_STORMING.md](./EVENT_STORMING.md) — event storming
- [ADMIN_PANEL_CRITIQUE.md](./ADMIN_PANEL_CRITIQUE.md) — admin SPA product/technical critique (Operations Center)
- [ADMIN_IA.md](./ADMIN_IA.md) — revised admin information architecture
- [MODULE_DESIGN.md](./MODULE_DESIGN.md) — bounded context & module design
- [ADR.md](./ADR.md) — architecture decision records
- [PHYSICAL_ARCHITECTURE.md](./PHYSICAL_ARCHITECTURE.md) — physical architecture specification
- [SOLUTION_ARCHITECTURE.md](./SOLUTION_ARCHITECTURE.md) — solution architecture specification (projects, folders, namespaces, DI, build)
- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) — backend architecture specification (layers, CQRS, MediatR, persistence, jobs, SignalR, security)
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) — database design specification (schemas, aggregates, indexes, outbox, security, ops)
- [API_CONTRACT.md](./API_CONTRACT.md) — REST API contract / API design specification (routes, DTOs, authz, Problem Details, SignalR)
- [REACT_ARCHITECTURE.md](./REACT_ARCHITECTURE.md) — React architecture specification (municipal admin SPA)
- [MOBILE_UX_DESIGN.md](./MOBILE_UX_DESIGN.md) — Producer mobile UX design (screens, flows, tr-TR; primary UX doc)
- [REACT_NATIVE_ARCHITECTURE.md](./REACT_NATIVE_ARCHITECTURE.md) — React Native architecture specification (producer/inspector mobile stack)
- [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) — security architecture specification
- [TESTING_ARCHITECTURE.md](./TESTING_ARCHITECTURE.md) — testing architecture specification
- [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) — deployment & DevOps architecture specification
- [GIT_RELEASE_STRATEGY.md](./GIT_RELEASE_STRATEGY.md) — Git & release management specification
- [ENGINEERING_HANDBOOK.md](./ENGINEERING_HANDBOOK.md) — engineering development handbook
