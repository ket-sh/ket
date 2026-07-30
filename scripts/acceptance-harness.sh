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

# A bash envelope names a command rather than a file, and the shell gate reads it
# out of the same tool input a write gets its path from.
shell_envelope() {
  local escaped
  escaped=${1//\\/\\\\}
  escaped=${escaped//\"/\\\"}
  printf '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"%s"}}' \
    "$escaped"
}

shell_runs() {
  local answer
  answer="$(shell_envelope "$1" | (cd "$PROJECT" && "$KET" gate shell))"

  test -z "$answer" || fail "expected the shell gate to allow '$1', gate said: $answer"
  CHECKED=$((CHECKED + 1))
}

shell_refuses() {
  local answer
  answer="$(shell_envelope "$1" | (cd "$PROJECT" && "$KET" gate shell))"

  echo "$answer" | grep -q '"permissionDecision":"deny"' ||
    fail "expected the shell gate to refuse '$1', gate said: ${answer:-nothing}"
  echo "$answer" | grep -qF -e "$2" ||
    fail "expected the refusal of '$1' to say '$2', gate said: $answer"
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
for name in tdd clean-code mutation gates commit research suppression verification generated gherkin adr progress stages findings; do
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
grep -q 'ket gate shell' harness/hooks/hooks.json ||
  fail "the harness hooks call no shell gate"
grep -q '"matcher": "Bash"' harness/hooks/hooks.json ||
  fail "the shell gate is wired to no bash tool call"
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

echo "acceptance: files a tool writes and a person does not"
# The lockfile name comes from the preset, so a target on another toolchain gets
# its own. Nothing here retypes ket's choice.
only_item OS-1 feature story implementing 'login with lockout'
refuses bun.lock 'is a lockfile'
refuses packages/api/bun.lock 'is a lockfile'
allows docs/bun.lock.md
allows package.json

echo "acceptance: files that hold secrets"
refuses .env 'holds secrets'
refuses .env.local 'holds secrets'
refuses apps/api/.env 'holds secrets'
allows .env.example
allows src/env.ts
allows .gitignore
allows .oxlintrc.json

echo "acceptance: key material"
refuses secrets/server.pem 'is key material'
refuses certs/bundle.p12 'is key material'
refuses .ssh/id_rsa 'is key material'
refuses .ssh/id_ed25519 'is key material'
allows src/key.ts

echo "acceptance: a command that would step around a gate"
shell_refuses 'git commit -m wip --no-verify' 'skips a gate'
shell_refuses 'git commit --no-gpg-sign -m wip' 'skips a gate'
shell_refuses 'git push --no-verify' '--no-verify skips a gate'
shell_runs 'git commit -m wip'
shell_runs 'bun run test'
shell_runs 'git verify-commit HEAD'

echo "acceptance: a shell writes the same files the write tool does"
# A gate that reads only the Write tool is a gate an agent steps around with a
# redirect, so the shell asks the same rule about the same paths.
only_item OS-1 feature story triaged 'login with lockout'
shell_refuses 'printf x > src/auth.ts' 'OS-1 is triaged, not implementing'
shell_refuses 'echo x >> src/auth.ts' 'OS-1 is triaged, not implementing'
shell_refuses 'echo x | tee src/auth.ts' 'OS-1 is triaged, not implementing'
shell_refuses 'cp /tmp/draft.ts src/auth.ts' 'OS-1 is triaged, not implementing'
shell_refuses 'mv src/auth.ts src/other.ts' 'OS-1 is triaged, not implementing'
shell_refuses 'touch src/auth.ts' 'OS-1 is triaged, not implementing'
shell_refuses 'rm src/auth.ts' 'OS-1 is triaged, not implementing'
shell_refuses "sed -i 's/a/b/' src/auth.ts" 'OS-1 is triaged, not implementing'
shell_refuses 'install -m 644 /tmp/draft.ts src/auth.ts' 'OS-1 is triaged, not implementing'
# A command may name a file any way a shell would, and a temporary directory on
# a mac is reached through a symlink, so an absolute path has to settle the same
# way a written one does before anything compares it to the repository.
shell_refuses "printf x > $PROJECT/src/auth.ts" 'OS-1 is triaged, not implementing'
shell_refuses 'printf x > bun.lock' 'bun.lock is a lockfile'
shell_refuses 'printf x > .env' 'holds secrets'
shell_refuses 'printf x > .ket/items/OS-1/item.yaml' 'only a gate writes one'

echo "acceptance: reading is never refused, or the gate gets turned off"
shell_runs 'cat src/auth.ts'
shell_runs 'grep -rn hello src'
shell_runs 'ls -la src'
shell_runs 'bun run test'
shell_runs 'git status'
shell_runs 'printf x > README.md'

echo "acceptance: a command ket cannot read confidently"
shell_refuses 'python -c "open(1)"' 'cannot read what this command writes'
shell_refuses 'node -e "x"' 'because of node -e'
shell_refuses 'cd src && printf x > auth.ts' 'because of cd'

echo "acceptance: a command in a repository ket never touched"
answer="$(shell_envelope 'git commit --no-verify' | (cd "$SANDBOX" && "$KET" gate shell))"
test -z "$answer" ||
  fail "the shell gate spoke where there is no ket directory: $answer"
CHECKED=$((CHECKED + 1))

echo "acceptance: an envelope about no command at all"
answer="$(envelope PreToolUse "$PROJECT/src/auth.ts" | (cd "$PROJECT" && "$KET" gate shell))"
test -z "$answer" || fail "expected a write envelope to be ignored by the shell gate: $answer"
CHECKED=$((CHECKED + 1))

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

# The whole claim of ring 1 is that it looks at one file. A check that dropped
# the path would sweep the project and name broken.ts even while probing a clean
# one, and nothing in ring one is allowed to do that.
elsewhere="$(envelope PostToolUse "$PROJECT/src/commands/hello/greeting.ts" | (cd "$PROJECT" && "$KET" gate probe))"
test -z "$elsewhere" ||
  fail "ring one reported a file other than the written one, so it is not scoped to it: $elsewhere"
rm "$PROJECT/src/broken.ts"
CHECKED=$((CHECKED + 4))

echo "acceptance: ring one waits for no sweep of the project"
# Measured at about a second a write on a toy project, and it grows. The two
# project-wide checks answer what the commit hook answers anyway, so a write no
# longer waits for them.
printf 'export const broken: number = "not a number";\n' >"$PROJECT/src/mistyped.ts"
typed="$(envelope PostToolUse "$PROJECT/src/mistyped.ts" | (cd "$PROJECT" && "$KET" gate probe))"
echo "$typed" | grep -q 'tsc' &&
  fail "a write waited for a typecheck of the whole project"
echo "$typed" | grep -q 'depcruise' &&
  fail "a write waited for a dependency sweep of the whole project"
rm "$PROJECT/src/mistyped.ts"
CHECKED=$((CHECKED + 2))

echo "acceptance: ring one runs the tests that cover the written file"
# Nothing else runs a test automatically, so this is the fastest true signal the
# pipeline has. The example command ships with a suite that passes.
covered="$(envelope PostToolUse "$PROJECT/src/commands/hello/greeting.ts" | (cd "$PROJECT" && "$KET" gate probe))"
test -z "$covered" || fail "a passing suite was reported as a failure: $covered"
CHECKED=$((CHECKED + 1))

cp "$PROJECT/src/commands/hello/greeting.ts" "$SANDBOX/greeting.intact"
printf 'export function greeting(name: string): string {\n  return `goodbye ${name}`;\n}\n' \
  >"$PROJECT/src/commands/hello/greeting.ts"
regressed="$(envelope PostToolUse "$PROJECT/src/commands/hello/greeting.ts" | (cd "$PROJECT" && "$KET" gate probe))"
echo "$regressed" | grep -q 'vitest run' ||
  fail "a write broke the suite that covers it and the gate said: ${regressed:-nothing}"
CHECKED=$((CHECKED + 1))

# A file no test is named after runs no test at all. Running the whole suite
# instead would answer a question nobody asked, and refusing a file with no test
# is the test-first gate's business rather than ring one's. The suite is still
# broken here on purpose: a sweep of it would be loud, and running nothing quiet.
printf 'export const alone = 1;\n' >"$PROJECT/src/uncovered.ts"
uncovered="$(envelope PostToolUse "$PROJECT/src/uncovered.ts" | (cd "$PROJECT" && "$KET" gate probe))"
echo "$uncovered" | grep -q 'vitest' &&
  fail "a file no test covers still ran the runner: $uncovered"
rm "$PROJECT/src/uncovered.ts"
cp "$SANDBOX/greeting.intact" "$PROJECT/src/commands/hello/greeting.ts"
CHECKED=$((CHECKED + 1))

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

echo "acceptance: the write is formatted before anything reads it"
# Advice about formatting fixes nothing, so the gate that reads the file is also
# the gate that rewrites it. The preset declares the formatter, and this asserts
# the file on disk, not the list.
printf 'export const total   =   1\n' >"$PROJECT/src/unformatted.ts"
envelope PostToolUse "$PROJECT/src/unformatted.ts" | (cd "$PROJECT" && "$KET" gate probe) >/dev/null
grep -qx 'export const total = 1;' "$PROJECT/src/unformatted.ts" ||
  fail "the probe gate left the written file unformatted: $(cat "$PROJECT/src/unformatted.ts")"
CHECKED=$((CHECKED + 1))

# A formatter that reached past the written file would rewrite the whole project
# on every keystroke, so a second unformatted file has to survive untouched.
printf 'export const other   =   2\n' >"$PROJECT/src/untouched.ts"
envelope PostToolUse "$PROJECT/src/unformatted.ts" | (cd "$PROJECT" && "$KET" gate probe) >/dev/null
grep -qx 'export const other   =   2' "$PROJECT/src/untouched.ts" ||
  fail "the formatter rewrote a file other than the one that was written"
rm "$PROJECT/src/unformatted.ts" "$PROJECT/src/untouched.ts"
CHECKED=$((CHECKED + 1))

echo "acceptance: the harness runs ring one on every write"
grep -q 'ket gate probe' harness/hooks/hooks.json ||
  fail "the harness hooks never call the probe gate"
grep -q '"PostToolUse"' harness/hooks/hooks.json ||
  fail "the probe gate is not wired to a post-tool-use event"

echo "acceptance: the test-first gate reads the conversation that acted"
# Claude Code sends the parent session's transcript even when a subagent made the
# call. A gate reading it judges work the acting agent never did, so ket resolves
# the acting transcript and refuses rather than fall back to the parent.
transcripts="$SANDBOX/transcripts"
mkdir -p "$transcripts/session/subagents"
printf '{"type":"user","message":{"content":[{"type":"text","text":"hello"}]}}\n' \
  >"$transcripts/session.jsonl"
cp "$transcripts/session.jsonl" "$transcripts/session/subagents/agent-a1.jsonl"

# The written file is one the project's own test-first config does not cover, so
# a gate that resolved the wrong transcript answers instead of refusing, and the
# difference between refusing and falling back is visible without asking an
# oracle anything.
test_first() {
  printf '{"hook_event_name":"PreToolUse","tool_name":"Write","transcript_path":"%s","cwd":"%s"%s,"tool_input":{"file_path":"%s","content":"nothing\\n"}}' \
    "$1" "$PROJECT" "$2" "$PROJECT/README.md" |
    (cd "$PROJECT" && "$KET" gate test-first)
}

# A refusal has to name the conversation behind it, or the next wrong one costs
# another session to diagnose.
answer="$(test_first "$transcripts/session.jsonl" ',"agent_id":"a404"')"
echo "$answer" | grep -q 'found no transcript for the agent that acted' ||
  fail "the gate read a transcript that is not the acting agent's, gate said: ${answer:-nothing}"
echo "$answer" | grep -qF 'subagents/agent-a404.jsonl' ||
  fail "the refusal does not name the transcript it looked for, gate said: $answer"
CHECKED=$((CHECKED + 1))

# The parent transcript is right there and readable. A gate that falls back to it
# when it cannot name the acting agent reads a conversation this agent never had.
answer="$(test_first "$transcripts/session.jsonl" ',"agent_id":"../elsewhere"')"
echo "$answer" | grep -q 'could not tell which conversation' ||
  fail "the gate fell back to the parent transcript, gate said: ${answer:-nothing}"
CHECKED=$((CHECKED + 1))

answer="$(test_first "$transcripts/session" ',"agent_id":"a1"')"
echo "$answer" | grep -q 'could not tell which conversation' ||
  fail "the gate derived an agent transcript from a session it cannot name, gate said: ${answer:-nothing}"
CHECKED=$((CHECKED + 1))

answer="$(test_first "$transcripts/nowhere.jsonl" '')"
echo "$answer" | grep -q 'found no transcript' ||
  fail "the gate accepted a transcript that is not there, gate said: ${answer:-nothing}"
CHECKED=$((CHECKED + 1))

echo "acceptance: a gate that cannot start refuses the write"
# Every exit but a refusal lets the write through, so a project that never
# installed the gate it declares would silently lose it.
mv "$PROJECT/node_modules/.bin/probity" "$SANDBOX/probity.moved"
answer="$(test_first "$transcripts/session.jsonl" ',"agent_id":"a1"')"
echo "$answer" | grep -q 'could not start' ||
  fail "a missing test-first gate let the write through, gate said: ${answer:-nothing}"
echo "$answer" | grep -q '"permissionDecision":"deny"' ||
  fail "the gate reported it could not start without refusing"
mv "$SANDBOX/probity.moved" "$PROJECT/node_modules/.bin/probity"
CHECKED=$((CHECKED + 1))

echo "acceptance: the gate governs only a repository ket was told about"
answer="$(printf '{"hook_event_name":"PreToolUse","tool_name":"Write","transcript_path":"%s","tool_input":{"file_path":"a.ts","content":""}}' \
  "$transcripts/session.jsonl" | (cd "$SANDBOX" && "$KET" gate test-first))"
test -z "$answer" ||
  fail "the test-first gate spoke where there is no ket directory: $answer"
CHECKED=$((CHECKED + 1))

echo "acceptance: the project ships the gate it declares"
test -x "$PROJECT/node_modules/.bin/probity" ||
  fail "a created project installs no test-first gate"
grep -q "'src/\*\*'" "$PROJECT/probity.config.ts" ||
  fail "the test-first config guards a source directory the project does not have"
grep -q 'ket gate test-first' harness/hooks/hooks.json ||
  fail "the harness hooks call no test-first gate"
grep -q 'NotebookEdit' harness/hooks/hooks.json ||
  fail "the test-first gate misses the notebook tool it also guards"

echo "acceptance: every decision was recorded"
test -f "$PROJECT/.ket/events.jsonl" || fail "the gate recorded no events"
grep -q '"outcome":"refused"' "$PROJECT/.ket/events.jsonl" || fail "no refusal was recorded"
grep -q '"outcome":"allowed"' "$PROJECT/.ket/events.jsonl" || fail "no allowance was recorded"
grep -q '"item":"OS-1"' "$PROJECT/.ket/events.jsonl" || fail "no event named the item"
grep -q '"about":"src/auth.ts","item":"OS-2"' "$PROJECT/.ket/events.jsonl" ||
  fail "no event named the child that governed a write under its epic"
grep -q '"gate":"probe"' "$PROJECT/.ket/events.jsonl" || fail "the probe gate recorded nothing"
grep -q '"gate":"shell"' "$PROJECT/.ket/events.jsonl" || fail "the shell gate recorded nothing"
# Every gate names a file the way the repository names it, or the log reads as
# two logs and nothing can group by what a decision was about.
grep -q '"gate":"test-first","outcome":"refused","about":"README.md"' "$PROJECT/.ket/events.jsonl" ||
  fail "the test-first gate recorded a decision under some other name for the file"
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
