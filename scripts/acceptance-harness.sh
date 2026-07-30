#!/usr/bin/env bash
set -euo pipefail

# Drives the compiled binary with real hook envelopes against a real created
# project. Nothing here reasons about the JSON contract; every assertion reads
# what the binary actually wrote.

KET="$PWD/packages/cli/dist/ket"
SANDBOX="$(mktemp -d)"
PROJECT="$SANDBOX/order-service"
CHECKED=0

cleanup() {
  rm -rf "$SANDBOX"
}
trap cleanup EXIT

fail() {
  echo "acceptance: $1" >&2
  exit 1
}

# Sends a PreToolUse envelope for a write and prints whatever the gate answered.
judge() {
  printf '{"hook_event_name":"PreToolUse","tool_name":"Write","tool_input":{"file_path":"%s"}}' \
    "$1" | (cd "$PROJECT" && "$KET" gate write)
}

item() {
  mkdir -p "$PROJECT/.ket/items/$1"
  printf 'title: %s\nkind: %s\nsize: %s\nstatus: %s\nchildren: []\n' \
    "$5" "$2" "$3" "$4" >"$PROJECT/.ket/items/$1/item.yaml"
}

only_item() {
  rm -rf "$PROJECT/.ket/items"
  mkdir -p "$PROJECT/.ket/items"
  item "$@"
}

allows() {
  local answer
  answer="$(judge "$1")"

  test -z "$answer" || fail "expected $1 to be allowed, gate said: $answer"
  CHECKED=$((CHECKED + 1))
}

refuses() {
  local answer
  answer="$(judge "$1")"

  echo "$answer" | grep -q '"permissionDecision":"deny"' ||
    fail "expected $1 to be refused, gate said: ${answer:-nothing}"
  echo "$answer" | grep -qF "$2" ||
    fail "expected the refusal of $1 to say '$2', gate said: $answer"
  CHECKED=$((CHECKED + 1))
}

bun run --cwd packages/cli build >/dev/null || fail "the binary does not build"

(cd "$SANDBOX" && "$KET" create order-service >/dev/null) || fail "create did not finish"

test -f "$PROJECT/.ket/config.ts" || fail "create wrote no ket config"

echo "acceptance: create registered the harness"
grep -q '"ket@ket": true' "$PROJECT/.claude/settings.json" ||
  fail "create did not enable the harness plugin"
grep -q '"repo": "ket-sh/ket"' "$PROJECT/.claude/settings.json" ||
  fail "create did not register the marketplace the harness ships from"

echo "acceptance: the harness ships what it declares"
for name in feature approve status continue; do
  test -f "harness/commands/$name.md" || fail "the harness declares no /ket:$name command"
done
for name in triage researcher decomposer adr solution-design ui-design gherkin implementer reviewer qa; do
  test -f "harness/agents/$name.md" || fail "the harness declares no $name agent"
done
grep -q 'ket gate write' harness/hooks/hooks.json ||
  fail "the harness hooks call no write gate"
grep -q '"source": "./harness"' .claude-plugin/marketplace.json ||
  fail "the marketplace does not point at the harness"

echo "acceptance: the whole loop, through the binary only"
(cd "$PROJECT" && rm -rf .ket/items && mkdir -p .ket/items)
filed="$(cd "$PROJECT" && "$KET" item file --title 'login with lockout' --kind feature --size story)"
test "$filed" = "OS-1" || fail "expected the first item to be OS-1, got: $filed"
grep -q 'status: triaged' "$PROJECT/.ket/items/OS-1/item.yaml" ||
  fail "a filed item does not start triaged"
refuses src/auth.ts 'OS-1 is triaged, not implementing'
refuses .ket/items/OS-1/item.yaml 'only a gate writes one'
(cd "$PROJECT" && "$KET" item approve OS-1 >/dev/null) || fail "approve refused a triaged item"
grep -q 'status: implementing' "$PROJECT/.ket/items/OS-1/item.yaml" ||
  fail "approve did not move the status"
allows src/auth.ts
(cd "$PROJECT" && "$KET" item approve OS-1 >/dev/null 2>&1) &&
  fail "approve accepted an item already implementing"
CHECKED=$((CHECKED + 1))

echo "acceptance: a second item takes the next key"
second="$(cd "$PROJECT" && "$KET" item file --title 'logout' --kind chore --size trivial)"
test "$second" = "OS-2" || fail "expected the second item to be OS-2, got: $second"

