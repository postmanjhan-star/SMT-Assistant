#!/usr/bin/env bash
# check-behavior-contract.sh — Behavior Contract guard
# Verifies that all test files referenced by B1–B7 exist.
# Exit 1 if any file is missing.
#
# When BEHAVIOR_CONTRACT.md is updated to reference new test files,
# add/remove entries in the REQUIRED_TESTS array below.

set -euo pipefail

# B1–B7 test files (relative to project root)
REQUIRED_TESTS=(
  # B1: Panasonic 換料流程
  "tests/e2e/panasonic-assistant-detail-page.spec.ts"

  # B2: Fuji 換料流程
  "tests/e2e/fuji-mounter-production.spec.ts"
  "tests/e2e/fuji-assistant-detail-page.spec.ts"

  # B3: 卸料（Unload）流程 — state machine 覆蓋（Phase 4 重構後）
  "tests/unit/domain/mounter/operationModeStateMachine.spec.ts"
  "tests/unit/ui/shared/useOperationModeStateMachine.spec.ts"
  "tests/unit/ui/shared/fuji/useFujiOperationFlows.spec.ts"

  # B4: IPQC 流程
  "tests/e2e/fuji-assistant-detail-page.spec.ts"
  "tests/e2e/panasonic-assistant-detail-page.spec.ts"
  "tests/unit/ui/shared/composables/useMounterOperationFlowsCore.spec.ts"

  # B5: 後段上料（PostProductionFeed）
  "tests/unit/application/post-production-feed/PostProductionFeedUseCase.spec.ts"
  "tests/unit/application/post-production-feed/FujiPostProductionRecordUploader.spec.ts"
  "tests/unit/application/post-production-feed/PostProductionRecordUploader.spec.ts"
  "tests/e2e/post-production-feed.spec.ts"

  # B6: 料號查詢與驗證
  "tests/unit/ui/shared/composables/useMaterialQueryState.spec.ts"
  "tests/unit/domain/material/BarcodeScanRules.spec.ts"

  # B7: 路由守衛（Panasonic Route Guards）
  "tests/unit/router/panasonicRouteGuards.spec.ts"
  "tests/e2e/panasonic-route-guards.spec.ts"
)

# Deduplicate (B4 reuses B2 e2e files)
UNIQUE_TESTS=($(printf '%s\n' "${REQUIRED_TESTS[@]}" | sort -u))

exit_code=0
missing=()

echo ""
echo "=== Behavior Contract Guard (B1–B7) ==="
echo ""

for f in "${UNIQUE_TESTS[@]}"; do
  if [ -f "$f" ]; then
    echo "  ✓  $f"
  else
    echo "  [MISSING]  $f"
    missing+=("$f")
    exit_code=1
  fi
done

echo ""

if [ "$exit_code" -eq 0 ]; then
  echo "All B1–B7 test files present."
else
  echo "Missing test files detected. Update BEHAVIOR_CONTRACT.md or restore the missing files."
  echo "Missing:"
  for f in "${missing[@]}"; do
    echo "  - $f"
  done
fi

echo ""
exit "$exit_code"
