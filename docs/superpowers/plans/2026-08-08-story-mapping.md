# Story mapping v1 implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:executing-plans`
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** an idea-only project gets a mapping session, a durable
`.ket/story-map.yaml`, and a `ket map` view reachable from the board.

**Architecture:** the spec at
`docs/superpowers/specs/2026-08-08-story-mapping-design.md` governs. Domain
beside the command in `packages/cli/src/commands/map/`, a Feature-Sliced page
in `packages/tui`, the method as a skill and a command in the workflow
plugin. The CLI imports no renderer, the TUI parses nothing.

**Tech stack:** Bun, citty, the `yaml` package (add to packages/cli),
OpenTUI react, Vitest plus fast-check, `bun test` for `*.test.tsx`.

## Global constraints

- Red first, always: probity blocks a production write until a failing test
  covers it. Run the failing test before each implementation step.
- No code comments except a constraint code can't express. No em dashes.
- Never weaken a gate. oxlint complexity 5, max-lines 300,
  max-lines-per-function 50, jscpd threshold 0 apply.
- Commits through caveman-commit, each ending with the trailer:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Branch: `feat/story-map` off origin/main, one PR, merge on green CI only.
- Finish with the full wall (`bun run test`, `lint`, `check-types`, `build`,
  `lint:dead`, `lint:dup`, `lint:spell`, `lint:prose`) and
  `bun run test:mutation` inside each touched package, never at the root.

## Task 1: the map schema and its reading

**Files:**

- Create: `packages/cli/src/commands/map/schema.ts`
- Create: `packages/cli/src/commands/map/schema.test.ts`
- Modify: `packages/cli/package.json` (add `"yaml": "2.8.1"` to dependencies)

**Interfaces (produces):**

```ts
export interface StoryMap {
  version: 1;
  product: { name: string; idea: string };
  users: { id: string; name: string }[];
  releases: { id: string; name: string; outcome: string; metric: string }[];
  activities: {
    id: string;
    name: string;
    steps: {
      id: string;
      name: string;
      stories: { id: string; name: string; user?: string; release?: string }[];
    }[];
  }[];
}

export type MapReading = { absent: true } | { refusals: string[] } | { map: StoryMap };

export function readMap(source: string | undefined): MapReading;
```

`readMap` takes the file's text, or `undefined` when no file exists. Every
refusal names the node: `the release r-skeleton carries no outcome`,
`the story st-see-products points at r-gone, which no release declares`,
`the id st-dup appears twice`. `users` and per-story `user`/`release` are
optional. A missing `users` key reads as an empty list.

- [ ] Write behavior specs in `schema.test.ts`, Given/When/Then naming, one
      per refusal and one happy path. Cover: absent source, text YAML can't
      parse, a shape without `activities`, a duplicate id across any nodes, a
      dangling `release` reference, a dangling `user` reference, a release
      missing `outcome`, a release missing `metric`, and a full valid map
      returning the parsed structure with order preserved.
- [ ] Run `bunx vitest run src/commands/map/schema.test.ts` inside
      packages/cli. Expected: the run fails on the missing module.
- [ ] Implement `schema.ts`: parse with `yaml`'s `parse` inside a try that
      returns a refusal carrying the parser's message, then hand-rolled
      guards in the repo's `isRecord` style, collecting refusals rather than
      throwing. Keep each guard under complexity 5 by splitting per node
      kind (`refusalsOfRelease`, `refusalsOfStory`, `duplicateIdsAmong`).
- [ ] Run the suite. Expected: the suite passes. Commit:
      `feat(cli): read the story map`

## Task 2: the invariants as properties

**Files:**

- Create: `packages/cli/src/commands/map/schema.property.test.ts`

**Interfaces (consumes):** `readMap`, `StoryMap` from Task 1.

- [ ] With fast-check, generate valid maps (unique ids from a prefixed
      counter arbitrary, stories optionally referencing a generated release
      or user) and serialize them with `yaml`'s `stringify`. One property
      per invariant: a generated valid map reads back with zero refusals;
      reading preserves activity, step, story, and release order. And one
      more: replacing one story's `release` with an undeclared id makes the
      reading refuse with a message naming both ids.
- [ ] Run, expect red on the missing module wiring, then green once the
      arbitraries drive the Task 1 implementation. If a property finds a
      defect, fix `schema.ts` first.
- [ ] Commit: `test(cli): pin the story map invariants`

## Task 3: the fold the view renders

**Files:**

- Create: `packages/cli/src/commands/map/fold.ts`
- Create: `packages/cli/src/commands/map/fold.test.ts`

**Interfaces (produces):**

```ts
export interface MapView {
  product: { name: string; idea: string };
  spine: { activity: string; steps: { id: string; name: string }[] }[];
  bands: {
    id: string | undefined;
    name: string;
    outcome: string | undefined;
    cards: { id: string; name: string; step: string; user?: string }[];
  }[];
}

export function foldMap(map: StoryMap): MapView;
```

The last band is always the unassigned bucket (`id: undefined`, name
`unassigned`, no outcome). Bands come in release order. Cards carry their
step id so the view can column them.

- [ ] Specs first: every story lands in exactly one band; a story without a
      release lands in the unassigned band; bands keep release order and the
      unassigned band closes the list; the spine lists steps in map order
      under their activity. Run red.
- [ ] Implement as pure functions. Run green.
- [ ] Add one fast-check property to `fold.test.ts` or a sibling property
      file: for any valid generated map, the card ids across bands, counted
      with repeats, equal the story ids in the map.
- [ ] Commit: `feat(cli): fold the story map for the board`

