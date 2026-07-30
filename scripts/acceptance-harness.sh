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

parent_item() {
  local key=$1 kind=$2 size=$3 status=$4 title=$5
  shift 5

  mkdir -p "$PROJECT/.ket/items/$key"
  {
    printf 'title: %s\nkind: %s\nsize: %s\nstatus: %s\nchildren:\n' \
      "$title" "$kind" "$size" "$status"
    for child in "$@"; do
      printf '  - %s\n' "$child"
    done
  } >"$PROJECT/.ket/items/$key/item.yaml"
}

child_item() {
  local key=$1 kind=$2 size=$3 status=$4 title=$5 parent=$6

  mkdir -p "$PROJECT/.ket/items/$key"
  printf 'title: %s\nkind: %s\nsize: %s\nstatus: %s\nparent: %s\nchildren: []\n' \
    "$title" "$kind" "$size" "$status" "$parent" >"$PROJECT/.ket/items/$key/item.yaml"
}

ket() {
  (cd "$PROJECT" && "$KET" "$@")
}

# Kept out of a command substitution: a failure inside one is swallowed, and the
# count of decisions would not survive the subshell.
refuses_command() {
  local expected=$1
  local said
  shift

  said="$(ket "$@" 2>&1)" && fail "expected 'ket $*' to be refused, it printed: $said"
  echo "$said" | grep -qF "$expected" ||
    fail "expected 'ket $*' to be refused with '$expected', it said: ${said:-nothing}"
  CHECKED=$((CHECKED + 1))
}

