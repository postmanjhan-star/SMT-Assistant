#!/usr/bin/env bash
# check-kpi.sh — Architecture KPI regression guard
# Run: bash scripts/check-kpi.sh
# Exit 1 if any KPI regresses beyond the stored threshold.
#
# Update thresholds here whenever a PR intentionally lowers a limit:
#   PHASE1_WHITELIST_MAX   — Phase-1 whitelist count must not increase
#   LARGE_FILES_MAX        — files >500 lines in src/ must not increase
#   UNIT_SPEC_MIN          — unit spec count must not decrease
#   E2E_SPEC_MIN           — e2e spec count must not decrease

set -euo pipefail

PHASE1_WHITELIST_MAX=30
LARGE_FILES_MAX=8
UNIT_SPEC_MIN=22
E2E_SPEC_MIN=8
LINE_THRESHOLD=500

PASS=0
FAIL=1
exit_code=0

# ── helpers ──────────────────────────────────────────────────────────────────

check_max() {
  local label="$1" actual="$2" max="$3"
  if [ "$actual" -le "$max" ]; then
    printf "  %-30s %3d / %-3d  ✓\n" "$label" "$actual" "$max"
  else
    printf "  %-30s %3d / %-3d  [FAIL] exceeded max %d\n" "$label" "$actual" "$max" "$max"
    exit_code=1
  fi
}

check_min() {
  local label="$1" actual="$2" min="$3"
  if [ "$actual" -ge "$min" ]; then
    printf "  %-30s %3d / %-3d  ✓\n" "$label" "$actual" "$min"
  else
    printf "  %-30s %3d / %-3d  [FAIL] below min %d\n" "$label" "$actual" "$min" "$min"
    exit_code=1
  fi
}

# ── counts ───────────────────────────────────────────────────────────────────

# Phase-1 whitelist: eslint-disable lines tagged with "Phase-1 whitelist"
phase1_count=$(grep -r "Phase-1 whitelist" src/ 2>/dev/null | wc -l | tr -d ' ')

# Files >500 lines in src/ (*.ts and *.vue, exclude node_modules)
large_files_count=$(
  find src/ \( -name "*.ts" -o -name "*.vue" \) -print0 \
    | xargs -0 wc -l 2>/dev/null \
    | awk -v t="$LINE_THRESHOLD" '$1 > t && $2 != "total" { count++ } END { print count+0 }'
)

# Unit spec files
unit_spec_count=$(find tests/unit -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')

# E2E spec files
e2e_spec_count=$(find tests/e2e -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')

# ── report ───────────────────────────────────────────────────────────────────

echo ""
echo "=== Architecture KPI Report ==="
echo ""
check_max "Phase-1 whitelist"   "$phase1_count"    "$PHASE1_WHITELIST_MAX"
check_max "Files >500 lines"    "$large_files_count" "$LARGE_FILES_MAX"
check_min "Unit spec files"     "$unit_spec_count"  "$UNIT_SPEC_MIN"
check_min "E2E spec files"      "$e2e_spec_count"   "$E2E_SPEC_MIN"
echo ""

if [ "$exit_code" -eq 0 ]; then
  echo "All KPI checks passed."
else
  echo "One or more KPI checks failed. Fix regressions before merging."
fi

echo ""
exit "$exit_code"
