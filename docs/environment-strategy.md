# THABAT — Environment Architecture & Branching Strategy
**Phase 1.1 · Production Readiness**
*Last updated: April 7, 2026*

---

## Overview

THABAT operates two permanent, parallel environments. They are **never merged into each other** — they share a codebase history but diverge at the environment configuration level.

| Environment | Branch | Purpose | DEMO_MODE |
|-------------|--------|---------|-----------|
| **Demo** | `demo/unicharm-hygiene-profile` | Live client demonstrations — frozen, hardcoded data | `true` |
| **Production** | `main` | Delivery team hands off to paying customers — real DB, real ERP | `false` |

---

## Branch Rules

### Demo Branch (`demo/*`)
- **Frozen** — no new features are merged here after Phase 1 begins.
- Only hotfixes to the demo experience are allowed, with explicit approval.
- Runs against `.env.demo` (hardcoded demo Turso DB, DEMO_MODE=true).
- Deployment: dedicated demo hosting instance.

### Main / Production Branch (`main`)
- All Phase 1 production hardening work lands here.
- Requires passing CI (lint + types + tests) before merge.
- Runs against `.env.production` (real Turso DB, DEMO_MODE=false).
- Deployment: delivery team provisions the hosting environment.

---

## Environment Variable Strategy

Three `.env` files exist in the repository root. Only `.env.example` and `.env.production.template` are committed to git — **secrets are never committed**.

| File | Committed | Purpose |
|------|-----------|---------|
| `.env.example` | Yes | Safe reference — all keys, placeholder values, descriptions |
| `.env.production.template` | Yes | Delivery team fills this in with real credentials |
| `.env.demo` | **No** | Demo secrets — kept locally or in demo CI secrets |
| `.env` / `.env.local` | **No** | Local developer overrides |

### Key Flag: `NEXT_PUBLIC_DEMO_MODE`

This is the master switch that separates demo behavior from production behavior throughout the codebase.

```
NEXT_PUBLIC_DEMO_MODE=true   → hardcoded demo data flows (demo environment)
NEXT_PUBLIC_DEMO_MODE=false  → DB-backed real data paths (production environment)
```

All conditional demo/production logic in `src/lib/` modules uses `isDemoMode()` from `src/lib/env.ts`.

---

## Code Path Isolation

### Demo data modules and their production replacements

| Module | Demo behavior (DEMO_MODE=true) | Production behavior (DEMO_MODE=false) |
|--------|-------------------------------|--------------------------------------|
| `src/lib/calculateClientHealth.ts` | Pre-computes `CLIENT_HEALTH_RESULTS` from 7 hardcoded healthcare clients | `CLIENT_HEALTH_RESULTS` is empty `[]`; real clients fetched from DB and passed into `calculateClientHealth(realClients)` |
| `src/lib/entityDemoContent.ts` | All `getEntity*()` functions return hardcoded scenario data | Functions are marked `TODO[DELIVERY]` — delivery team replaces with `*Repository.getByEntityId()` calls in Phase 1.5 |
| `scripts/seed-demo.ts` | Full demo seeding | Not run in production — delivery team uses `db:migrate` only |

---

## Environment Setup Instructions

### For Demo Environment
1. Ensure `.env.demo` exists locally with `NEXT_PUBLIC_DEMO_MODE=true` (file is gitignored — request from team lead)
2. Run: `npm run dev` (picks up `.env.demo` or `.env`)
3. The app runs with all hardcoded demo clients and scenarios

### For Production Environment (Delivery Team)
1. Copy `.env.production.template` → `.env.production`
2. Fill in all `REPLACE_WITH_*` placeholders (Turso DB URL, auth token, JWT secret, Sentry DSN)
3. Set `NEXT_PUBLIC_DEMO_MODE=false`
4. Run: `npm run db:migrate` to initialize the Turso schema
5. Run: `npm run build && npm start`
6. The app runs with no demo data — real organizations onboard through the ERP wizard

---

## CI/CD Environment Mapping

*(GitHub Actions workflows added in Phase 1.7)*

| Workflow | Trigger | Environment |
|----------|---------|-------------|
| `ci-pr.yml` | Pull request to `main` | Test environment (ephemeral) |
| `deploy-demo.yml` | Push to `demo/*` | Demo hosting |
| `deploy-production.yml` | Push to `main` + approval | Production hosting |

---

*See also: `docs/architecture.md` · `docs/db-schema.md` (Phase 1.5) · `docs/delivery-team-handoff.md` (Phase 1.10)*
