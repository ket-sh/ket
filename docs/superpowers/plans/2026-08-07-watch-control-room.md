# Watch control room implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the shipped `ket watch` kanban into the control room the spec
describes. That means a journey graph per card, web-surface replicas per
artifact, keyed human gates, criteria editing, a list layout, and live
theming.

**Architecture:** Every fold from the store and the event log to a view model
is a pure function in the CLI's shared domain, mutation-gated. The TUI draws
from view models it receives through the feed and holds no command logic. The
canvas is a character grid the TUI computes itself: absolute cells, own pan
arithmetic, no scrollbox. Theme tokens live in one module that starts as a
single palette and becomes a provider when the picker lands.

**Tech stack:** Bun, Vitest with fast-check, `bun test` with
`@opentui/react/test-utils` for components, OpenTUI React, pilotty for
acceptance.

## Global constraints

- Spec: `docs/superpowers/specs/2026-08-07-watch-journey-design.md`. The
  demo-approved reference is `/tmp/ket-journey-poc/poc.tsx`: port behavior,
  never copy wholesale, re-decide every name against the clean-code rules.
- Work stays on `feat/watch-kanban`, pull request 29. Every commit follows
  the caveman-commit skill and ends with the trailer
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Test-first without exception: probity refuses any write under
  `packages/*/src` until a failing test covers it, and the failing run has
  to happen in the transcript of whoever edits.
- Behavior specs, state-based assertions, doubles only at process
  boundaries, a hermetic temporary directory for every filesystem test.
- `*.test.ts` runs under Vitest, `*.test.tsx` in `packages/tui` runs under
  `bun test`. Focused runs: `bunx vitest run <path>` inside the package,
  `bun test <path>` for components.
- `packages/cli` imports no renderer. The TUI parses nothing and reaches
  the CLI only through the feed contract. `packages/tui` follows
  Feature-Sliced Design and steiger enforces it.
- Chrome copy is English. Surface copy mirrors the web panels verbatim,
  including "No plain version written." and the matrix note.
- The mutation run happens once, at the end of the branch (task 17). Never
  loosen a gate; a surviving mutant dies through a better test or a
  restructure.
- New vocabulary lands in `cspell-words.txt` through the diff, and every
  authored markdown file passes Vale.

---

### Task 1: The journey fold

**Files:**

- Create: `packages/cli/src/shared/journey.ts`
- Create: `packages/cli/src/shared/journey.test.ts`,
  `packages/cli/src/shared/journey.property.test.ts`
- Modify: `packages/cli/src/shared/kanban.ts` (export the existing
  `refusalAfter` as is, so the standing-refusal rule keeps one home)

**Interfaces:**

- Consumes: `StoredItem` from `read-item.ts`, `parseItem`, `ITEM_STATUSES`,
  and the exported `refusalAfter`.
- Produces:

  ```ts
  export type JourneyMark = 'done' | 'active' | 'pending';
  export interface JourneyNode {
    id: string;
    kind: 'stage' | 'artifact' | 'child';
    title: string;
    mark: JourneyMark;
    at: string | undefined;
    child: string | undefined;
  }
  export interface Journey {
    item: string;
    title: string;
    nodes: JourneyNode[];
    edges: [string, string][];
    standing: string | undefined;
  }
  export function foldJourney(stored: StoredItem[], log: string, key: string): Journey | undefined;
  ```

- [ ] Red first, one behavior per test: an unknown key folds to undefined; a
      stored item without events folds to a single active node of its status; a
      chain of `transition · allowed` events folds to one node per visit in
      event order, done before the current status, the current status active,
      and the next pipeline status appended as a pending node; a second visit
      to the same status is a second node with a distinct id (`designing`, then
      `designing#2`); a write-gate `allowed` event whose `about` starts with
      `.ket/items/<key>/` becomes an artifact node titled by its file name,
      fanned from the stage visit that precedes it and joined to the next stage
      node; the item's `children` become child nodes fanned from the last stage
      visit, each carrying `child` set to its key; the standing refusal is the
      last `refused` event at or after the current arrival, through the same
      rule the kanban card uses.
- [ ] A fast-check property per invariant: every edge endpoint names an
      existing node id, and node ids never collide, whatever the log carries.
