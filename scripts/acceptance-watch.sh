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
cat >"$BOARD/.ket/config.yaml" <<'CONFIG'
key: KWA
targets:
  .: cli
integrations: []
language: en
workflow: true
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
cat >"$BOARD/.ket/items/KWA-1/solution-design.md" <<'DESIGN'
# Solution design

The keeper locks the account after five failures.
DESIGN
cat >"$BOARD/.ket/events.jsonl" <<'EVENTS'
{"gate":"transition","outcome":"allowed","about":"triaged","item":"KWA-1","at":"2026-08-07T08:00:00.000Z"}
{"gate":"transition","outcome":"allowed","about":"designing","item":"KWA-1","at":"2026-08-07T08:05:00.000Z"}
{"gate":"write","outcome":"allowed","about":".ket/items/KWA-1/solution-design.md","item":"KWA-1","at":"2026-08-07T08:30:00.000Z"}
{"gate":"transition","outcome":"allowed","about":"triaged","item":"KWA-2","at":"2026-08-07T08:40:00.000Z"}
{"gate":"write","outcome":"refused","about":"src/auth.ts","item":"KWA-1","reason":"no failing test covers it","at":"2026-08-07T08:50:00.000Z"}
EVENTS

# Card prose renders whole only where every lane stretches past its least
# width, so the title and refusal claims read a 300-column board. The session
# then drops back to 80x24, where the later lane claims prove the board
# follows the seat into lanes past the right edge.
"$PILOTTY" kill -s "$SESSION" >/dev/null 2>&1 || true
"$PILOTTY" spawn --name "$SESSION" --cwd "$BOARD" bun "$PWD/packages/cli/src/run.ts" watch >/dev/null
"$PILOTTY" resize -s "$SESSION" 300 30 >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "KWA-1" >/dev/null || fail "the item never appeared"

SHOWN="$(screen)"
shows "designing 1" || fail "the column never named its count"
shows "The acceptance item" || fail "the item title is missing"
shows "no failing test covers it" || fail "the standing refusal is missing"
shows "triaged 1" || fail "the child never reached its lane"

"$PILOTTY" resize -s "$SESSION" 80 24 >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "designing 1" >/dev/null || fail "the board never reflowed to 80 columns"

"$PILOTTY" key -s "$SESSION" Right >/dev/null
"$PILOTTY" key -s "$SESSION" Enter >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "KWA-1 · journey" >/dev/null || fail "the journey never opened"

SHOWN="$(screen)"
shows "overview" || fail "the tab bar never named the overview"
shows "workflow" || fail "the tab bar never named the workflow"
shows "children" || fail "the tab bar never named the children"
shows "artifacts" || fail "the tab bar never named the artifacts"
shows "The acceptance item" || fail "the overview never carried the title"

"$PILOTTY" key -s "$SESSION" Tab >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "║ designing" >/dev/null || fail "the workflow never selected the active stage"

SHOWN="$(screen)"
shows "►" || fail "the edges never drew"

for _ in 1 2 3 4 5; do
  "$PILOTTY" key -s "$SESSION" Right >/dev/null
done
"$PILOTTY" wait-for -s "$SESSION" "║ shipped" >/dev/null || fail "the canvas never drew the path through to shipped"

for _ in 1 2 3 4 5; do
  "$PILOTTY" key -s "$SESSION" Left >/dev/null
done
"$PILOTTY" key -s "$SESSION" Left >/dev/null
sleep 1
SHOWN="$(screen)"
shows "║ triaged" || fail "the arrows never walked the canvas"

"$PILOTTY" key -s "$SESSION" Tab >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "KWA-2" >/dev/null || fail "the children tab never listed the child"

"$PILOTTY" key -s "$SESSION" Tab >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "solution-design.md" >/dev/null || fail "the artifacts tab never listed the artifact"

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

"$PILOTTY" key -s "$SESSION" Enter >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "KWA-1 · journey" >/dev/null || fail "the journey never reopened"
"$PILOTTY" key -s "$SESSION" Tab >/dev/null
"$PILOTTY" key -s "$SESSION" Tab >/dev/null
"$PILOTTY" key -s "$SESSION" Tab >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "solution-design.md" >/dev/null || fail "the artifacts tab never reopened"
"$PILOTTY" key -s "$SESSION" Enter >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "KWA-1 · Design" >/dev/null || fail "the surface never opened"

SHOWN="$(screen)"
shows "Technical" || fail "the surface never showed its audience tabs"
shows "locks the account after five failures" || fail "the design prose is missing"

"$PILOTTY" key -s "$SESSION" Escape >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "KWA-1 · journey" >/dev/null || fail "escape never left the surface"
"$PILOTTY" key -s "$SESSION" Escape >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "awaiting-approval 1" >/dev/null || fail "escape never returned to the board"

SHOWN="$(screen)"
shows "a approve" || fail "the board never offered the approve gate"

"$PILOTTY" key -s "$SESSION" a >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "approve gate" >/dev/null || fail "the ceremony never opened"
"$PILOTTY" key -s "$SESSION" Enter >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "passed" >/dev/null || fail "the gate never celebrated"
"$PILOTTY" wait-for -s "$SESSION" "implementing 1" >/dev/null || fail "the board never showed the move"

sleep 3
SHOWN="$(screen)"
shows "approve gate" && fail "the ceremony never closed itself"

"$PILOTTY" kill -s "$SESSION" >/dev/null 2>&1 || true
"$PILOTTY" spawn --name "$SESSION" --cwd "$BOARD" bun "$PWD/packages/cli/src/run.ts" watch KWA-1 >/dev/null
"$PILOTTY" wait-for -s "$SESSION" "KWA-1 · journey" >/dev/null || fail "the deep link never landed on the journey"

echo "acceptance: watch walks the canvas, opens the surfaces, passes the gate, and deep-links the journey"
