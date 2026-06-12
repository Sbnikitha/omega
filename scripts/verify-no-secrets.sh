#!/usr/bin/env bash
# Fail if likely API keys appear in tracked git files.
set -euo pipefail
cd "$(dirname "$0")/.."

PATTERNS=(
  'sk-proj-[A-Za-z0-9]{20,}'
  'sk-lf-[a-f0-9-]{20,}'
  'AIzaSy[A-Za-z0-9_-]{30,}'
  'tgr_[A-Za-z0-9_-]{20,}'
  'pio_sk_[A-Za-z0-9_-]{20,}'
  'ak_[A-Za-z0-9]{10,}'
)

tracked="$(git ls-files)"
failed=0

for pattern in "${PATTERNS[@]}"; do
  if echo "$tracked" | xargs grep -lE "$pattern" 2>/dev/null; then
    echo "ERROR: pattern $pattern found in tracked files above"
    failed=1
  fi
done

if git ls-files --error-unmatch backend/.env web/.env.local 2>/dev/null; then
  echo "ERROR: env file is tracked by git — run: git rm --cached backend/.env web/.env.local"
  failed=1
fi

if [[ $failed -eq 0 ]]; then
  echo "OK: no secret patterns in tracked files; env files not tracked."
fi
exit $failed