- [ ] Minimal fold until green, refactor to the naming rules, commit.

### Task 2: The feed serves the journey

**Files:**

- Create: `packages/cli/src/commands/watch/journey.test.ts` (hermetic
  directory with `.ket/items`, `events.jsonl`)
- Modify: `packages/cli/src/commands/watch/feed.ts`
- Modify: `packages/tui/src/shared/model/board.ts` (mirror the journey view
  types structurally, extend `BoardFeed`)

**Interfaces:**

- Consumes: `foldJourney`, `readStored`, `readLog`.
- Produces: `BoardFeed.journey(key: string): Promise<Journey | undefined>`
  on both sides of the boundary; the TUI mirror names the same fields.

- [ ] Red first: on a temporary root with one item and its events,
      `boardFeedFor(root).journey(key)` resolves to the folded journey; an
      unknown key resolves to undefined.
- [ ] Wire the method, green, commit.

### Task 3: The grid and the tokens

**Files:**

- Create: `packages/tui/src/shared/lib/grid.ts`,
  `packages/tui/src/shared/lib/grid.test.ts`,
  `packages/tui/src/shared/lib/grid.property.test.ts`
- Create: `packages/tui/src/shared/theme/palette.ts` (the Kanagawa tokens as
  named exports and one `Theme` record; the provider arrives in task 15)
- Modify: `packages/tui/src/shared/lib/index.ts`,
  `packages/tui/src/shared/model/index.ts` as the barrels need

**Interfaces:**

- Produces:

  ```ts
  export interface Cell {
    ch: string;
    fg?: string;
    bg?: string;
  }
  export interface Span {
    text: string;
    fg?: string;
    bg?: string;
  }
  export type Ln = Span[];
  export function gridOf(width: number, height: number): Cell[][];
  export function put(grid: Cell[][], x: number, y: number, ch: string, fg?: string): void;
  export function writeText(grid: Cell[][], x: number, y: number, text: string, fg?: string): void;
  export function boxAt(
    grid: Cell[][],
    x: number,
    y: number,
    width: number,
    height: number,
    style: 'rounded' | 'double',
    fg: string,
  ): void;
  export function spansOf(cells: Cell[]): Ln;
  export function lerpHex(from: string, to: string, amount: number): string;
  ```

- [ ] Red first: `put` merges crossing line characters through a bit union
      (a `─` over a `│` yields `┼`, a `╰` over a `╮` yields a junction, an
      arrowhead overwrites); out-of-bounds writes land nowhere; `boxAt` draws
      the two border styles; `spansOf` folds equal-color runs into one span;
      `lerpHex` mixes two colors channel by channel.
- [ ] Property: merging two line characters commutes, and `spansOf`
      round-trips the row text unchanged.
- [ ] Implement, green, commit.

### Task 4: The layout

**Files:**

- Create: `packages/tui/src/pages/journey/lib/layout.ts`,
  `packages/tui/src/pages/journey/lib/layout.test.ts`,
  `packages/tui/src/pages/journey/lib/layout.property.test.ts`

**Interfaces:**

- Consumes: the `Journey` mirror from `shared/model`.
- Produces:

  ```ts
  export interface PlacedNode extends JourneyNode {
    x: number;
    y: number;
  }
  export interface Placed {
    nodes: PlacedNode[];
    width: number;
    height: number;
  }
  export const NODE_W: number; // 22
  export const NODE_H: number; // 4
  export function placedOf(journey: Journey): Placed;
  export function neighborOf(
    nodes: PlacedNode[],
    selectedId: string,
    direction: 'up' | 'down' | 'left' | 'right',
  ): string;
  ```

- [ ] Red first: a linear chain places one node per layer, left to right; a
      fan places its members in one layer, vertically centered against the
      tallest layer; the layer of a node is its longest edge distance from a
      root; `neighborOf` picks the nearest node in the pressed direction,
      weighting the cross axis, and stays put at an edge of the graph.
- [ ] Property, from generated node-and-edge sets: no two placed boxes
      overlap, and every edge joins two placed nodes.
- [ ] Implement, green, commit.

### Task 5: The canvas rows

**Files:**

- Create: `packages/tui/src/pages/journey/lib/canvas.ts`,
  `packages/tui/src/pages/journey/lib/canvas.test.ts`

