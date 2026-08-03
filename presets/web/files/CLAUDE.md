# `__PROJECT_NAME__`

A project under ket. The `ket` plugin, which `.claude/settings.json` registers,
carries the rules as skills, and each skill says when it applies. Load the one
that applies and work from it rather than from a summary of it.

## What this project is

`.ket/config.ts` maps each directory to the preset that governs it. This project
maps `.` to the `web` preset: a TanStack Start application laid out under
Feature-Sliced Design, so one slice means one piece of the product.

A slice lives in whichever layer it belongs to, and `src/pages/`, `src/widgets/`,
`src/features/` and `src/entities/` each hold slices of their own. Inside a
slice, `ui/` renders and `api/` talks to the outside. Both are adapters, and the
`model/` beside them stays pure. Mutation covers the model and skips the
adapters, so a decision that drifts into a component drifts out of reach of the
gate that measures it. `steiger` is what refuses an import that reaches up a
layer or sideways into another slice.

`steiger` knows the layers, and `dependency-cruiser` knows the graph: a cycle
between two files, an orphan nothing imports, an import nothing resolves, and
a package the manifest never named. Neither tool repeats what the other
already catches.

Routing has its own layer. `src/app/` holds the router, the route files, and the
route tree TanStack Start generates from them. Nothing writes to a generated file by
hand, and every gate skips a `.gen.ts`.

Style is a token rather than a value. `src/app/styles.css` holds them and the
`design-tokens` skill says what may be one, what may not, and why a raw color
in a component is a decision nobody wrote down.

The environment is a schema before it's a value. `.env.schema` holds the
decisions, and `env.d.ts` follows from it rather than from a hand edit. The
`varlock` skill carries the rules for growing it.

A unit named `welcome` takes `welcome.test.ts` for the cases you thought of,
and `welcome.property.test.ts` for the ones you didn't. Both sit beside the
source, and both run in node. A test that composes several slices and stubs only the
network takes `{unit}.integration.test.ts`, and the mutation gate leaves it alone
because it measures a boundary rather than a decision.

What a browser has to answer for is a scenario. `features/` holds the `.feature`
files, `e2e/steps/` holds what each step does, and `playwright-bdd` runs them.
The `gherkin` skill carries the six checks a scenario passes.

The `tdd` skill carries the order tests arrive in, and the `vitest` skill covers
the runner, its config, and its coverage.

## The pipeline

Work is an item. An item lives in `.ket/items/<key>/`, and `.ket/BOARD.md`
follows from those items rather than from a hand edit. The `stages` skill
carries the statuses, the commands that move an item between them, and the
points where the pipeline stops for you.

Drive it with `/ket:feature`, `/ket:explore`, `/ket:approve`, `/ket:continue`,
`/ket:review`, `/ket:ship`, and `/ket:status`.

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
