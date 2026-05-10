#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SERVICES=(
  "ai_services/ai_design_generation_visualization"
  "ai_services/ai_chatbot"
  "user_services"
  "product_services"
  "inventory_services"
  "order_services"
  "payment_services"
  "notification_services"
)

PASSED=()
FAILED=()
SKIPPED=()

echo "Running backend test suites from: ${ROOT_DIR}"
echo "------------------------------------------------------------"

for service in "${SERVICES[@]}"; do
  SERVICE_PATH="${ROOT_DIR}/${service}"
  echo
  echo ">>> ${service}"

  if [[ ! -d "${SERVICE_PATH}" ]]; then
    echo "    [SKIP] Service directory not found"
    SKIPPED+=("${service} (missing directory)")
    continue
  fi

  if [[ ! -d "${SERVICE_PATH}/tests" ]]; then
    echo "    [SKIP] No tests directory"
    SKIPPED+=("${service} (no tests directory)")
    continue
  fi

  if ! compgen -G "${SERVICE_PATH}/tests/test_*.py" > /dev/null; then
    echo "    [SKIP] No test_*.py files"
    SKIPPED+=("${service} (no test files)")
    continue
  fi

  cd "${SERVICE_PATH}" || exit 1
    # Use a dedicated test venv path to avoid locked/broken existing .venv state.
    export UV_PROJECT_ENVIRONMENT=".venv-tests"
    # Ensure pytest exists even when not declared in project dependencies.
    uv run --with pytest pytest -q

  EXIT_CODE=$?

  if [[ ${EXIT_CODE} -eq 0 ]]; then
    echo "    [PASS] ${service}"
    PASSED+=("${service}")
  else
    echo "    [FAIL] ${service} (exit ${EXIT_CODE})"
    FAILED+=("${service} (exit ${EXIT_CODE})")
  fi
done

echo
echo "===================== TEST SUMMARY ====================="
echo "Passed : ${#PASSED[@]}"
echo "Failed : ${#FAILED[@]}"
echo "Skipped: ${#SKIPPED[@]}"

if [[ ${#PASSED[@]} -gt 0 ]]; then
  echo
  echo "Passed services:"
  for item in "${PASSED[@]}"; do
    echo "  - ${item}"
  done
fi

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo
  echo "Failed services:"
  for item in "${FAILED[@]}"; do
    echo "  - ${item}"
  done
fi

if [[ ${#SKIPPED[@]} -gt 0 ]]; then
  echo
  echo "Skipped services:"
  for item in "${SKIPPED[@]}"; do
    echo "  - ${item}"
  done
fi

echo "========================================================"

if [[ ${#FAILED[@]} -gt 0 ]]; then
  exit 1
fi

exit 0