**Interfaces:**

- Consumes: `placedOf`, the grid module, the palette tokens.
- Produces:

  ```ts
  export function journeyRows(
    journey: Journey,
    selectedId: string,
    now: string,
    tick: number,
    view: { width: number; height: number },
  ): Ln[];
  ```

- [ ] Red first, asserting on joined row text: node boxes carry their
      titles and marks (a check for done, a spinner frame indexed by the tick
      for active, a hollow circle for pending); the selected node wears the
      double border; edges draw elbows and fan-ins merge into junctions; edges
      touching the selection carry a dot whose cell moves with the tick; the
      viewport slice follows the selection so an off-screen node pans into
      view; a child node wears the `»` mark.
- [ ] Implement, green, commit.

### Task 6: The journey page and the view stack

**Files:**

- Create: `packages/tui/src/pages/journey/ui/index.tsx`,
  `packages/tui/src/pages/journey/ui/index.test.tsx`
- Modify: `packages/tui/src/pages/watch/ui/index.tsx` (board selection, the
  frame stack, the breadcrumb), `index.test.tsx` beside it
- Modify: `packages/tui/src/app/index.ts`, `packages/tui/src/app/dev.ts` as
  the page props need

**Interfaces:**

- Consumes: `journeyRows`, `neighborOf`, `BoardFeed.journey`.
- Produces: the watch page owns a frame stack,
  `{ kind: 'board' } | { kind: 'journey'; item: string; sel: string }`, and
  passes quit upward as today.

- [ ] Red first with `testRender`: arrow keys move the board selection card
      by card and the selected card is the one with the double border; enter on
      a card renders the journey frame with the canvas title; arrows on the
      canvas move the node selection; escape pops back to the board; the
      breadcrumb spells `board › <key>`.
- [ ] Implement, green, commit. The keycap bar shows the frame's keys and
      drops entries that don't apply, exactly as the board hides a gate that
      isn't offered later.

### Task 7: Acceptance walks the canvas

**Files:**

- Modify: `scripts/acceptance-watch.sh`

- [ ] Extend the fixture with a second item, a write-gate `allowed` event
      for a design artifact, and a `children` entry; then drive the pty: enter
      the first card, expect its artifact node title and an elbow character on
      screen, walk the selection right, escape back to the board, and expect
      the column counts unchanged.
- [ ] Run the script, watch it pass, commit.

### Task 8: The artifact parsers come out pure

**Files:**

- Create: `packages/cli/src/shared/sketch.ts`,
  `packages/cli/src/shared/sketch.test.ts`,
  `packages/cli/src/shared/sketch.property.test.ts`
- Modify: `packages/cli/src/commands/item/surface/matrix.ts` (export the
  existing `matrixOf` and its `Matrix` types unchanged)
- Modify: `packages/cli/src/commands/item/surface/callout.ts` (export the
  existing `calloutsOf` and `Callout` unchanged)

**Interfaces:**

- Produces:

  ```ts
  export interface SketchNode {
    id: string;
    label: string;
  }
  export interface SketchEdge {
    from: string;
    to: string;
    label: string | undefined;
  }
  export interface Sketch {
    nodes: SketchNode[];
    edges: SketchEdge[];
  }
  export function sketchOf(source: string): Sketch;
  ```

- [ ] Red first for the d2 subset: `name: label` declares a node,
      `a -> b: label` declares an edge with a label and `a -> b` one without,
      an edge naming an undeclared endpoint declares it with its id as the
      label, nested blocks and keywords the subset doesn't know read past
      without harm.
- [ ] Property: every parsed edge endpoint exists among the parsed nodes.
- [ ] The two exports are pure refactors: no test changes, the existing
      suites stay green. Implement the parser, green, commit.

### Task 9: The docs ride the journey

**Files:**

- Create: `packages/cli/src/commands/watch/docs.ts`,
  `packages/cli/src/commands/watch/docs.test.ts` (hermetic item directory)
- Modify: `packages/cli/src/shared/journey.ts` (nodes gain
  `doc: SurfaceDoc | undefined`; stage nodes gain their ledger),
  `journey.test.ts` beside it
