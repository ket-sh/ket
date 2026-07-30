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

# The preset declares its gates, so the list lives there rather than here. A gate
# typed into this script is a gate that can go missing from a created project
# without anything noticing, and the declared order is the order that catches a
# tool whose output another tool then reads.
declared_gates() {
  bun --cwd presets/cli --eval \
    'import { CLI_SEMANTICS } from "./src/semantics.ts";
     console.log(CLI_SEMANTICS.gates.map((declared) => declared.script).join(" "));'
}

for name in $(declared_gates) build; do
  gate "$name"
done

"$PROJECT/dist/app" hello | grep -qx "hello world" || fail "the example command does not greet"
"$PROJECT/dist/app" hello ada | grep -qx "hello ada" || fail "the example command ignores its argument"

echo "acceptance: a created project passes its own gate chain"
