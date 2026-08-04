# The optional workflow

Date: 2026-08-03. Status: approved. Own branch, own pull request.

## Why

A person who wants ket's gates without ket's pipeline currently gets both:
the plugin bundles the `/ket:*` commands, the stage skills, and the design
agents with the hooks. The workflow becomes a choice at create time. Whoever
declines it gets no pipeline commands, no pipeline skills, and no pipeline
state, while every gate keeps holding.

## The plugin splits

- The plugin named `ket` keeps its id and becomes the gates bundle: every
  hook except the turn gate, every code-rule skill (`tdd`, `clean-code`,
  `gates`, `mutation`, `design-tokens`, `gherkin`, `generated`,
  `suppression`, `verification`, `adr`, `commit`, `research`, `prior-art`,
  `mechanical-checks`), and the two free-standing reviewers. Keeping the id
  keeps existing scaffolds loading.
- A second plugin, `ket-workflow`, carries the seven commands, the stage
  skills (`stages`, `sizing`, `findings`, `regression`, `progress`), the
  ten pipeline agents, and the turn gate, whose whole job is the item in
  flight.
- The marketplace manifest lists both, sourced from `./harness/gates` and
  `./harness/workflow`.
- The `gherkin` and `adr` skills gain one sentence each: without the
  workflow, the artifact lives under `docs/` instead of under an item.

## Create learns the choice

- The wizard asks one question after the integrations: take the workflow or
  not. The `key` question follows only when the answer is yes, because an
  item prefix without items decides nothing. Headless runs pass
  `--no-workflow`; the default stays yes.
- `settings.json` enables `ket@ket` always, `ket-workflow@ket` only on yes.
- `.ket/config.ts` ships either way, because the gates read it.
  `.ket/BOARD.md` and `.ket/items/` ship only on yes.

## The templates follow

- The scaffold `CLAUDE.md` returns to the clean shape: one concern per
  heading, prose voice kept, every paragraph ending in a skill pointer or a
  flat invariant. Sections: architecture, routing, design tokens,
  environment, testing, the pipeline, the gates, and the overflow valve.
  The pipeline section ships only with the workflow: each preset carries
  two template variants, and create installs the one the choice names.
- The growth rule enters the file itself: a new rationale, example, or edge
  case belongs in a skill, never in this index.
- The hero hint becomes two tokens the create command fills by choice. With
  the workflow: today's `/ket:feature` sentence. Without:
  "Make it yours: edit `src/entities/welcome`."

## Out of scope

- Migrating existing scaffolds to the split. The kept id keeps them
  working; adopting the workflow plugin there is a hand edit.
- The cli preset's page (it has none). Its `CLAUDE.md` gets the same two
  variants and nothing else.
- The advisor mechanism. That's its own job.
