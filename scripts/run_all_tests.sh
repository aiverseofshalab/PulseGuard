#!/usr/bin/env bash
# PulseGuard — Master Automated Test & Verification Suite
# Executes full frontend build/typecheck and backend pytest suite.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "================================================================="
echo "        PULSEGUARD AUTOMATED SYSTEM VERIFICATION SUITE           "
echo "================================================================="
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Project Root: $PROJECT_ROOT"
echo ""

# 1. Verify Deep Learning Artifacts
echo "[1/4] Checking Deep Learning Model Artifacts..."
DL_ARTIFACTS=(
  "backend/app/ml/artifacts/cae_fan_model.pt"
  "backend/app/ml/artifacts/knn_reference_bank.pkl"
  "backend/app/ml/artifacts/calibrated_thresholds.json"
)

for artifact in "${DL_ARTIFACTS[@]}"; do
  if [ ! -f "$artifact" ]; then
    echo "  [ERROR] Required artifact missing: $artifact"
    exit 1
  fi
  echo "  ✓ Found $artifact ($(ls -lh "$artifact" | awk '{print $5}'))"
done

# 2. Verify Dataset Integrity
echo ""
echo "[2/4] Checking MIMII Audio Dataset Splits..."
DATA_DIRS=(
  "data/mimii_fan/train_normal"
  "data/mimii_fan/val_normal"
  "data/mimii_fan/test_normal"
  "data/mimii_fan/test_anomaly_bearing"
  "data/mimii_fan/test_anomaly_rattling"
  "data/mimii_fan/test_anomaly_unbalance"
)

for d in "${DATA_DIRS[@]}"; do
  if [ ! -d "$d" ]; then
    echo "  [ERROR] Dataset split missing: $d"
    exit 1
  fi
  COUNT=$(ls "$d" | wc -l | tr -d ' ')
  echo "  ✓ $d ($COUNT WAV files)"
done

# 3. Frontend Build & TypeScript Validation
echo ""
echo "[3/4] Running Frontend TypeScript Verification and Production Build..."
cd "$PROJECT_ROOT/frontend"
npm run build
cd "$PROJECT_ROOT"
echo "  ✓ Frontend build passed with zero compilation errors."

# 4. Backend Pytest Suite
echo ""
echo "[4/4] Running Backend Pytest Suite (API, ML, Audio, Telemetry)..."
PYTHONPATH="$PROJECT_ROOT" python3 -m pytest backend/tests -v --durations=5

echo ""
echo "================================================================="
echo "  ✓ ALL PULSEGUARD SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY "
echo "================================================================="
