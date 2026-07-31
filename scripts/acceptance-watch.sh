#!/usr/bin/env bash
set -euo pipefail

PILOTTY="./node_modules/.bin/pilotty"
SESSION="ket-watch-acceptance"

cleanup() {
  "$PILOTTY" kill -s "$SESSION" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  echo "acceptance: $1" >&2
  exit 1
}

# A snapshot is read once into a variable rather than piped. `grep -q` closes
# the pipe on its first match, and the writer dies of it before it has finished.
screen() {
  "$PILOTTY" snapshot -s "$SESSION" --format text
}

shows() {
  grep -q "$1" <<<"$SHOWN"
}

selected_stage() {
  grep -m1 '┃' <<<"$SHOWN" | sed 's/^[^┃]*┃//; s/┃.*//' | tr -dc 'a-z'
}

"$PILOTTY" kill -s "$SESSION" >/dev/null 2>&1 || true
"$PILOTTY" spawn --name "$SESSION" --cwd "$PWD/packages/cli" bun src/run.ts watch >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "AUTH-3" >/dev/null || fail "the item never appeared"

SHOWN="$(screen)"
shows "login with lockout" || fail "the item title is missing"
shows "verify fails and returns to implement" || fail "the loop is not reported"
shows "classified kind=feature" || fail "the selected stage shows no log"

opening="$(selected_stage)"
[ "$opening" = "triage" ] || fail "expected triage selected at rest, saw '${opening}'"

"$PILOTTY" key -s "$SESSION" Right >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "searched lockout policies" >/dev/null || fail "the log never followed the selection"

SHOWN="$(screen)"
moved="$(selected_stage)"
[ "$moved" = "research" ] || fail "expected research selected after Right, saw '${moved}'"

echo "acceptance: watch renders the pipeline and follows the keyboard"
