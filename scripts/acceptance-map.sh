#!/usr/bin/env bash
set -euo pipefail

PILOTTY="./node_modules/.bin/pilotty"
SESSION="ket-map-acceptance"
RUN="$PWD/packages/cli/src/run.ts"
PROJECT="$(mktemp -d "${TMPDIR:-/tmp}/ket-map-project.XXXXXX")"

cleanup() {
  "$PILOTTY" kill -s "$SESSION" >/dev/null 2>&1 || true
  rm -rf "$PROJECT"
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

opened() {
  "$PILOTTY" kill -s "$SESSION" >/dev/null 2>&1 || true
  "$PILOTTY" spawn --name "$SESSION" --cwd "$PROJECT" bun "$RUN" map >/dev/null
  "$PILOTTY" wait-for -s "$SESSION" "$1" >/dev/null || fail "$2"
  SHOWN="$(screen)"
}

mkdir -p "$PROJECT/.ket"
cat >"$PROJECT/.ket/config.ts" <<'CONFIG'
export default {
  key: 'KMA',
  targets: { '.': 'cli' },
  integrations: [],
  language: 'en',
  workflow: true,
};
CONFIG

opened "ket:map" "the empty state never named the session that starts a map"
shows "/ket:map" || fail "the empty state never named the mapping session"
shows "releases" || fail "the empty state never said what a story map is"

cat >"$PROJECT/.ket/story-map.yaml" <<'MAP'
version: 1
product:
  name: shop
  idea: a place to buy one thing without ceremony
users:
  - id: u-shopper
    name: shopper
releases:
  - id: r-skeleton
    name: walking skeleton
    outcome: a shopper completes one real purchase
    metric: one paid order lands in the ledger
activities:
  - id: a-buy
    name: buy a thing
    steps:
      - id: s-browse
        name: browse the catalog
        stories:
          - id: st-see-products
            name: see what is for sale
            user: u-shopper
            release: r-skeleton
MAP

opened "walking skeleton" "the map never reached the screen"
shows "shop" || fail "the product name is missing"
shows "buy a thing" || fail "the activity never crossed the top"
shows "browse the catalog" || fail "the step never became a column"
shows "see what is for sale" || fail "the story never became a card"
shows "a shopper completes one real purchase" || fail "the band never wore its outcome"
shows "unassigned" || fail "the empty bucket never drew itself"

sed 's/release: r-skeleton/release: r-gone/' "$PROJECT/.ket/story-map.yaml" >"$PROJECT/broken.yaml"
mv "$PROJECT/broken.yaml" "$PROJECT/.ket/story-map.yaml"

set +e
REFUSED="$(cd "$PROJECT" && bun "$RUN" map 2>&1)"
CODE=$?
set -e

[ "$CODE" -eq 1 ] || fail "a map it cannot read left the exit code at $CODE"
grep -q "st-see-products" <<<"$REFUSED" || fail "the refusal never named the story"
grep -q "r-gone" <<<"$REFUSED" || fail "the refusal never named the release"

echo "acceptance: the map screen draws the backbone, the bands, and its own refusals"
