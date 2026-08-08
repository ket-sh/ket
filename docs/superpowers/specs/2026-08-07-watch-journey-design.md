# The watch control room

Date: 2026-08-07. Status: approved through a living demo. Grows the board on
`feat/watch-kanban`, pull request 29.

## Why

The first cut of `ket watch` folds the event log into a read-only kanban.
The demo that followed showed the real product: the board is a control room.
A card opens its journey as a graph, every artifact opens as the same surface
the web page shows, and the human gates fire from the keyboard. A throwaway
proof of concept outside the repository drove every decision below, screen by
screen, until the owner approved the whole.

## The board

- Two layouts share one selection model: the kanban and a flat list. The `v`
  key toggles them, and its hint names the layout you'd switch to, never the
  one you're on.
- The kanban gives every status its own lane in pipeline order, empty lanes
  included, so the whole pipeline stays on screen. Refusals sit in red on
  the card. Where a row can't give every lane the room to spell its status,
  the lanes stack instead.
- Arrow keys move the selection card by card. The selected card wears a
  double border that pulses in its stage color.
- The list shows key, stage, age, and title per row, with the refusal at the
  end of the row. Selection follows a card when a gate moves it.
- The header carries the banner, the breadcrumb, the active theme name, and
  a live indicator. The key bar holds the bottom row of the screen and names
  the keys the view above it answers.

## The drill-in

Enter on a card opens the item behind a tab bar: overview, workflow,
children, artifacts. The dogfood round settled this shape, replacing the
single graph the first cut drew.

- Overview comes first and holds the title and the description at full
  width. An item without a description reads "No description written."
- Workflow holds the flow canvas.
- Children exists only while the item has children. Its rows read like the
  board's flat list, and enter drills into the child.
- Artifacts lists what the item wrote beside the chosen one, rendered
  through the same surface replicas a full-screen artifact uses.

## The journey canvas

- The canvas shows stages and nothing else. Artifacts and children left it
  for their own tabs, because a graph carrying all three read as a maze.
- It draws the whole machine path: the stages already visited, the stage the
  item stands in, and every stage ahead through to shipped. The path comes
  from the machine's declared order, so a new status joins the canvas with
  no second edit.
- A visited stage closes at the arrival that followed it, which is what
  gives it a real duration. The stage the item stands in stays open and
  measures against now.
- A node wears its state: a check for done, a spinner for active, a hollow
  circle for a stage not yet reached. The last refusal sits under the canvas
  as a red line.
- Arrow keys jump to the nearest node in that direction. The viewport
  follows the selection with its own pan arithmetic, because the renderer's
  horizontal scrolling is unreliable. Edges that touch the selection carry a
  moving dot.
- Shared edge cells merge through a bit union of the line characters, so
  fan-ins draw junctions instead of overwriting each other.
- Views stack: board, then journey, then a surface or a child journey.
  Escape pops one layer. The breadcrumb spells the path.

## What the log already carries

- The graph needs no new event vocabulary.
- Stage nodes come from `transition · allowed` events for the item. Every
  arrival is its own node, so a reopen loop stays visible as a second visit.
- Artifact nodes come from write-gate `allowed` records whose path lands
  under the item's directory. The event's moment dates the artifact.
- Children come from the store's parent field.
- A card's refusal is the last `refused` event at or after its arrival.
- `foldJourney(stored, log, key)` joins the store and the log into stage
  nodes, edges, an artifact list, and a child list. It lives beside
  `foldKanban` in the CLI's shared domain, pure and mutation-gated.
- Layout is presentation: a pure function in the TUI package assigns layers
  and lanes. Property tests hold two invariants: no two boxes overlap, and
  every edge joins two placed nodes.

## The feed contract

- `BoardFeed` gains `journey(key)` and `act(key, gate)`. The CLI builds the
  feed, the TUI renders it, and the TUI parses nothing.
- `act` routes into the same staging path the CLI commands use. A refusal
  lands in the event log and reappears on the card through the normal fold,
  not through a side channel.
