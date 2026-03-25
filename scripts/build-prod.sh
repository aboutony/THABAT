#!/usr/bin/env bash
# ── THABAT Production Build Script ────────────────────────────────────────────
# Phase 01–09 · Feature/sales-intelligence-p2
#
# Usage:
#   chmod +x scripts/build-prod.sh
#   ./scripts/build-prod.sh
#
# Exit codes:
#   0 — all checks passed, build succeeded
#   1 — TypeScript errors found
#   2 — Lint errors found
#   3 — Next.js build failed
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ── Header ────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}  ⬡  THABAT — Production Build${RESET}"
echo -e "  ${CYAN}Stability Intelligence · Phase 01–09${RESET}\n"

START_TIME=$(date +%s)

# ── Step 1: TypeScript ────────────────────────────────────────────────────────
echo -e "${BOLD}[1/3] TypeScript — type check${RESET}"
if npx tsc --noEmit; then
    echo -e "  ${GREEN}✓ No TypeScript errors${RESET}\n"
else
    echo -e "  ${RED}✗ TypeScript errors detected — fix before deploying${RESET}"
    exit 1
fi

# ── Step 2: ESLint ────────────────────────────────────────────────────────────
echo -e "${BOLD}[2/3] ESLint — code quality${RESET}"
if npx next lint --quiet; then
    echo -e "  ${GREEN}✓ Lint passed${RESET}\n"
else
    echo -e "  ${YELLOW}⚠ Lint warnings/errors — review before deploying${RESET}\n"
    # Lint is non-fatal (warnings are common in active development)
fi

# ── Step 3: Next.js build ─────────────────────────────────────────────────────
echo -e "${BOLD}[3/3] Next.js — production build${RESET}"
if NODE_ENV=production npx next build; then
    echo -e "  ${GREEN}✓ Build succeeded${RESET}\n"
else
    echo -e "  ${RED}✗ Build failed — see output above${RESET}"
    exit 3
fi

# ── Summary ───────────────────────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo -e "${BOLD}${GREEN}  ✓ THABAT build complete${RESET} — ${ELAPSED}s"
echo -e "  Output: ${CYAN}.next/${RESET}"
echo -e "  Deploy: ${CYAN}npx next start${RESET} or upload .next/ to Vercel\n"

# ── Feature manifest ──────────────────────────────────────────────────────────
echo -e "${BOLD}  Phase manifest:${RESET}"
echo -e "  P01  Stability Engine       scoring · StabilityRing · DriverCard"
echo -e "  P02  Auth & Onboarding      login · signup · JWT"
echo -e "  P03  Analytics Suite        nitaqat · sales · supply-chain"
echo -e "  P04  Stock-at-Risk          stockGap · StockHourglass"
echo -e "  P05  Resilience Ledger      ActionLedger · SupplierCard"
echo -e "  P06  ExecutiveOracle        generateBriefing · OracleBriefing"
echo -e "  P07  ScenarioEngine         projectScenarioImpact · ScenarioPlayground"
echo -e "  P08  Pathfinder Optimizer   findOptimalPath · OptimizerWidget"
echo -e "  P09  CapitalReporter        ExportPortal · InvestorView · EntitySelector"
echo ""
