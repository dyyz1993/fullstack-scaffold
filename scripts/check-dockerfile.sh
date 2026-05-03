#!/bin/bash
cd "$(dirname "$0")/.."
DOCKERFILE="Dockerfile"

errors=0

# Check 1: drizzle/ is copied
if ! grep -q "drizzle" "$DOCKERFILE"; then
  echo "FAIL: drizzle/ directory not copied in Dockerfile"
  errors=$((errors + 1))
else
  echo "PASS: drizzle/ is copied"
fi

# Check 2: Non-root user
if ! grep -q "^USER " "$DOCKERFILE"; then
  echo "FAIL: No USER directive (container runs as root)"
  errors=$((errors + 1))
else
  echo "PASS: Non-root user configured"
fi

# Check 3: Healthcheck uses wget (Alpine native) not curl
if grep -q "curl" "$DOCKERFILE"; then
  echo "FAIL: Healthcheck uses curl, should use wget for Alpine"
  errors=$((errors + 1))
else
  echo "PASS: Healthcheck does not use curl"
fi

if [ $errors -gt 0 ]; then
  echo ""
  echo "FAILED: $errors check(s) failed"
  exit 1
fi

echo ""
echo "ALL CHECKS PASSED"
exit 0