- Modify: `packages/cli/src/commands/watch/feed.ts` (journey passes through
  the docs builder), `packages/tui/src/shared/model/board.ts` (mirror)

**Interfaces:**

- Consumes: `readArtifact`, `readBlast`, `matrixOf`, `calloutsOf`,
  `sketchOf`, `plainState`.
- Produces:

  ```ts
  export type SurfaceDoc =
    | {
        kind: 'prose';
        label: string;
        tech: string;
        plain: string | undefined;
        note: string | undefined;
      }
    | {
        kind: 'design';
        label: string;
        tech: string;
        plain: string | undefined;
        note: string | undefined;
        callouts: Callout[];
        sketch: Sketch | undefined;
      }
    | { kind: 'sketch'; label: string; sketch: Sketch; callouts: Callout[] }
    | { kind: 'criteria'; label: string; name: string; source: string }
    | {
        kind: 'decision';
        label: string;
        tech: string;
        plain: string | undefined;
        drivers: string[];
        rows: MatrixRow[];
      }
    | { kind: 'diff'; label: string; text: string }
    | {
        kind: 'blast';
        label: string;
        base: string;
        collapse: number;
        budget: number;
        shown: number;
        uncollapsedNodes: number;
        uncollapsedEdges: number;
        sketch: Sketch;
      }
    | { kind: 'ledger'; label: string; lines: { at: string; text: string; refused: boolean }[] };
  export function docsFor(itemDir: string, journey: Journey): Promise<Journey>;
  ```

- [ ] Red first: a spec artifact folds to a prose doc with its plain
      sibling and the lag note when the plain file trails; the design folds
      with its callouts and the parsed sketch; the decision folds with the
      drivers and the verdict rows and its prose stripped of matrix lines; a
      feature file folds to a criteria doc named by its file; a diff and a
      blast fold with their numbers; a stage node's ledger lists that stage's
      events in order with refusals marked; a missing artifact leaves the node
      without a doc.
- [ ] Wire `feed.journey` through `docsFor`, green, commit.

### Task 10: The surface lines

**Files:**

- Create: `packages/tui/src/pages/surface/lib/lines.ts`,
  `packages/tui/src/pages/surface/lib/lines.test.ts`
- Create: `packages/tui/src/pages/surface/lib/sketch.ts` (draws a `Sketch`
  onto the grid: adaptive box widths, edge labels above the run, numbered
  badges on callout shapes), with its test beside it

**Interfaces:**

- Consumes: the `SurfaceDoc` mirror, the grid module, the palette.
- Produces:

  ```ts
  export type Audience = 'technical' | 'plain';
  export function docLines(doc: SurfaceDoc, audience: Audience): Ln[];
  export function sketchLines(sketch: Sketch, callouts: Callout[]): Ln[];
  ```

- [ ] Red first, asserting on joined line text and span colors: the
      audience tabs render with the selected pill, "No plain version written."
      when the plain side is missing, and the lag note when it trails; headings
      color, `Status:` and `Date:` lines render as badges, backtick spans
      render as chips; callout claims carry superscripts and the legend lists
      them; the matrix pads its columns, colors the verdict glyphs, tags the
      chosen row, and closes with the legend and the note verbatim; gherkin
      keywords color and the feature card head names the file; diff heads,
      hunks, additions, and deletions color; the blast doc opens with its
      measure chips and closes with the budget sentence the web surface
      builds; ledger refusals color red.
- [ ] Implement, green, commit.

### Task 11: The surface page

**Files:**

- Create: `packages/tui/src/pages/surface/ui/index.tsx`,
  `packages/tui/src/pages/surface/ui/index.test.tsx`
- Modify: `packages/tui/src/pages/watch/ui/index.tsx` (enter on a node with
  a doc pushes the surface frame; enter on a child pushes its journey),
  `index.test.tsx` beside it

**Interfaces:**

- Consumes: `docLines`.
- Produces: the frame
  `{ kind: 'surface'; title: string; doc: SurfaceDoc; aud: Audience; off: number }`.

- [ ] Red first: the page renders the doc lines inside a titled box; up and
      down scroll and clamp at both ends; the title carries the line range only
      while content overflows and the scroll keycap hides when it fits; tab and
      the horizontal arrows switch the audience when a plain side exists;
      escape pops; a child node's enter lands in the child journey and the
      breadcrumb grows.
