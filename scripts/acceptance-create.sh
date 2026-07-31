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

echo "acceptance: a created project carries the standing law it is governed by"
test -f "$PROJECT/CLAUDE.md" || fail "no standing law was written"
grep -qxF "# \`order-service\`" "$PROJECT/CLAUDE.md" ||
  fail "the standing law is not written for the project that got it"
test -f "$PROJECT/skills-lock.json" || fail "no skills lockfile was written"

# The standing law points an agent at skills. A skill the project never got is a
# pointer to nothing, so every one it names has to be on disk.
echo "acceptance: the skills the lockfile records arrive with the project"
for skill in vitest find-skills; do
  test -f "$PROJECT/.claude/skills/$skill/SKILL.md" ||
    fail "$skill is locked but no such skill arrived"
  grep -qF "\`$skill\` skill" "$PROJECT/CLAUDE.md" ||
    fail "the standing law never sends the reader to the $skill skill it installed"
done

echo "acceptance: the scaffold arrives as its own commit"
# Without one, the user's first diff is ket's output tangled with their own.
test -z "$(cd "$PROJECT" && git status --porcelain)" ||
  fail "create left the scaffold uncommitted"
(cd "$PROJECT" && git log -1 --pretty=%s) | grep -qx 'chore: scaffold with ket' ||
  fail "the first commit does not say what it is, in the form the project lints for"

# A skill installed after the scaffold commit is a skill the user has to commit
# themselves, and the point of the commit is that they inherit nothing untracked.
committed() {
  (cd "$PROJECT" && git ls-tree -r HEAD --name-only) | grep -qx "$1"
}
for tracked in CLAUDE.md skills-lock.json .claude/skills/vitest/SKILL.md \
  .claude/skills/find-skills/SKILL.md; do
  committed "$tracked" || fail "$tracked is not inside the first commit"
done

(cd "$PROJECT" && bun install >"$SANDBOX/install.log" 2>&1) || {
  tail -20 "$SANDBOX/install.log" >&2
  fail "the manifest does not resolve"
}

# The project lints its own commit messages, so the commit ket made must pass
# the linter ket shipped with it.
(cd "$PROJECT" && git log -1 --pretty=%B | ./node_modules/.bin/commitlint) ||
  fail "the scaffold commit does not pass the commitlint the project ships"

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

# The tool clones over the network, and the network is not a promise ket can
# make. Forcing the failure is the only way to find out what the user is left
# holding when it happens.
echo "acceptance: a project survives an install that cannot run"
UNREACHABLE="$SANDBOX/no-network"
STRANDED="$SANDBOX/stranded"
mkdir -p "$UNREACHABLE"
cat >"$UNREACHABLE/bunx" <<'REFUSE'
#!/bin/sh
echo "fatal: could not read from remote repository"
exit 1
REFUSE
chmod +x "$UNREACHABLE/bunx"

(cd "$SANDBOX" && PATH="$UNREACHABLE:$PATH" "$KET" create stranded >"$SANDBOX/stranded.log" 2>&1) ||
  fail "create gave up on the project when the skills could not install"

test -f "$STRANDED/skills-lock.json" ||
  fail "a project whose skills did not install lost the lockfile that records them"
test -d "$STRANDED/.claude/skills" &&
  fail "skills arrived from an installer that refused"
test -z "$(cd "$STRANDED" && git status --porcelain)" ||
  fail "a failed install left the project uncommitted"

grep -q 'skills did not install' "$SANDBOX/stranded.log" ||
  fail "the outro says nothing about the skills that did not install"
grep -q 'could not read from remote repository' "$SANDBOX/stranded.log" ||
  fail "the outro hides what the installer actually said"
for stranded in vitest find-skills; do
  grep -q "skills@.* add .* --skill $stranded --agent claude-code --copy --yes" \
    "$SANDBOX/stranded.log" ||
    fail "the outro does not say how to install $stranded later"
done

echo "acceptance: every workflow a project gets is one github can run"
mise exec -- actionlint "$WITH/.github/workflows/"*.yml ||
  fail "a generated workflow does not parse"
