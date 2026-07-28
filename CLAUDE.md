# ket project rules

ket is an opinionated TypeScript ecosystem of AI agents and guardrails, for Web,
API, Desktop, and Electron. The working design sketch sits at `.trash/DESIGN.md`,
outside version control, and it carries the reasoning behind every rule below.

## Before starting any work

- Research current industry best practices for the topic through web search, independent of this codebase.
- When a request sounds like a capability of a tool already in use, look for the built-in solution first. Write a custom implementation only after that search comes up empty.

## Git workflow

- `main` stays protected. Never commit to it, locally or remotely.
- Every job gets its own worktree and branch, and lands through a pull request. One job means one branch.

## Commits

- Every commit goes through the `caveman-commit` skill. No exceptions.

## Prose style

- **Never use an em dash.** Rewrite the sentence so it reads as if it never had one.
- All authored markdown passes Vale: the Microsoft base style with rules promoted to error, plus the house rules in `.vale/styles/ket/`. New vocabulary lands in `cspell-words.txt` through the pull request diff.

## Comments

- **Never write code comments.** Code explains itself through naming and structure.
- The only exception: a constraint the code genuinely can't express.

## Test-driven and behavior-driven development

- Follow @.claude/rules/tdd-bdd.md. Test code changes if and only if behavior changes.
- probity enforces the order at the edit itself. It blocks any write to a production file under `packages/*/src` until a failing test covers it, so the gate fires while you type rather than at review time.
- Property-based tests use fast-check, one per declared invariant. Use the `javascript-testing-patterns` skill for unit and integration work, and the `vitest` skill for anything touching the runner, its config, or coverage.
- Mutation score is the gate that catches a suite asserting nothing. `bun run test:mutation` inside a package runs Stryker over its domain, and the threshold breaks the build below 90.
- Never clear a surviving mutant by lowering the threshold. Kill it with a better test. When the mutant turns out to be equivalent, meaning the mutated code behaves identically, restructure the code so the ambiguity disappears rather than accepting the survivor.

## Code rules

- Follow @.claude/rules/clean-code.md.
- Use the `error-handling-patterns` skill when designing how a failure travels: typed results in the domain, process behavior at the adapter.

## TypeScript

- Maximum strictness, always. `tsconfig.base.json` holds the settings, and no package weakens them.
- No `any`, no `as` casts to silence errors, no `@ts-ignore` or `@ts-expect-error` without a stated reason.

## Stack

- Bun runs everything: ket itself and every project ket scaffolds.
- Vitest owns the tests. `bun:test` stays out, because Stryker's mutation runner binds to Vitest, and the mutation gate is this product's central claim.
- Use the `turborepo` skill for task pipelines, caching, filtering and workspace structure.

## Package boundaries

- `packages/cli` imports no renderer and no `@opentui/*`. It reaches the TUI through a lazy `import()` and nothing else.
- The TUI parses no arguments. Command logic never enters a component tree.

## Model map

Subagent definitions pin `opus` as the default. Dispatch overrides the seats
that need a different tier.

| Work                                            | Model                    |
| ----------------------------------------------- | ------------------------ |
| Classification, triage, file inventory          | Haiku                    |
| Research, code reading, implementation          | Opus                     |
| Design documents, Gherkin, the hardest clusters | Fable                    |
| The tiebreak judge on a review disagreement     | Fable, at maximum effort |