- Saving an edited artifact travels the same road: the feed writes, the
  write gate records, the board refreshes.

## The surfaces

Every artifact opens full screen as a replica of the matching web panel,
with the same copy and the same structure.

- Prose panels carry the audience switch: Technical and Plain language
  tabs, toggled with tab or the left and right arrows. A missing plain file
  shows "No plain version written." and a stale one shows "Plain version
  lags behind its source."
- The design panel marks each callout claim with a superscript, draws the
  architecture as a small graph with numbered badges on the named shapes,
  and lists the legend beneath.
- The decision panel shows the Status and Date badges, the prose, and the
  driver matrix: verdict glyphs colored by reading, the chosen row tagged,
  the legend and its closing note verbatim.
- The criteria panel is a feature card and the one editable surface: `e`
  starts editing, the cursor walks with the arrows, typing inserts, and
  ctrl+s saves through the feed. Unsaved work wears a mark, a save flashes
  its confirmation.
- The blast panel shows the measure chips, the dependency graph with
  affected modules highlighted, and the budget sentence verbatim.
- The diff panel colors file heads, hunks, additions, and deletions in the
  unified layout.
- A stage node opens its ledger: the stage's events as an activity list.
- Long content scrolls with hard ends, the title shows a line range while
  content overflows, and the scroll hint hides when everything fits.

## The human gates

- `a` approves, `s` ships, `o` reopens. The board offers a gate only while
  the selected card stands before it: the hint appears in the key bar and
  the key answers only then.
- The gate opens a modal: the torii mark, the card, the transition drawn as
  stage chips, and two answers, pass on enter and cancel on escape.
- A pass celebrates: confetti, a green confirmation, and the modal closes
  itself while the board behind it already shows the move.
- Refusals the gates record against machine attempts keep arriving through
  the log and wear the card, so the red path stays visible without a human
  misfire.

## Theming

- Colors live in one semantic token palette. Kanagawa is the default.
- Thirteen built-ins ship, nine dark and four light, each mapped from its
  canonical palette. Every one exists in the iTerm2-Color-Schemes
  collection that Ghostty vendors, so the set can grow from that source.
- `t` opens the picker over any view. Moving the selection previews the
  theme live behind the modal, enter keeps it, escape restores the one you
  came from. Each row shows a strip of the theme's own colors.
- Recorded for later, not built now: deriving tokens from any sixteen-color
  terminal scheme, a `terminal` theme that adopts the host palette, and an
  automatic light and dark switch.

## Motion

- Active nodes spin a braille spinner, the selected border pulses, edges at
  the selection carry a flow dot, and the banner gradient shimmers, all on a
  120 millisecond tick.

## Realtime

- The feed watches the `.ket` directory with a debounce and keeps a
  five-second size poll as a backstop, as already shipped on the branch.
  Every view folds fresh state on each change, and the header's live dot
  says so.

## Boundaries and language

- The CLI imports no renderer. The TUI arrives through one lazy import and
  holds no command logic.
- The chrome speaks English. Artifact content speaks the scaffold language.
- Every container clips its children: overflow stays hidden, and titles
  truncate rather than bleed across borders.

## Testing

- Inside-out and test-first. The journey fold and the layout live under
  Vitest with fast-check properties and the mutation gate. Components live
  under `bun test` with the test renderer.
- The acceptance script drives a real terminal: open a journey, walk the
  nodes, open a surface, pass a gate, and read the frames.
- The mutation run happens once, at the end of the branch.

## Slicing

Everything lands on `feat/watch-kanban`, growing the shipped board in this
order:

1. The journey fold, the layout, and the read-only canvas.
2. The surfaces with the audience switch, read only.
3. The gates through `act`.
4. Criteria editing.
5. The list view, theming, and motion.

The proof of concept stays outside the repository as a reference. Production
code grows test-first from its own failing tests.

## Open questions

- The side-by-side diff layout.
- Terminal-derived themes and the automatic light and dark switch.