echo "acceptance: a classification the command refuses outright"
(cd "$PROJECT" && "$KET" item file --title 'x' --kind poem --size story >/dev/null 2>&1) &&
  fail "file accepted a kind the pipeline does not name"
(cd "$PROJECT" && "$KET" item file --title 'x' --kind feature --size huge >/dev/null 2>&1) &&
  fail "file accepted a size the matrix does not name"
CHECKED=$((CHECKED + 2))

echo "acceptance: approving something that is not there"
(cd "$PROJECT" && "$KET" item approve OS-99 >/dev/null 2>&1) &&
  fail "approve accepted a key with no item"
CHECKED=$((CHECKED + 1))

echo "acceptance: nothing in flight"
rm -rf "$PROJECT/.ket/items"
mkdir -p "$PROJECT/.ket/items"
allows src/auth.ts
allows src/commands/hello/command.ts

echo "acceptance: the approve gate"
only_item OS-1 feature story triaged 'login with lockout'
refuses src/auth.ts 'OS-1 is triaged, not implementing'
for status in designing awaiting-approval verifying; do
  only_item OS-1 feature story "$status" 'login with lockout'
  refuses src/auth.ts "OS-1 is $status, not implementing"
done
only_item OS-1 feature story implementing 'login with lockout'
allows src/auth.ts

echo "acceptance: a classification the change contradicts"
only_item OS-1 feature trivial implementing 'rename a variable'
refuses src/commands/hello/command.ts 'It was never trivial'
allows src/greeting.ts
only_item OS-1 refactor story implementing 'extract the reader'
refuses src/features/login.feature 'A changed scenario makes it a feature'
allows src/auth.ts

echo "acceptance: a size and kind that owe nothing"
only_item OS-1 feature story implementing 'login with lockout'
allows src/commands/hello/command.ts
allows src/features/login.feature

echo "acceptance: paths no target governs"
only_item OS-1 feature story triaged 'login with lockout'
allows README.md
allows package.json
allows src-legacy/auth.ts

echo "acceptance: settled items do not govern"
for status in idea shipped; do
  only_item OS-1 feature story "$status" 'login with lockout'
  allows src/auth.ts
done

echo "acceptance: one job means one branch"
only_item OS-1 feature story implementing 'login with lockout'
item OS-2 feature story implementing 'logout'
refuses src/auth.ts 'One job means one branch'

echo "acceptance: an item it cannot read never waves a write through"
rm -rf "$PROJECT/.ket/items"
mkdir -p "$PROJECT/.ket/items/OS-1"
printf 'nonsense\n' >"$PROJECT/.ket/items/OS-1/item.yaml"
allows src/auth.ts
printf 'title: t\nkind: feature\nsize: story\nstatus: halfway\nchildren: []\n' \
  >"$PROJECT/.ket/items/OS-1/item.yaml"
allows src/auth.ts

echo "acceptance: outside a ket repository"
answer="$(printf '{"hook_event_name":"PreToolUse","tool_name":"Write","tool_input":{"file_path":"src/a.ts"}}' |
  (cd "$SANDBOX" && "$KET" gate write))"
echo "$answer" | grep -q 'nothing governs' || fail "expected a refusal naming the missing ket directory"
CHECKED=$((CHECKED + 1))

echo "acceptance: an envelope about no file at all"
answer="$(printf '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"bun test"}}' |
  (cd "$PROJECT" && "$KET" gate write))"
test -z "$answer" || fail "expected a bash envelope to be ignored, gate said: $answer"
CHECKED=$((CHECKED + 1))

echo "acceptance: every decision was recorded"
test -f "$PROJECT/.ket/events.jsonl" || fail "the gate recorded no events"
grep -q '"outcome":"refused"' "$PROJECT/.ket/events.jsonl" || fail "no refusal was recorded"
grep -q '"outcome":"allowed"' "$PROJECT/.ket/events.jsonl" || fail "no allowance was recorded"
grep -q '"item":"OS-1"' "$PROJECT/.ket/events.jsonl" || fail "no event named the item"
while read -r line; do
  echo "$line" | grep -q '^{.*}$' || fail "a recorded line is not one json object: $line"
done <"$PROJECT/.ket/events.jsonl"

echo "acceptance: the events file stays out of the diff"
(cd "$PROJECT" && git check-ignore -q .ket/events.jsonl) ||
  fail "events.jsonl is not gitignored"

echo "acceptance: the hidden command stays hidden"
"$KET" --help 2>&1 | grep -q 'gate' && fail "gate is listed in the top level help"

echo "acceptance: $CHECKED gate decisions checked, all as specified"
