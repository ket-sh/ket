#!/usr/bin/env bash
set -euo pipefail

KET="$PWD/packages/cli/dist/ket"
SANDBOX="$(mktemp -d)"
PROJECT="$SANDBOX/order-service"

cleanup() {
  rm -rf "$SANDBOX"
}
trap cleanup EXIT

fail() {
  echo "acceptance: $1" >&2
  exit 1
}

gate() {
  (cd "$PROJECT" && bun run "$1" >"$SANDBOX/$1.log" 2>&1) || {
    tail -20 "$SANDBOX/$1.log" >&2
    fail "a created project fails its own $1"
  }
}

bun run --cwd packages/cli build >/dev/null || fail "the binary does not build"

(cd "$SANDBOX" && "$KET" create order-service >/dev/null) || fail "create did not finish"

test -f "$PROJECT/package.json" || fail "no manifest was written"
test -f "$PROJECT/src/run.ts" || fail "no source was written"
test -d "$PROJECT/.git" || fail "no repository was initialized"

grep -q '"name": "order-service"' "$PROJECT/package.json" ||
  fail "the manifest is not named after the directory"

(cd "$PROJECT" && bun install >"$SANDBOX/install.log" 2>&1) || {
  tail -20 "$SANDBOX/install.log" >&2
  fail "the manifest does not resolve"
}

for name in check-types lint fmt:check lint:dead lint:dup lint:boundaries test test:mutation build; do
  gate "$name"
done

"$PROJECT/dist/app" hello | grep -qx "hello world" || fail "the example command does not greet"
"$PROJECT/dist/app" hello ada | grep -qx "hello ada" || fail "the example command ignores its argument"

echo "acceptance: a created project passes its own gate chain"
