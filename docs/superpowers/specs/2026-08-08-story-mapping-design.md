# Story mapping under ket

Date: 2026-08-08. Status: direction approved by the owner, v1 scope chosen:
the interview, the file, and the view. The bridge to feature files waits.

## Why

A person starts a project with an idea and nothing else. Story mapping, Jeff
Patton's method, turns that idea into a walkable model: the journey across
the top, the work beneath it, releases as horizontal cuts. Every practitioner
account of the method failing tells the same story: the map gets built in a
workshop, photographed, and never opened again. The named fixes are an owner,
a review cadence, and one findable home.

A file under `.ket/` that lands through a pull request, that the TUI renders,
and that later work drives from, satisfies all three. No whiteboard tool
can. The product sentence: the map that can't go stale.

## The shape of v1

- A mapping session builds the map and writes `.ket/story-map.yaml`.
- `ket map` renders it in the terminal, read only.
- The file is the editing surface between sessions: hand edits arrive
  through pull requests like any other change.
- Out of v1, recorded below: generating feature files, linking kanban items
  to stories, any multi-repository story.

## The map file

One product, one map, one home: `.ket/story-map.yaml`. YAML because the map
is a document a person edits by hand in a pull request, and a hand-edited
document earns comments and quiet diffs. The owner's companion ruling: the
rest of `.ket`'s structured documents move to YAML with it, so the directory
speaks one document format. The event log stays a stream, and the board
stays prose. That conversion is its own branch, not this one.

The owner's ruling on
separate web and API repositories: don't solve it now. A web project keeps
its map in the web repository. The future monorepo preset gives the map its
obvious root home, and someone who splits surfaces across repositories is on
their own.

The schema follows where the tooling landscape already converged: three
levels down, releases across.

```yaml
version: 1
product:
  name: shop
  idea: one sentence saying what this is and for whom
users:
  - id: u-shopper
    name: shopper
releases:
  - id: r-skeleton
    name: walking skeleton
    outcome: a shopper completes one real purchase end to end
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
```

- `activities`, `steps`, `stories`: the backbone and its ribs. An activity
  and a step are verb phrases, never nouns, because nouns turn the map into
  a feature list.
- `releases` is an ordered list, and a story points at one through a scalar
  `release`. A story without a `release` sits in the unassigned bucket,
  which is a normal place to be, not an error.
- A release carries `outcome` and `metric`, always. A release that's only a
  name is the method's best documented failure mode, and the schema refuses
  it rather than warning about it.
- Every node carries a stable id. The event log and the future feature
  bridge will point at stories, so ids never change once written, and no
  story names a repository or a file.
- Array order is the order. No rank fields: a reorder reads as a coherent
  diff, which is the point of keeping the map in one file.
- `users` is optional, and a story's `user` is optional. The interview
  produces them on its own. The view shows them when present.
- Vocabulary: `slice` stays reserved for Feature-Sliced Design. The
  horizontal cut of the map is a `release`, matching what every mapping tool
  calls it.

## The interview

An open interview is a conversation, not a form the CLI could hold. The
method ships as a skill and a command in the workflow plugin, beside the
pipeline commands:

- `harness/workflow/skills/story-mapping/SKILL.md` carries the method: the
  order of Patton's moves, the stopping rules, and the failure modes to
  steer away from.
- `harness/workflow/commands/map.md` is `/ket:map`, the session entry. It
  loads the skill, runs the interview, and writes the file.

The skill's law, distilled from the sources:

1. Frame first: what this is, for whom, and why now. Never produce a map
   without asking at least two clarifying questions.
2. Map the big picture: activities left to right in narrative order, a
   handful of them, mile wide and inch deep. Depth on the first pass is the
   documented way to lose the room.
3. Walk the map back to the person: telling the story end to end is what
   surfaces missing steps.
4. Fill steps and stories under each activity, still shallow.
5. Slice the walking skeleton: the smallest end to end path, as the first
   release, with its outcome and metric stated before anything gets sorted
   into it.
6. Write the file, run `ket map`, and end by showing the person their map.

Guardrails the skill states outright:

- A card is a verb phrase, never a noun.
- The map isn't a flowchart, so branching what-ifs stay off it.
- A release without an outcome doesn't leave the session.
- The map of a whole product stays a mile wide.

## The command and the view

`ket map` reads `.ket/story-map.yaml`, validates, and renders. It follows the
watch architecture: the command parses arguments and builds the data, the TUI
renders it through the lazy import, and the TUI parses nothing.

The owner's home-screen rulings sit beside it:

- Bare `ket` on a terminal opens the board, so watch is the home screen.
  Without a terminal it keeps printing usage, so a script never hangs on a
  render.
- From the board, the `m` key opens the map view, and escape returns.
- A project without a map gets a polished empty state on that screen: what
  a story map is in one sentence, and the `/ket:map` session that starts
  one.

- The backbone runs across the top: activities as column groups, steps as
  columns beneath them.
- Story cards hang under their step in map order.
- Release bands cut horizontally in release order, each labeled with its
  name and outcome. The unassigned bucket is the last band.
- Arrow keys move the selection card by card, matching the board's feel.
  The selected card shows its full text, its user, and its release in a
  detail line.
- The key hints live in a bottom bar, and every band renders even when
  empty, matching the board rulings.
- Theming rides the existing token palette and the `t` picker as shipped.
- No editing in v1: the file and the interview are the writing surfaces.

Reading is a typed result, never a throw, and each refusal names the path
and the node:

- no file: the empty state says how to start, naming `/ket:map`.
- broken YAML or unknown shape: which line or key.
- duplicate id, unresolved `release` or `user` reference: which id, where.
- a release missing `outcome` or `metric`: which release.

## Domain and boundaries

- `packages/cli/src/commands/map/` holds the command and its domain beside
  it: schema types, the parser, the validator, and the fold that turns a map
  into what the view renders. Pure, node-only, mutation gated.
- The view is a page in `packages/tui` under Feature-Sliced Design, steiger
  enforced, reusing the shared theme and key bar pieces the board uses.
- The CLI imports no renderer; the TUI parses no YAML. The command hands the
  TUI a parsed map, exactly as watch hands it a feed.

## Testing

Test first, inside out, state based:

- Example tests for each typed refusal: missing file, broken YAML, duplicate
  id, dangling reference, a release without outcome or metric.
- Property tests, one per invariant: every id in a valid map is unique;
  every `release` and `user` reference resolves; parse then serialize
  preserves order; the fold places every story exactly once.
- TUI tests follow the board's harness pattern under `bun test`, with
  waypoints per press.
- The scenario for the command joins the acceptance suite: a project with a
  map renders it, a project without one gets the empty state.

## Recorded for later, not built now

- The feature bridge: example mapping between a story and its Gherkin, rules
  and examples as intermediate artifacts, feature files landing under
  `features/<activity>/<step>.feature` with `Rule:` blocks, and the open
  question count gating generation. This earns its own design.
- Kanban items referencing story ids, and the board showing a card's story.
- The monorepo preset placing the map at the root.
- Editing the map inside the TUI.
- A commit gate validating the map file in scaffolded projects.
