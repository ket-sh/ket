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

# Every project gets a pipeline. Only the integrations it asked for arrive with
# it, and the config records the answer so the harness can read it later.
echo "acceptance: what a project asked for, and nothing else"
test -f "$PROJECT/.github/workflows/ci.yml" || fail "a created project has no pipeline"
for absent in codeql.yml coverage.yml; do
  test -f "$PROJECT/.github/workflows/$absent" &&
    fail "$absent arrived in a project that asked for no integration"
done
test -f "$PROJECT/.coderabbit.yaml" &&
  fail "a review config arrived in a project that asked for no integration"
grep -q 'integrations: \[\]' "$PROJECT/.ket/config.ts" ||
  fail "the config does not record that no integration was chosen"

WITH="$SANDBOX/with-everything"
(cd "$SANDBOX" && "$KET" create with-everything --with codecov,codeql,coderabbit >/dev/null) ||
  fail "create refused the integrations the cli preset offers"
for expected in ci.yml codeql.yml coverage.yml; do
  test -f "$WITH/.github/workflows/$expected" || fail "$expected was asked for and never written"
done
test -f "$WITH/.coderabbit.yaml" || fail "the review config was asked for and never written"
grep -q "integrations: \['codecov', 'codeql', 'coderabbit'\]" "$WITH/.ket/config.ts" ||
  fail "the config does not record which integrations were chosen"

(cd "$SANDBOX" && "$KET" create unoffered --with chromatic >/dev/null 2>&1) &&
  fail "create accepted an integration the cli preset does not offer"

echo "acceptance: every workflow a project gets is one github can run"
mise exec -- actionlint "$WITH/.github/workflows/"*.yml ||
  fail "a generated workflow does not parse"