- [ ] Implement, green, commit.

### Task 12: The gates through the feed

**Files:**

- Create: `packages/cli/src/commands/item/stage.ts` (the stage mover
  extracted from the command body, unchanged behavior),
  `packages/cli/src/commands/item/stage.test.ts`
- Modify: `packages/cli/src/commands/item/command.ts` (the `stage` factory
  calls the mover)
- Modify: `packages/cli/src/shared/kanban.ts` and its tests (cards gain
  `offers`), `packages/cli/src/commands/watch/feed.ts`,
  `packages/tui/src/shared/model/board.ts`

**Interfaces:**

- Consumes: `approvalOf`, `shipmentOf`, `reopeningOf`, `read`, `write`,
  `record`.
- Produces:

  ```ts
  export type GateAction = 'approve' | 'ship' | 'reopen';
  export type Moved = { moved: ItemStatus } | { refused: string };
  export function moveThrough(root: string, key: string, name: string, decide: Decision): Promise<Moved>;
  // on the card:
  offers: GateAction[];
  // on the feed:
  act(key: string, gate: GateAction): Promise<Moved>;
  ```

- [ ] Red first: `moveThrough` writes the moved item and records the
      allowed transition; a refusal records the refused event and returns it
      instead of throwing; the command still prints and throws exactly as
      before, so its existing tests stay green untouched.
- [ ] Red for `offers`: a card offers exactly the gates whose pure
      transition accepts its status, derived by dry-running `approvalOf`,
      `shipmentOf`, and `reopeningOf`, never by naming statuses a second time.
- [ ] Red for the feed: `act` on an eligible item moves it and the next
      snapshot shows the move; `act` on an ineligible item returns the refusal
      and the log carries it.
- [ ] Implement, green, commit.

### Task 13: The gate ceremony

**Files:**

- Create: `packages/tui/src/pages/watch/ui/gate.tsx`, with its test beside
  it
- Create: `packages/tui/src/shared/lib/confetti.ts`, with its test beside
  it
- Modify: `packages/tui/src/pages/watch/ui/index.tsx`, tests beside it

**Interfaces:**

- Consumes: `BoardFeed.act`, the card's `offers`, the torii rows, the
  palette.
- Produces: the frame
  `{ kind: 'gate'; action: GateAction; cardKey: string; cardTitle: string; phase: 'ask' | 'pass' | 'refuse'; reason: string | undefined; since: number }`
  and `confettiRows(tick: number, width: number, rows: number): Ln[]`.

- [ ] Red first for the pure part: confetti rows scatter deterministic
      particles that move between ticks.
- [ ] Red for the page: the key bar lists a gate key only while the
      selected card offers it, and an unoffered key does nothing; an offered
      key opens the ask modal with the transition chips; enter calls `act`,
      shows the pass phase, and the modal closes itself after its ticks; a
      refusal from `act` shows the refuse phase and the reason; escape cancels
      without acting.
- [ ] Implement, green, commit.

### Task 14: Criteria editing

**Files:**

- Create: `packages/tui/src/pages/surface/lib/edit.ts`, with test and
  property test beside it
- Create: `packages/cli/src/commands/watch/save.test.ts`
- Modify: `packages/cli/src/commands/watch/feed.ts`,
  `packages/tui/src/shared/model/board.ts`,
  `packages/tui/src/pages/surface/ui/index.tsx` and its tests

**Interfaces:**

- Produces:

  ```ts
  export interface Cursor { l: number; c: number }
  export interface Draft { lines: string[]; cur: Cursor }
  export function inserted(draft: Draft, text: string): Draft;
  export function erased(draft: Draft): Draft;
  export function split(draft: Draft): Draft;
  export function moved(draft: Draft, direction: 'up' | 'down' | 'left' | 'right'): Draft;
  // on the feed:
  saveCriteria(key: string, name: string, source: string): Promise<void>;
  ```

- [ ] Red first for the model: insertion lands at the cursor and advances
      it; backspace at a line head joins lines; enter splits at the cursor;
      movement clamps to line ends. Property: after any operation sequence the
      cursor stays inside the draft.
