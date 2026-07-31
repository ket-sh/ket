# `__PROJECT_NAME__`

A project under ket. The `ket` plugin, which `.claude/settings.json` registers,
carries the rules as skills, and each skill says when it applies. Load the one
that applies and work from it rather than from a summary of it.

## What this project is

`.ket/config.ts` maps each directory to the preset that governs it. This project
maps `.` to the `cli` preset, so one slice means one command.

A slice lives in `src/commands/<slice>/`. Its adapter is `command.ts`: argument
parsing and process behavior stop there, and the domain beside it stays pure.
Mutation covers the domain and skips the adapter, so a decision that drifts into
`command.ts` drifts out of reach of the gate that measures it.

A unit named `greeting` takes `greeting.test.ts` for the cases you thought of,
and `greeting.property.test.ts` for the ones you didn't. Both sit beside the
source. The `tdd` skill carries the order they arrive in, and the `vitest` skill
covers the runner, its config, and its coverage.

## The pipeline

Work is an item. An item lives in `.ket/items/<key>/`, and `.ket/BOARD.md`
follows from those items rather than from a hand edit. The `stages` skill
carries the statuses, the commands that move an item between them, and the
points where the pipeline stops for you.

Drive it with `/ket:feature`, `/ket:explore`, `/ket:approve`, `/ket:continue`,
`/ket:review`, and `/ket:status`.

## The gates

`package.json` holds the chain, `lefthook.yml` arms part of it at commit, and
the plugin arms the rest at each edit. The `gates` skill says what a failure
tells you, the `mutation` skill says how to kill a survivor, and the
`suppression` skill says what to reach for instead of turning a gate off.

Bun runs most of the chain. `mise.toml` pins the four tools that aren't
JavaScript, so `lint:prose`, `lint:secrets` and `lint:workflows` need
[mise](https://mise.jdx.dev) on the machine. Without it those three report a
missing command rather than a finding.

No gate here gets switched off to reach green.

## When no skill covers the question

The `find-skills` skill looks for one this project has yet to install.
