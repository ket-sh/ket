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

screen() {
  "$PILOTTY" snapshot -s "$SESSION" --format text
}

selected_stage() {
  screen | grep -m1 '┃' | sed 's/^[^┃]*┃//; s/┃.*//' | tr -dc 'a-z'
}

"$PILOTTY" kill -s "$SESSION" >/dev/null 2>&1 || true
"$PILOTTY" spawn --name "$SESSION" --cwd "$PWD/packages/cli" bun src/run.ts watch >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "AUTH-3" >/dev/null || fail "the item never appeared"

screen | grep -q "login with lockout" || fail "the item title is missing"
screen | grep -q "verify fails and returns to implement" || fail "the loop is not reported"
screen | grep -q "classified kind=feature" || fail "the selected stage shows no log"

opening="$(selected_stage)"
[ "$opening" = "triage" ] || fail "expected triage selected at rest, saw '${opening}'"

"$PILOTTY" key -s "$SESSION" Right >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "searched lockout policies" >/dev/null || fail "the log never followed the selection"

moved="$(selected_stage)"
[ "$moved" = "research" ] || fail "expected research selected after Right, saw '${moved}'"

echo "acceptance: watch renders the pipeline and follows the keyboard"
