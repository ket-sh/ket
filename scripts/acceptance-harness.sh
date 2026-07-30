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

# Claude Code sends an absolute file_path, so every envelope here does too. A
# fixture written by hand is where a gate stops being tested against reality.
envelope() {
  printf '{"hook_event_name":"%s","tool_name":"Write","tool_input":{"file_path":"%s"}}' "$1" "$2"
}

absolute() {
  case "$1" in
  /*) echo "$1" ;;
  *) echo "$PROJECT/$1" ;;
  esac
}

# Sends a PreToolUse envelope for a write and prints whatever the gate answered.
judge() {
  envelope PreToolUse "$(absolute "$1")" | (cd "$PROJECT" && "$KET" gate write)
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
for name in feature explore approve status continue; do
  test -f "harness/commands/$name.md" || fail "the harness declares no /ket:$name command"
  grep -q '^description:' "harness/commands/$name.md" ||
    fail "/ket:$name has no description"
done
for name in triage researcher decomposer adr solution-design ui-design gherkin implementer reviewer qa; do
  test -f "harness/agents/$name.md" || fail "the harness declares no $name agent"
done
for name in tdd clean-code mutation gates commit gherkin adr progress; do
  test -f "harness/skills/$name/SKILL.md" || fail "the harness declares no /ket:$name skill"
  grep -q "^name: $name$" "harness/skills/$name/SKILL.md" ||
    fail "the $name skill does not name itself, so /ket:$name would not resolve"
  grep -q '^description:' "harness/skills/$name/SKILL.md" ||
    fail "the $name skill has no description, so Claude cannot tell when it applies"
done
# A subagent's tools list has no Skill tool, so a skill named in prose alone
# never reaches it. Pinning is what loads the content, and a pin that names a
# skill the harness does not ship loads nothing and says nothing.
pinned_skills() {
  awk '/^---$/ { fence++; next } fence == 1 && /^  - / { print $2 }' "$1"
}

echo "acceptance: every agent pins a model, and pins only skills the harness ships"
for agent in harness/agents/*.md; do
  grep -q '^model: ' "$agent" ||
    fail "$agent pins no model, so ket's model map is a claim nothing honours"
  for pinned in $(pinned_skills "$agent"); do
    test -f "harness/skills/$pinned/SKILL.md" ||
      fail "$agent pins the $pinned skill, and the harness ships no such skill"
  done
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

echo "acceptance: a repository ket never touched"
# Somebody may enable the harness at user scope, and then this gate fires in
# every project they open. Refusing where there is no ket directory would block
# every write in all of them, so an ungoverned repository is left alone.
answer="$(envelope PreToolUse "$SANDBOX/src/a.ts" | (cd "$SANDBOX" && "$KET" gate write))"
test -z "$answer" ||
  fail "the gate spoke in a repository with no ket directory, and it governs nothing there: $answer"
probed="$(envelope PostToolUse "$SANDBOX/src/a.ts" | (cd "$SANDBOX" && "$KET" gate probe))"
test -z "$probed" || fail "the probe gate ran a ring in a repository it does not govern: $probed"
CHECKED=$((CHECKED + 2))

echo "acceptance: a file the repository does not contain"
# An agent can be asked to write anywhere, and a path outside the repository is
# governed by nothing in it.
only_item OS-1 feature story triaged 'login with lockout'
answer="$(envelope PreToolUse "$SANDBOX/elsewhere/src/auth.ts" | (cd "$PROJECT" && "$KET" gate write))"
test -z "$answer" || fail "the gate judged a path outside the repository: $answer"
answer="$(envelope PreToolUse "${PROJECT}-legacy/src/auth.ts" | (cd "$PROJECT" && "$KET" gate write))"
test -z "$answer" || fail "the gate judged a sibling whose name starts the same way: $answer"
CHECKED=$((CHECKED + 2))

echo "acceptance: the same file, sent relative"
# A hook sends an absolute path and the rules are written against a relative one.
# Reading either as the other governs nothing at all, silently.
answer="$(envelope PreToolUse src/auth.ts | (cd "$PROJECT" && "$KET" gate write))"
echo "$answer" | grep -qF 'OS-1 is triaged, not implementing' ||
  fail "a relative path reached the gate ungoverned, gate said: ${answer:-nothing}"
CHECKED=$((CHECKED + 1))

echo "acceptance: a project reached through a symlink"
# Both /tmp on a mac and a symlinked checkout name the same file two ways, and a
# gate that compares the names rather than the files governs neither.
ln -sfn "$PROJECT" "$SANDBOX/by-link"
answer="$(envelope PreToolUse "$SANDBOX/by-link/src/auth.ts" | (cd "$PROJECT" && "$KET" gate write))"
echo "$answer" | grep -qF 'OS-1 is triaged, not implementing' ||
  fail "a path through a symlink reached the gate ungoverned, gate said: ${answer:-nothing}"
answer="$(envelope PreToolUse "$PROJECT/src/auth.ts" | (cd "$SANDBOX/by-link" && "$KET" gate write))"
echo "$answer" | grep -qF 'OS-1 is triaged, not implementing' ||
  fail "the gate run from a symlinked directory governed nothing, gate said: ${answer:-nothing}"
CHECKED=$((CHECKED + 2))

echo "acceptance: an envelope about no file at all"
answer="$(printf '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"bun test"}}' |
  (cd "$PROJECT" && "$KET" gate write))"
test -z "$answer" || fail "expected a bash envelope to be ignored, gate said: $answer"
CHECKED=$((CHECKED + 1))

echo "acceptance: ring one runs on the file that was written"
(cd "$PROJECT" && bun install >/dev/null 2>&1) || fail "the created project does not install"
clean="$(envelope PostToolUse "$PROJECT/src/commands/hello/greeting.ts" | (cd "$PROJECT" && "$KET" gate probe))"
test -z "$clean" || fail "expected a clean file to pass ring one, probe said: $clean"
CHECKED=$((CHECKED + 1))

printf 'const unused = 1;\n' >"$PROJECT/src/broken.ts"
dirty="$(envelope PostToolUse "$PROJECT/src/broken.ts" | (cd "$PROJECT" && "$KET" gate probe))"
echo "$dirty" | grep -q 'ring 1 found something' ||
  fail "expected ring one to report a lint failure, probe said: ${dirty:-nothing}"
echo "$dirty" | grep -q 'no-unused-vars' ||
  fail "expected ring one to name what the linter said"
echo "$dirty" | grep -q 'permissionDecision' &&
  fail "probe carried a decision, and a post-tool-use hook must never block"

# The whole claim of ring 1 is that its per-file check looks at one file. A check
# that dropped the path would lint the project and name broken.ts even while
# probing a clean one. The project-scoped checks in the same ring are expected to
# report it, so the assertion is about the linter alone.
elsewhere="$(envelope PostToolUse "$PROJECT/src/commands/hello/greeting.ts" | (cd "$PROJECT" && "$KET" gate probe))"
echo "$elsewhere" | grep -q 'oxlint' &&
  fail "the linter reported a file other than the written one, so it is not scoped to it"
rm "$PROJECT/src/broken.ts"
CHECKED=$((CHECKED + 4))

echo "acceptance: a written path never reaches a tool as a flag"
# The path comes from whatever asked for the write, so a file named --fix would
# otherwise arrive at the linter as the flag it looks like. Sent relative on
# purpose: an absolute path already begins with a slash, so this is the only
# shape where a name can pass for a flag.
smuggled="$(envelope PostToolUse '--not-a-flag' | (cd "$PROJECT" && "$KET" gate probe))"
echo "$smuggled" | grep -q 'not expected in this context' &&
  fail "a path starting with a dash reached the linter as an argument"
echo "$smuggled" | grep -q 'unknown argument' &&
  fail "a path starting with a dash reached the linter as an argument"
CHECKED=$((CHECKED + 1))

echo "acceptance: the harness runs ring one on every write"
grep -q 'ket gate probe' harness/hooks/hooks.json ||
  fail "the harness hooks never call the probe gate"
grep -q '"PostToolUse"' harness/hooks/hooks.json ||
  fail "the probe gate is not wired to a post-tool-use event"

echo "acceptance: every decision was recorded"
test -f "$PROJECT/.ket/events.jsonl" || fail "the gate recorded no events"
grep -q '"outcome":"refused"' "$PROJECT/.ket/events.jsonl" || fail "no refusal was recorded"
grep -q '"outcome":"allowed"' "$PROJECT/.ket/events.jsonl" || fail "no allowance was recorded"
grep -q '"item":"OS-1"' "$PROJECT/.ket/events.jsonl" || fail "no event named the item"
grep -q '"gate":"probe"' "$PROJECT/.ket/events.jsonl" || fail "the probe gate recorded nothing"
# A decision about a file the repository does not contain is not a decision it
# gets to record, and the log is what /ket:status and ket watch later read.
grep -q '"about":"\.\.' "$PROJECT/.ket/events.jsonl" &&
  fail "the gate recorded a decision about a file outside the repository"
CHECKED=$((CHECKED + 1))
while read -r line; do
  echo "$line" | grep -q '^{.*}$' || fail "a recorded line is not one json object: $line"
done <"$PROJECT/.ket/events.jsonl"

echo "acceptance: the events file stays out of the diff"
(cd "$PROJECT" && git check-ignore -q .ket/events.jsonl) ||
  fail "events.jsonl is not gitignored"

echo "acceptance: the hidden command stays hidden"
"$KET" --help 2>&1 | grep -q 'gate' && fail "gate is listed in the top level help"

echo "acceptance: $CHECKED gate decisions checked, all as specified"