- [ ] Red for the feed: `saveCriteria` writes only a `.feature` file that
      resolves inside the item's directory, refuses any path that escapes, and
      records a write-gate `allowed` event for the saved path.
- [ ] Red for the page: `e` starts editing on a criteria doc and only
      there; typing flows through the model with functional state updates so a
      fast burst loses nothing; ctrl+s saves through the feed and flashes the
      confirmation; unsaved work wears its mark; `q` types while editing
      instead of quitting.
- [ ] Implement, green, commit.

### Task 15: The list layout

**Files:**

- Create: `packages/tui/src/pages/watch/ui/list.tsx`, with its test beside
  it
- Modify: `packages/tui/src/pages/watch/ui/index.tsx` and tests

- [ ] Red first: `v` swaps the layouts and its keycap names the layout
      you'd switch to, never the current one; the list shows key, stage, age,
      title, and the refusal at the end of the row; up and down walk the flat
      list; enter, the gates, and the offers behave exactly as on the kanban;
      a gate move keeps the selection on the moved card.
- [ ] Implement, green, commit.

### Task 16: Themes and the picker

**Files:**

- Create: `packages/tui/src/shared/theme/themes.ts` (the thirteen palettes
  from the spec, nine dark and four light, each mapped from its canonical
  source), with a test beside it
- Create: `packages/tui/src/shared/theme/context.tsx` (provider and
  `useTheme`), `packages/tui/src/pages/watch/ui/theme.tsx`, tests beside
  both
- Modify: every component reading `palette.ts` directly moves to
  `useTheme` (a pure refactor: existing component tests stay green)

**Interfaces:**

- Produces:

  ```ts
  export interface Theme {
    base: string;
    mantle: string;
    surface0: string;
    surface1: string;
    overlay: string;
    gray: string;
    text: string;
    subtext: string;
    blue: string;
    blue2: string;
    aqua: string;
    green: string;
    yellow: string;
    orange: string;
    orange2: string;
    red: string;
    red2: string;
    violet: string;
    violet2: string;
    pink: string;
  }
  export const THEMES: [string, Theme][];
  export function ThemeProvider(props: { children: ReactNode }): ReactNode;
  export function useTheme(): {
    theme: Theme;
    name: string;
    preview: (index: number) => void;
    keep: (index: number) => void;
    revert: () => void;
  };
  ```

- [ ] Red first for the table: thirteen entries, every token a hex color,
      Kanagawa first as the default.
- [ ] Red for the picker: `t` opens it over any frame except a gate;
      moving the selection previews the theme so the board behind repaints;
      enter keeps it, escape restores the one you came from; each row carries
      a strip of the theme's own colors; the header names the active theme.
- [ ] Implement, green, commit.

### Task 17: Chrome, acceptance, and the mutation gate

**Files:**

- Create: `packages/tui/src/shared/ui/banner.tsx`, with its test beside it
- Modify: `packages/tui/src/pages/watch/ui/index.tsx` (banner, breadcrumb,
  live dot on the animation tick), `scripts/acceptance-watch.sh`

- [ ] Red first: the banner renders the torii and the block letters with a
      gradient that shifts with the tick; the header carries the live dot and
      the active theme name.
- [ ] Extend acceptance: open a journey, open a surface, pass a gate from
      the board with a fixture item standing before it, and read the moved
      column count from the frame.
- [ ] Run the whole wall locally: package tests, lint, types, prose,
      spelling, acceptance.
- [ ] Run `bun run test:mutation` at the root, once. Kill every survivor
      with a better test or a restructure, never a threshold.
- [ ] Update the pull request body to the control-room scope, commit.

## Self-review

- Spec coverage: the board (tasks 6, 15), the canvas (1 through 7), the
  log derivation (1), the feed (2, 9, 12, 14), the surfaces (8 through
  11), the gates (12, 13), editing (14), theming (16), motion and chrome
  (5, 13, 16, 17), realtime (already shipped, exercised in 7 and 17),
  boundaries and testing (global constraints, every task).
- Open questions from the spec stay open: no side-by-side diff task, no
  terminal-derived themes task.
- Type names cross tasks consistently: `Journey`, `JourneyNode`,
  `SurfaceDoc`, `Sketch`, `Ln`, `GateAction`, `Moved`, `Theme`.
