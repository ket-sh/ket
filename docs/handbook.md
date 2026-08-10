---
category: reference
sources:
  - packages/cli/src/commands/**
  - packages/preset/src/**
  - presets/cli/src/**
  - presets/web/src/**
  - harness/**
stamp: ad7ca5860324
---

# The ket handbook

Everything a newcomer needs to go from never having seen ket to knowing what
runs, when it runs, and why it refuses. Share this file whole.

## What ket is

ket scaffolds and governs projects that AI agents build. It exists to make one
claim hold: AI-written code is what it appears to be. Every rule a team would
keep by discipline becomes a machine that checks it. Every piece of work is an
item with a visible history, and every claim about quality gets measured
rather than asserted. The measurement at the center is mutation score: a suite
that executes code without checking it gets caught, because a rule kept at
less than 100 lets mutants through.

Two presets exist today. The `web` preset writes a TanStack Start application
under Feature-Sliced Design. The `cli` preset writes a command line tool whose
slices are commands. Both arrive with the whole gate chain armed, the harness
plugins registered, and the pipeline ready.

## What a created project contains

- `.ket/config.yaml` maps each directory to the preset that governs it and
  records the project key, the chosen integrations, the language, and whether
  the workflow drives it. It's data, never code.
- `.ket/items/<key>/` holds one directory per piece of work: `item.yaml` with
  the title, kind, size, status, parent, children, and description, beside the
  artifacts each stage writes.
- `.ket/events.jsonl` is the append-only log. Every gate decision lands here,
  and every view folds from it.
- `.ket/story-map.yaml` holds the product's story map when one exists.
- `.ket/toolchain.yaml` and `.ket/scaffold.yaml` are machine state: which
  dependencies the toolchain gate has already named, and which files the
  scaffold wrote.
- `.mcp.json` appears when a chosen integration serves a Model Context
  Protocol (MCP) server. Choosing mobbin registers the hosted Mobbin server
  there, the design stage searches it before drawing a screen, and
  `ket update` merges the entry into a project scaffolded before it existed.
- `package.json` carries what the preset ships and what each chosen
  integration pins. `ket update` merges it the same way: it adds the pins and
  scripts the project is missing, never rewrites a version or a script the
  project made its own, and writes nothing when nothing is missing. That's
  how an integration chosen after create still lands its dependencies. The
  update leaves a manifest it can't read untouched and says why nothing
  merges rather than rebuilding the file.
- Two Claude Code plugins carry the law: `ket-gates` arms the gates, and
  `ket` carries the pipeline commands and their skills.

## The pipeline

Work is an item. An item has a kind (`feature`, `bug`, `refactor`, `chore`),
a size (`epic`, `story`, `subtask`, `trivial`), and one status:

```
idea → triaged → designing → awaiting-approval → implementing
     → verifying → awaiting-merge → shipped
```

Epics and stories owe a design stage. An epic never gets implemented directly:
it decomposes into children, and the children travel the pipeline. An item
sized `subtask` or `trivial` skips the design stage. Only a command moves a
status, and
the write gate refuses a hand edit of `item.yaml`'s fields, because a status
anything can write is a status that means nothing.

An item can also name the story on the map it came from. `ket item file --story <id>`
records that id on the item, and an id the map never declared refuses with both
the id and `.ket/story-map.yaml` named in the message. An item filed before the
map named anything carries no story and stays valid.

### The commands that drive it

| Command               | What it does                                                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ket:feature`        | Files a piece of work, writes its title and description to the issue-writing standard, and carries it to the first gate                                                                                                           |
| `/ket:explore`        | Investigates before filing, when the shape of the work is unclear                                                                                                                                                                 |
| `/ket:approve <key>`  | The human approves the design; implementation may start                                                                                                                                                                           |
| `/ket:continue <key>` | Picks an item up and runs the next machine stage                                                                                                                                                                                  |
| `/ket:review <key>`   | Runs the review stage on the work                                                                                                                                                                                                 |
| `/ket:ship <key>`     | The human confirms the merged work landed                                                                                                                                                                                         |
| `/ket:status`         | Reports where every item stands                                                                                                                                                                                                   |
| `/ket:map`            | Runs the story mapping discovery session that frames the product, scans the market, and probes each activity in Socratic depth passes with researched proposals. Only you close it, and the result lands in `.ket/story-map.yaml` |

### The four human gates

The pipeline stops for a person exactly four times. Everything between them
runs without asking.

1. Triage: you confirm the kind and the size before the pipeline files
   anything.
2. Decomposition: you pick which children an epic files. Scope belongs to the
   person paying for it.
3. Approval: you approve the design before implementation writes any source.
4. Shipping: you confirm the merged work landed. A machine reads a green
   pipeline, and only a person knows the product changed.

At the third and fourth gate, the review surface opens in the browser so you
decide looking at the work, not at a summary of it.

### Watching it run

Bare `ket` on a terminal opens the board: every stage as a lane, cards with
their ages, refusals in red, a bell on any card that needs you. The shipped
lane shows only its five newest cards while its title carries the true
total, and the `x` key opens the archive, which lists everything shipped,
newest first. From the board, `enter` opens an item as two legends: the
tabbed stage area beside the item pane, with `f` handing the focused legend
the full width. The tabs are overview, workflow, children, and artifacts.
The overview renders the description as a markdown preview that scrolls
under the arrows, `j`, and `k`. The workflow draws the stage canvas with
each stage's sub-steps as boxes, one per artifact the stage wrote. The item
pane frames its facts under labeled rules and spells any waiting gate as a
key to press, so `a` approves from the journey too. The `b` key shows
the backlog, `m` opens the story map, `v` flips to a flat list, `l` opens the
oplog over the last 500 logged events newest first, and `t` picks a theme.
The `d` key opens the docs screen. The catalog groups the pages by category,
with the ADRs and the architecture nodes as their own shelves, and each page
wears its rot state. The detail pane names the chosen page's sources, its
stamp state, and the last commit that touched it. `ket watch --screen docs`
lands there directly.
`ket retro` folds the week's events into a report that names what slowed
you, and every action it derives carries a numbered draft with its
evidence. `ket retro adopt 1` files the first draft as an idea item that
explains itself without the log. A terminal run ends with an adopt-or-skip
tour over the drafts, and `ket retro --json` hands a session the same drafts
structured.

## The gates, by the moment they fire

ket's gates aren't a checklist at the end. They sit at every moment work
happens, earliest first:

### When a session starts

- **The toolchain gate** names any dependency that arrived since it last
  looked, once. The `mechanical-checks` skill answers it: find the checker the
  ecosystem already ships, judge whether it earns its cost, and propose it.
  The user decides. Never install a checker to demonstrate it.

### At every write, before it lands

- **The write gate** asks the item in flight whether this file is its
  business. Generated files refuse hand edits. Item state files refuse
  everything except the commands that own them.
- **The test-first gate** (probity) blocks a production edit under
  `packages/*/src` until a failing test covers it. Red comes first, at the
  edit itself, not at review time.
- **Repository guardrails** refuse edits to `bun.lock`, `.env` files, and key
  material.

### At every shell command, before it runs

- **The shell gate** refuses a command that would skip a gate, and refuses
  writes routed through interpreters it can't judge. When it allows a command
  that runs a script the preset declares as a gate, it records the run under
  the declared name, which is what `ket retro` reads to rank the gates a week
  left quiet.

### After every write

- **Ring one** runs on the file alone: the formatter, the linter with
  warnings denied, and the domain tests that cover the written file. A write
  is cheap to check, so ring one checks every one.
- The toolchain gate looks at what the edit brought.

### At the end of a stage

- **Ring two** runs project-wide: the typechecker and the layering check.
  A stage ends on the whole picture, not on the last file.

### When the session tries to stop

- **The turn gate** asks whether the item reached a resting place. It refuses
  a stop in the middle of a stage and names the next step, up to three times
  per standing.
- **The rules reviewer** reads the uncommitted diff against the project's own
  law: comment rules, naming, test-shape, boundaries.
- **The security reviewer** reads the same diff for secrets, injection
  surfaces, and trust boundary crossings.

### At every commit

The lefthook chain runs:

- gitleaks over the staged files, and main-branch protection.
- The linter, duplication at threshold zero, spelling, and dead exports.
- The layering check and the import graph.
- The preset's own checks: a ui component ships its story and test, the env
  matches its schema, and every BDD step binds to the harness.
- The formatter, workflow linting, and the typechecker.

The commit message passes commitlint.

### At every pull request

CI runs the same chain plus the acceptance suites, which drive the compiled
binary against real scaffolded projects. A mutation run retests what the
pull request changed against its merge base. The dependency audit runs here
too. Prose passes Vale.

### Weekly

The full mutation battery runs over everything, and a created project runs
it on every push to main as well, so nothing hides behind the scoped runs
for long.

### Always

No gate gets switched off, overridden, or loosened to reach green. A blocking
gate is a design signal. When code genuinely can't satisfy a rule, the
maintainer decides, and an authorized change lands with an ADR recording why.

## The skills

Skills are the law in loadable form. Each says when it applies. The session
loads the one that applies and works from it rather than from a summary.

### Carried by the `ket-gates` plugin (the gates)

| Skill               | When it applies                                                   |
| ------------------- | ----------------------------------------------------------------- |
| `tdd`               | The order tests arrive in: red, green, refactor, inside out       |
| `mutation`          | How to kill a surviving mutant, and why the threshold never moves |
| `gates`             | What each gate failure is telling you                             |
| `suppression`       | What to reach for instead of turning a gate off                   |
| `clean-code`        | Naming, size, purity, and the domain vocabulary                   |
| `commit`            | Terse Conventional Commits, why over what                         |
| `gherkin`           | The six checks a scenario passes                                  |
| `design-tokens`     | What may be a token, and why the gate refuses raw values          |
| `generated`         | Who owns, regenerates, and protects generated files               |
| `adr`               | When a decision earns a record under `docs/adr/`                  |
| `research`          | Where an answer comes from and what a finding must carry          |
| `prior-art`         | Look for what exists before building                              |
| `mechanical-checks` | Turn a hand-kept rule into a machine, and propose it              |
| `verification`      | What counts as evidence of finished work                          |

### Carried by the `ket` plugin (the pipeline)

| Skill           | When it applies                                                |
| --------------- | -------------------------------------------------------------- |
| `stages`        | The stage table, the moving commands, and the four human gates |
| `sizing`        | Which size an item takes, and what each size owes              |
| `issue-writing` | Titles and descriptions per kind, with the refusal list        |
| `story-mapping` | The Socratic mapping session behind `/ket:map`                 |
| `progress`      | The notes the pipeline drops so no working step is invisible   |
| `findings`      | How to record and answer review findings                       |
| `regression`    | What a fix owes the suite that missed the defect               |
| `plain`         | The plain-language sibling every technical document keeps      |
| `retro`         | Enriching the numbered retro drafts, prose only                |

### Installed in the project

Each scaffold carries project-level skills under `.claude/skills/`.
`find-skills` looks for a skill the project has yet to install, `varlock`
grows the env schema, and `vitest` covers the runner and its config. Chosen
integrations bring their vendors' own skills beside them, and one that
serves an MCP server lands its registration in `.mcp.json`.

`ket update` installs the ones a project is missing. A skill counts as
present when `.claude/skills/` holds a directory of that name, so update
never reinstalls or overwrites what the project already has. That's how a
project older than the lock entry, or one that chose an integration after
create, still gains the skill. `--plan` names each skill it would install
and installs none of them.

## The vocabulary

One concept, one name, everywhere:

- **item**: a piece of work with a key, a status, and a history.
- **stage**: a status the pipeline works an item through.
- **gate**: a machine that refuses. Human gates are the four above.
- **ring**: the checks that close around a write (one) or a stage (two).
- **preset**: what `ket create` writes and governs.
- **slice**: a Feature-Sliced Design unit. Never anything else.
- **release**: a horizontal cut of the story map, with an outcome and a
  metric.
- **surface**: the review page an item opens for a human decision.
- **refusal**: a gate saying no, with the reason and the next step.

## When something refuses

Read the refusal: it names the operation, the reason, and usually the fix.
The `gates` skill explains what each gate failure means, and the
`suppression` skill lists what to reach for instead of switching anything
off. If the same refusal keeps arriving, `ket retro` names it as the week's
largest cluster and drafts the change that removes the friction, numbered so
`ket retro adopt 1` files it as work.