## Task 4: the command and the home-screen rulings

**Files:**

- Create: `packages/cli/src/commands/map/command.ts` (adapter, excluded from
  mutation like the other `commands/*/command.ts`)
- Modify: `packages/cli/src/run.ts` or the citty root definition (find it:
  `grep -rn "subCommands" packages/cli/src`) to register `map` and to make a
  bare `ket` on a terminal run the `watch` command, keeping usage output
  when standard output goes to a pipe.
- Test: extend `packages/cli/src/run.usage.test.ts` neighbors if a bare-run
  behavior test exists; otherwise the acceptance script in Task 6 carries it.

**Interfaces (consumes):** `readMap` and `foldMap`, plus the lazy TUI import
pattern from `packages/cli/src/commands/watch/command.ts` (read it first).

- [ ] Read `watch/command.ts` and mirror its shape: read
      `.ket/story-map.yaml` under the resolved ket root, build
      `MapReading`, and hand `{ reading, view }` to the TUI through
      `await import('@ket/tui/map')` (match watch's actual specifier
      style). Refusals print to stderr with exit code 1 and never open the
      TUI. The absent state still opens the TUI, which renders the empty
      state.
- [ ] Wire bare `ket` to watch on a terminal. Verify by hand:
      `bun packages/cli/src/run.ts` inside a scaffold opens the board, and
      `bun packages/cli/src/run.ts | cat` prints usage.
- [ ] Commit: `feat(cli): open the map from ket and its own command`

## Task 5: the map page and the board key

**Files:**

- Create: `packages/tui/src/pages/map/` (a Feature-Sliced Design slice:
  `ui/index.tsx`, `lib/` for layout math, `index.ts` public surface)
- Modify: the watch board chrome to add the `m` key routing to the map page
  and escape back (find the view stack the board already keeps for journeys
  and surfaces; the map joins it as one more layer)
- Test: `packages/tui/src/pages/map/ui/index.test.tsx` under `bun test`,
  layout math under vitest in `lib/*.test.ts`

**Interfaces (consumes):** `MapView` and `MapReading` from Task 3 and 4.
Import them as types the way the kanban view types travel today: search for
`KanbanColumnView` and mirror that channel.

- [ ] Specs red first, following the board harness pattern with `lands` and
      `leaves` waypoints per press: the spine renders activities over their
      steps; each band draws its name and outcome and every card under its
      step column; the unassigned band renders even when empty; arrow keys
      move the selection card by card and the detail line spells the
      selected story's name, user, and release; the key hints sit in the
      bottom bar; `m` on the board opens the map and escape returns; the
      absent state renders the polished empty screen naming `/ket:map`.
- [ ] Implement: layout math as pure functions in `lib/` (vitest,
      mutation-gated), rendering in `ui/`, theme tokens from the shared
      palette, the bottom key bar reused from the board (after
      fix/watch-bottom-bar-and-columns lands, rebase and reuse its piece).
- [ ] Run `bun test` for the tsx suites and vitest for lib. Green.
- [ ] Commit: `feat(tui): the story map screen and its board key`

## Task 6: the acceptance scenario

**Files:**

- Create or extend: follow `scripts/acceptance-watch.sh` precedent with a
  map scenario (`scripts/acceptance-map.sh` wired into the root
  `test:acceptance` chain in package.json)

- [ ] Read `scripts/acceptance-watch.sh` first and mirror its driving
      mechanism. Scenarios: a scaffold without a map runs `ket map` and the
      screen carries the empty-state instruction naming `/ket:map`; writing
      a small valid `story-map.yaml` into `.ket/` and rerunning renders the
      product name and a band name; a broken map (dangling release
      reference) exits 1 and stderr names both ids.
- [ ] Wire into `test:acceptance`, run it, expect green.
- [ ] Commit: `test(acceptance): drive the map screen`

## Task 7: the method in the workflow plugin

**Files:**

- Create: the story-mapping skill under `harness/workflow/skills/story-mapping/`
- Create: `harness/workflow/commands/map.md`

- [ ] Write the skill from the spec's interview law, in the voice of the
      existing skills (read the stages skill under
      `harness/workflow/skills/stages/` first): frame with at least two clarifying questions, activities left
      to right in narrative order a mile wide and an inch deep, walk the map
      back, fill shallow, slice the walking skeleton with outcome and metric
      before sorting, write the map file matching the schema in the spec
      (embed the spec's example verbatim), run `ket map`, end by showing
      the person their map. Guardrails verbatim from the spec. State the
      refusal contract: a release without outcome and metric never gets
      written.
- [ ] Write `commands/map.md` in the voice of `commands/feature.md`: load
      the skill, run the session, write the file.
- [ ] `bun run lint:prose` and `bun run lint:spell` clean.
- [ ] Commit: `feat(harness): the story mapping session`

## Task 8: the wall and the pull request

- [ ] Full wall at the root, plus `bun run test:mutation` inside
      packages/cli and packages/tui (per-package only; the two documented
      feed.ts survivors on main aren't yours).
- [ ] Push `feat/story-map`, open the PR against main describing the spec
      it implements, merge only on green CI.

## Self-review notes

- Task 4 depends on the watch command's actual export shape; read before
  mirroring, and if watch exposes a feed builder rather than a page import,
  follow whatever the real seam is and keep the boundary rule: the TUI
  parses nothing.
- Task 5's board-key wiring touches files the bottom-bar branch changes;
  rebase on main after that branch merges before starting Task 5.
- The `yaml` version pin: check the registry for the current 2.x at
  implementation time and pin exact, matching how packages/cli pins deps.
