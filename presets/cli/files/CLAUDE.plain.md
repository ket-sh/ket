# `__PROJECT_NAME__`

A project under ket. The `ket-gates` plugin, which `.claude/settings.json` registers,
carries the rules as skills, and each skill says when it applies. Load the one
that applies and work from it rather than from a summary of it.

## What this project is

`.ket/config.yaml` maps each directory to the preset that governs it. This
project maps `.` to the `cli` preset, so one slice means one command.

A slice lives in `src/commands/<slice>/`. Its adapter is `command.ts`: argument
parsing and process behavior stop there, and the domain beside it stays pure.
Mutation covers the domain and skips the adapter, so a decision that drifts into
`command.ts` drifts out of reach of the gate that measures it.

A unit named `greeting` takes `greeting.test.ts` for the cases you thought of,
and `greeting.property.test.ts` for the ones you didn't. Both sit beside the
source. The `tdd` skill carries the order they arrive in, and the `vitest` skill
covers the runner, its config, and its coverage.

What the built binary has to answer for is a scenario. `features/` holds the
`.feature` files, `acceptance/steps/` holds what each step does, and cucumber
runs them against `dist/app` rather than the source. The `gherkin` skill carries
the six checks a scenario passes.

## The gates

`package.json` holds the chain, `lefthook.yml` arms part of it at commit, and
the plugin arms the rest at each edit. The `gates` skill says what a failure
tells you, the `mutation` skill says how to kill a survivor, and the
`suppression` skill says what to reach for instead of turning a gate off.

The mutation gate retests what changed against the merge base, and
`test:mutation:full` runs the whole battery. The pipeline runs the full
battery on every push to `main` and weekly, so a scoped run hides nothing
for long.

Bun runs most of the chain. `mise.toml` pins the four tools that aren't
JavaScript, so `lint:prose`, `lint:secrets` and `lint:workflows` need
[mise](https://mise.jdx.dev) on the machine. Without it those three report a
missing command rather than a finding.

No gate here gets switched off to reach green.

## Gates and linting

- **Never disable, override, or loosen any gate.** No `eslint-disable`, no oxlint override or `.oxlintrc` rule change, no lowered mutation or coverage threshold, no `--no-verify`, no silenced Vale or cspell rule. This covers every gate: max-lines, complexity, mutation, coverage, prose, spelling, dependency, and the rest.
- A blocking gate is a design signal, not an obstacle. A file over `max-lines` wants splitting by single responsibility; a surviving mutant wants a better test; an unknown word wants the committed accept list. Fix the code to satisfy the rule.
- When fixing the code genuinely can't satisfy a rule, stop and ask the maintainer before touching any gate config. Only the maintainer authorizes a gate change, and only after you ask.

## When no skill covers the question

The `find-skills` skill looks for one this project has yet to install.
