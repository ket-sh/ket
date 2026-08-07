#!/usr/bin/env bash
set -euo pipefail

PILOTTY="./node_modules/.bin/pilotty"
SESSION="ket-watch-acceptance"
BOARD="$(mktemp -d "${TMPDIR:-/tmp}/ket-watch-board.XXXXXX")"

cleanup() {
  "$PILOTTY" kill -s "$SESSION" >/dev/null 2>&1 || true
  rm -rf "$BOARD"
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

mkdir -p "$BOARD/.ket/items/KWA-1" "$BOARD/.ket/items/KWA-2"
cat >"$BOARD/.ket/config.ts" <<'CONFIG'
export default {
  key: 'KWA',
  targets: { '.': 'cli' },
  integrations: [],
  language: 'en',
  workflow: true,
};
CONFIG
cat >"$BOARD/.ket/items/KWA-1/item.yaml" <<'ITEM'
title: The acceptance item
kind: feature
size: story
status: designing
children:
  - KWA-2
ITEM
cat >"$BOARD/.ket/items/KWA-2/item.yaml" <<'ITEM'
title: The acceptance child
kind: bug
size: subtask
status: triaged
parent: KWA-1
children: []
ITEM
cat >"$BOARD/.ket/events.jsonl" <<'EVENTS'
{"gate":"transition","outcome":"allowed","about":"triaged","item":"KWA-1","at":"2026-08-07T08:00:00.000Z"}
{"gate":"transition","outcome":"allowed","about":"designing","item":"KWA-1","at":"2026-08-07T08:05:00.000Z"}
{"gate":"write","outcome":"allowed","about":".ket/items/KWA-1/solution-design.md","item":"KWA-1","at":"2026-08-07T08:30:00.000Z"}
{"gate":"transition","outcome":"allowed","about":"triaged","item":"KWA-2","at":"2026-08-07T08:40:00.000Z"}
{"gate":"write","outcome":"refused","about":"src/auth.ts","item":"KWA-1","reason":"no failing test covers it","at":"2026-08-07T08:50:00.000Z"}
EVENTS

"$PILOTTY" kill -s "$SESSION" >/dev/null 2>&1 || true
"$PILOTTY" spawn --name "$SESSION" --cwd "$BOARD" bun "$PWD/packages/cli/src/run.ts" watch >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "KWA-1" >/dev/null || fail "the item never appeared"

SHOWN="$(screen)"
shows "designing 1" || fail "the column never named its count"
shows "The acceptance item" || fail "the item title is missing"
shows "no failing test covers it" || fail "the standing refusal is missing"
shows "triaged 1" || fail "the child never reached its lane"

"$PILOTTY" key -s "$SESSION" Right >/dev/null
"$PILOTTY" key -s "$SESSION" Enter >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "KWA-1 · journey" >/dev/null || fail "the journey never opened"

SHOWN="$(screen)"
shows "solution-design.md" || fail "the artifact never hung on its stage"
shows "KWA-2" || fail "the child never closed the graph"
shows "►" || fail "the edges never drew"
shows "║ designing" || fail "the landing never selected the active stage"

"$PILOTTY" key -s "$SESSION" Left >/dev/null
sleep 1
SHOWN="$(screen)"
shows "║ triaged" || fail "the arrows never walked the canvas"

"$PILOTTY" key -s "$SESSION" Escape >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "designing 1" >/dev/null || fail "escape never popped to the board"

cat >"$BOARD/.ket/items/KWA-1/item.yaml" <<'ITEM'
title: The acceptance item
kind: feature
size: story
status: awaiting-approval
children:
  - KWA-2
ITEM
printf '%s\n' '{"gate":"transition","outcome":"allowed","about":"awaiting-approval","item":"KWA-1","at":"2026-08-07T09:20:00.000Z"}' >>"$BOARD/.ket/events.jsonl"

"$PILOTTY" wait-for -s "$SESSION" "awaiting-approval 1" >/dev/null || fail "the board never followed the move"

echo "acceptance: watch walks the canvas and follows the board live"
