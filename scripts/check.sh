#!/usr/bin/env bash
# Load every mod through Herdr itself, then confirm the running app reports no
# errors. Needs the app; CI runs only `node --test` and scripts/verify.mjs.
set -euo pipefail

cd "$(dirname "$0")/.."

total=0
failed=0
for dir in mods/*/; do
  total=$((total + 1))
  if ! herdr-app check "${dir%/}"; then
    failed=$((failed + 1))
    echo "FAILED: herdr-app check ${dir%/}"
  fi
done

if ! status="$(herdr-app status)"; then
  echo "FAILED: herdr-app status"
  exit 1
fi

errors="$(printf '%s' "$status" | node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    let j;
    try {
      j = JSON.parse(s);
    } catch {
      console.log("unparseable status");
      process.exit(0);
    }
    process.stdout.write(JSON.stringify(j.errors ?? ["missing errors field"]));
  });
')"

if [ "$errors" != "[]" ]; then
  echo "FAILED: herdr-app status errors: $errors"
  exit 1
fi

if [ "$failed" -ne 0 ]; then
  echo "check.sh: FAILED ($((total - failed))/$total mods passed)"
  exit 1
fi
echo "check.sh: $total/$total mods passed, status errors: []"