status_is() {
  grep -q "^status: $2$" "$PROJECT/.ket/items/$1/item.yaml" ||
    fail "expected $1 to be $2, it is: $(grep '^status:' "$PROJECT/.ket/items/$1/item.yaml")"
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
for name in feature explore approve status continue review; do
  test -f "harness/commands/$name.md" || fail "the harness declares no /ket:$name command"
  grep -q '^description:' "harness/commands/$name.md" ||
    fail "/ket:$name has no description"
done
for name in triage researcher decomposer adr solution-design ui-design gherkin implementer reviewer qa; do
  test -f "harness/agents/$name.md" || fail "the harness declares no $name agent"
done
# The list of skills used to be typed in here, and a skill missing from it
# shipped unchecked. The directory is the authority, so a new skill is held to
# the same two rules on the day it lands.
shipped=0
for skill in harness/skills/*/SKILL.md; do
  test -f "$skill" ||
    fail "the harness skills directory holds nothing, so this loop reads no skill at all"
  name="$(basename "$(dirname "$skill")")"
  grep -q "^name: $name$" "$skill" ||
    fail "the $name skill does not name itself, so /ket:$name would not resolve"
  grep -q '^description:' "$skill" ||
    fail "the $name skill has no description, so Claude cannot tell when it applies"
  shipped=$((shipped + 1))
done
echo "acceptance: $shipped skills name themselves and say when they apply"
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

echo "acceptance: the review runs as a pair with a judge, not as one seat"
# A grep for the guard's wording proves only that the sentence survived. These
# read the seat table itself, because the defect that matters is two seats
# quietly landing on one model while the sentence about it still reads fine.
seat_rows() {
  awk '/^## 1\./ { inside = 1; next }
       inside && /^## / { inside = 0 }
       inside && /^\| / && $0 !~ /^\| *Seat/ && $0 !~ /^\| *-/ { print }' harness/commands/review.md
}

seat_column() {
  seat_rows | awk -F'|' -v at="$1" '{ gsub(/^ +| +$/, "", $at); print $at }'
}

distinct() {
  seat_column "$1" | sort -u | wc -l | tr -d ' '
}

test "$(seat_rows | wc -l | tr -d ' ')" -eq 2 ||
  fail "/ket:review declares $(seat_rows | wc -l | tr -d ' ') of the two seats a pair needs"
test "$(distinct 2)" -eq 2 ||
  fail "/ket:review gives its two seats one label, so the join cannot tell them apart"
test "$(distinct 3)" -eq 2 ||
  fail "/ket:review runs its two seats on one model, so the pair is a self-review"
test "$(distinct 4)" -eq 2 ||
  fail "/ket:review gives its two seats one lens, so the pair looks at one thing twice"
grep -q 'differ in model and in lens' harness/commands/review.md ||
  fail "/ket:review lets two seats share a model or a lens, so the pair is one opinion"
grep -q 'maximum effort' harness/commands/review.md ||
  fail "/ket:review sends a dispute to no judge at maximum effort"
grep -q 'They disagree' harness/commands/review.md ||
  fail "/ket:review judges more than what the seats dispute, or nothing at all"
grep -q 'location and its defect' harness/commands/review.md ||
  fail "/ket:review names no key, so the two reports cannot join"
grep -qi 'reproduce' harness/commands/review.md ||
  fail "/ket:review drops nothing for failing to reproduce"
grep -q 'one seat of a pair' harness/agents/reviewer.md ||
  fail "the reviewer agent does not say it is one seat, so it reports as the whole review"
grep -q 'findings' harness/agents/reviewer.md ||
  fail "the reviewer agent follows no findings doctrine"
grep -q 'Reproduce or drop' harness/skills/findings/SKILL.md ||
  fail "the findings skill carries no reproduce-or-drop rule"
grep -q '80' harness/skills/findings/SKILL.md ||
  fail "the findings skill sets no confidence bar"

echo "acceptance: the whole loop, through the binary only"
(cd "$PROJECT" && rm -rf .ket/items && mkdir -p .ket/items)
filed="$(ket item file --title 'login with lockout' --kind feature --size story)"
test "$filed" = "OS-1" || fail "expected the first item to be OS-1, got: $filed"
status_is OS-1 triaged
refuses src/auth.ts 'OS-1 is triaged, not implementing'
refuses .ket/items/OS-1/item.yaml 'only a gate writes one'
refuses_command 'story work does not skip design' item approve OS-1
status_is OS-1 triaged
ket item design OS-1 >/dev/null || fail "design refused a triaged story"
status_is OS-1 designing
refuses src/auth.ts 'OS-1 is designing, not implementing'
ket item submit OS-1 >/dev/null || fail "submit refused a designing item"
status_is OS-1 awaiting-approval
refuses src/auth.ts 'OS-1 is awaiting-approval, not implementing'
ket item approve OS-1 >/dev/null || fail "approve refused a submitted item"
status_is OS-1 implementing
allows src/auth.ts
refuses_command 'already implementing' item approve OS-1

echo "acceptance: a second item takes the next key"
second="$(cd "$PROJECT" && "$KET" item file --title 'logout' --kind chore --size trivial)"
test "$second" = "OS-2" || fail "expected the second item to be OS-2, got: $second"

echo "acceptance: a title that tries to write a field of its own"
# A field is one per line, so a title carrying a break writes a second field. A
# forged status above the real one would let source through with no approval.
forged="$(printf 'authentication\nstatus: implementing')"
(cd "$PROJECT" && "$KET" item file --title "$forged" --kind feature --size story >/dev/null 2>&1) &&
  fail "file accepted a title carrying a line break, which forges a status"
(cd "$PROJECT" && "$KET" item file --title '' --kind feature --size story >/dev/null 2>&1) &&
  fail "file accepted an item nobody can name"
CHECKED=$((CHECKED + 2))

echo "acceptance: a classification the command refuses outright"
refuses_command 'poem is not one of feature, bug, refactor, chore' \
  item file --title 'x' --kind poem --size story
refuses_command 'huge is not one of epic, story, subtask, trivial' \
  item file --title 'x' --kind feature --size huge

echo "acceptance: approving something that is not there"
refuses_command 'OS-99 has no item this repository can read' item approve OS-99
refuses_command 'OS-99 has no item this repository can read' item design OS-99
refuses_command 'OS-99 has no item this repository can read' item submit OS-99

echo "acceptance: work small enough that design would be ceremony"
for size in trivial subtask; do
  only_item OS-1 chore "$size" triaged 'rename a variable'
  ket item approve OS-1 >/dev/null || fail "approve refused a triaged $size, which owes no design"
  status_is OS-1 implementing
  CHECKED=$((CHECKED + 1))
done
for size in story epic; do
  only_item OS-1 feature "$size" triaged 'authentication'
  refuses_command "$size work does not skip design" item approve OS-1
  status_is OS-1 triaged
done

echo "acceptance: a stage that runs out of order"
only_item OS-1 feature story triaged 'login with lockout'
refuses_command 'not designed yet, so design runs first' item submit OS-1
status_is OS-1 triaged
only_item OS-1 feature story designing 'login with lockout'
refuses_command 'already designing' item design OS-1
only_item OS-1 feature story awaiting-approval 'login with lockout'
refuses_command 'already designed, so approval comes next' item design OS-1
refuses_command 'already awaiting approval' item submit OS-1
only_item OS-1 feature story implementing 'login with lockout'
refuses_command 'already implementing' item design OS-1
only_item OS-1 feature story shipped 'login with lockout'
refuses_command 'already shipped' item submit OS-1
only_item OS-1 feature story idea 'login with lockout'
refuses_command 'still an idea, so triage runs first' item design OS-1

echo "acceptance: an epic breaks into the work it is made of"
only_item OS-1 feature epic designing 'authentication'
child="$(ket item file --parent OS-1 --title 'lock an account' --kind feature --size story)"
test "$child" = "OS-2" || fail "expected the child to be OS-2, got: $child"
grep -q '^parent: OS-1$' "$PROJECT/.ket/items/OS-2/item.yaml" ||
  fail "the child names no epic it broke out of"
grep -q '^  - OS-2$' "$PROJECT/.ket/items/OS-1/item.yaml" ||
  fail "the epic lists no child it fanned out into"
status_is OS-2 triaged
status_is OS-1 designing
CHECKED=$((CHECKED + 1))

second="$(ket item file --parent OS-1 --title 'unlock it' --kind chore --size subtask)"
test "$second" = "OS-3" || fail "expected the second child to be OS-3, got: $second"
test "$(grep -c '^  - ' "$PROJECT/.ket/items/OS-1/item.yaml")" = "2" ||
  fail "the epic dropped a child when it took another"
grep -q '^  - OS-2$' "$PROJECT/.ket/items/OS-1/item.yaml" ||
  fail "the epic lost the child it already had"
CHECKED=$((CHECKED + 1))

echo "acceptance: a story takes children of its own"
only_item OS-1 feature story designing 'login with lockout'
ket item file --parent OS-1 --title 'hash the password' --kind chore --size trivial >/dev/null ||
  fail "a story refused a trivial child, and a story holds children"
grep -q '^parent: OS-1$' "$PROJECT/.ket/items/OS-2/item.yaml" ||
  fail "the child of a story names no parent"
CHECKED=$((CHECKED + 1))

echo "acceptance: the link survives every stage the child moves through"
only_item OS-1 feature epic designing 'authentication'
ket item file --parent OS-1 --title 'lock an account' --kind feature --size story >/dev/null
for stage in design submit approve; do
  ket item "$stage" OS-2 >/dev/null || fail "$stage refused the child of an epic"
  grep -q '^parent: OS-1$' "$PROJECT/.ket/items/OS-2/item.yaml" ||
    fail "$stage dropped the epic the child broke out of"
  CHECKED=$((CHECKED + 1))
done
status_is OS-2 implementing

echo "acceptance: a link that would make the tree meaningless"
only_item OS-1 feature epic designing 'authentication'
refuses_command 'OS-99 has no item this repository can read' \
  item file --parent OS-99 --title x --kind feature --size story
refuses_command 'a child of size epic is no smaller than the epic OS-1' \
  item file --parent OS-1 --title x --kind feature --size epic
only_item OS-1 feature story designing 'login with lockout'
refuses_command 'a child of size story is no smaller than the story OS-1' \
  item file --parent OS-1 --title x --kind feature --size story
for size in subtask trivial; do
  only_item OS-1 chore "$size" designing 'rename a variable'
  refuses_command "OS-1 is sized $size, and only an epic or a story holds children" \
    item file --parent OS-1 --title x --kind chore --size trivial
done

echo "acceptance: a link it refuses leaves nothing behind"
only_item OS-1 feature epic designing 'authentication'
refuses_command 'no smaller than' item file --parent OS-1 --title x --kind feature --size epic
test ! -d "$PROJECT/.ket/items/OS-2" || fail "a refused link still wrote the child"
grep -q 'children: \[\]' "$PROJECT/.ket/items/OS-1/item.yaml" ||
  fail "a refused link still wrote the parent"
CHECKED=$((CHECKED + 1))

echo "acceptance: an epic does not block the child that carries it"
rm -rf "$PROJECT/.ket/items"
mkdir -p "$PROJECT/.ket/items"
parent_item OS-1 feature epic designing 'authentication' OS-2
child_item OS-2 feature story implementing 'lock an account' OS-1
allows src/auth.ts
child_item OS-2 feature story triaged 'lock an account' OS-1
refuses src/auth.ts 'OS-2 is triaged, not implementing'
child_item OS-2 feature story awaiting-approval 'lock an account' OS-1
refuses src/auth.ts 'OS-2 is awaiting-approval, not implementing'
child_item OS-2 feature trivial implementing 'lock an account' OS-1
refuses src/commands/hello/command.ts 'OS-2 is trivial'

echo "acceptance: the epic governs again once its child lands"
child_item OS-2 feature story shipped 'lock an account' OS-1
refuses src/auth.ts 'OS-1 is designing, not implementing'

echo "acceptance: an item that lists itself as its own child"
# An item naming itself delegates to nobody, so it has to keep governing.
rm -rf "$PROJECT/.ket/items"
mkdir -p "$PROJECT/.ket/items"
parent_item OS-1 feature story triaged 'login with lockout' OS-1
refuses src/auth.ts 'OS-1 is triaged, not implementing'

echo "acceptance: two children at once is still two jobs"
parent_item OS-1 feature epic designing 'authentication' OS-2 OS-3
child_item OS-2 feature story implementing 'lock an account' OS-1
child_item OS-3 feature story implementing 'unlock it' OS-1
refuses src/auth.ts 'OS-2 and OS-3 are both in flight'

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

echo "acceptance: a design that cites what nobody wrote"
# Every design agent may write, and each says its source is this codebase. A
# citation is the one part of that claim a machine can check.
design="$PROJECT/.ket/items/OS-1/solution-design.md"
mkdir -p "$(dirname "$design")"
printf 'The counter lives in `src/commands/login/attempts.ts` and `lockedOut()` reads it.\n' >"$design"
cited="$(envelope PostToolUse "$design" | (cd "$PROJECT" && "$KET" gate citations))"
echo "$cited" | grep -q 'src/commands/login/attempts.ts is cited' ||
  fail "the citations gate passed a design naming a file the repository has not got: ${cited:-nothing}"
echo "$cited" | grep -q 'lockedOut is cited' ||
  fail "the citations gate passed a design naming a symbol nothing defines"
echo "$cited" | grep -q 'permissionDecision' &&
  fail "the citations gate carried a decision, and a post-tool-use hook must never block"

printf 'The greeting lives in `src/commands/hello/greeting.ts` and `greeting()` reads it.\n' >"$design"
honest="$(envelope PostToolUse "$design" | (cd "$PROJECT" && "$KET" gate citations))"
test -z "$honest" ||
  fail "the citations gate reported a design whose citations all exist: $honest"

# A README naming a file ket has not built yet is a plan. Only what an item
# wrote is a claim about the repository.
printf 'See `src/commands/login/attempts.ts` for the plan.\n' >"$PROJECT/PLAN.md"
elsewhere="$(envelope PostToolUse "$PROJECT/PLAN.md" | (cd "$PROJECT" && "$KET" gate citations))"
test -z "$elsewhere" || fail "the citations gate judged prose no item wrote: $elsewhere"
rm -f "$PROJECT/PLAN.md"
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
grep -q '"about":"src/auth.ts","item":"OS-2"' "$PROJECT/.ket/events.jsonl" ||
  fail "no event named the child that governed a write under its epic"
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
