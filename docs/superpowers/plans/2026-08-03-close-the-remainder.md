# Close the remainder implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every parked item and every adopted triage pick lands. The hardened env gate, two repository checks, the comparator-free shipped order, the harness note, and the scaffold's new guards all close here.

**Architecture:** Repository-side work first: the shipped order, the in-house lint rule, and the template-change hook. Scaffold-side guards follow (env hardening, dependency-cruiser, protect-generated, CODEOWNERS, Scorecard, the security reviewer), then one smoke and one chain.

**Tech Stack:** oxlint plugin rules, dependency-cruiser, varlock, lefthook, GitHub CLI, Scorecard.

## Global constraints

- Spec: `docs/superpowers/specs/2026-08-03-close-the-remainder-design.md`.
- A research brief lands in the conversation before implementation; where a task says "per the research," the implementer verifies the exact spelling against current docs before writing.
- Test-first under probity for `packages/*/src` and `presets/*/src`. Templates carry no test cycle here; Task 10's smoke runs them.
- No code comments beyond a constraint the code can't express. No `any`, no `as`, no `@ts-ignore` in hand-written code.
- Every commit message follows the caveman-commit skill and ends with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Work stays on the branch `feat/a-home-page-that-shows-the-parts`. The branch is already pushed. Never amend a pushed commit. Fix forward.
- Dependency pins are exact, resolved with `npm view <package> version` at implementation time.
- Gate sentences obey the declaration invariants (`^It [a-z].*\.$`, at most 42 characters), and every new ciJob step satisfies the `scriptRunsInJob` invariant.
- `bun run generate` is the only writer of any `contents.generated.ts`.

---

### Task 1: The shipped order loses its comparator

**Files:**

- Modify: `packages/preset/src/shipped.ts`
- Test: `packages/preset/src/shipped.test.ts`

- [ ] Write the failing test first: an item promising paths `Z.txt` and `a.txt` yields `Object.keys` in code-unit order (`files/Z.txt` before `files/a.txt`) whatever the machine's locale. The current `localeCompare` sort fails it under an English locale. Keep the existing tie-break test green: when two promises share a path, the later declaration's bytes win.
- [ ] Restructure without a comparator:

```ts
const byPath = new Map(everyFileOf(item).map((file) => [file.path, file] as const));
const paths = [...byPath.keys()].toSorted();
const entries = [...byPath.entries()];
const files = paths.flatMap((path) =>
  entries.filter(([held]) => held === path).map(([, file]) => file),
);
```

then read `files` exactly as today. The map dedupe keeps the later declaration (set on an existing key replaces the value), the default `toSorted()` on unique strings carries no mutant surface, and the `flatMap`/`filter` resolution never produces `undefined`.

- [ ] `bash -c 'cd packages/preset && bun run test && bun run test:mutation'` from the repository root: green, zero survivors, no equivalent mutant left on this line.
- [ ] Commit: `refactor(preset): sort shipped paths without a comparator`.

---

### Task 2: The boolean-flag rule becomes a machine

**Files:**

- Create: a new workspace package `packages/oxlint-plugin-ket` (name `oxlint-plugin-ket`) with `src/no-boolean-switch-param.ts`, its unit tests, and the package scaffolding the other packages carry (tsconfig, scripts, stryker config).
- Modify: the root `.oxlintrc.json` to load the rule through oxlint's current external-plugin mechanism (per the research; verify the config key against the oxlint docs).

- [ ] The rule reports a function whose body branches on a parameter declared `boolean` (an `if` or a ternary whose test is the bare parameter, covering most of the body). Start with the honest detectable core: a `boolean`-typed parameter read as a bare condition anywhere in the function. The clean-code doc stays the source of truth; the rule is its machine.
- [ ] Test-first with the plugin API's testing surface (per the research). Cover: flagged (parameter in an `if`), flagged (ternary), clean (boolean parameter only passed along), clean (non-parameter boolean).
- [ ] Wire the plugin into the root `.oxlintrc.json` and confirm `bun run lint` still passes on the repository (the create command's `wizard` ternaries read a local, not a parameter, and stay clean).
- [ ] Mutation gate on the new package: zero survivors.
- [ ] If oxlint's current plugin mechanism can't express the rule, fall back to a standalone `scripts/check-boolean-params.mts` driven by the TypeScript compiler API, wired as a lefthook job, same tests. Record which road you took and why in the report.
- [ ] Commit: `feat(lint): flag the boolean parameter that switches a function`.

---

### Task 3: Template changes run their preset's suite

**Files:**

- Create: `scripts/check-preset-templates.mts` (repository root)
- Modify: `lefthook.yml` (repository root)

- [ ] The script reads staged paths from its arguments, derives the touched presets from `presets/<name>/files/...`, and for each runs that preset's `bun run generate` followed by `git diff --exit-code -- presets/<name>/src/contents.generated.ts` and `bun run test`. Stale generated contents or a red suite fails the commit with the preset named.
- [ ] A lefthook job `templates` with a `presets/*/files/**` pattern hands `{staged_files}` to the script.
- [ ] Prove both verdicts in a scratch branch or with a stashed change; paste the transcripts.
- [ ] Commit: `feat: run a preset's suite when its templates change`.

---

### Task 4: The env gate hardens

**Files:**

- Create: `presets/web/files/source/scripts/check-env.mts` (targets `scripts/check-env.mts`)
- Modify: `presets/web/src/semantics.ts` (`lint:env` becomes `bun scripts/check-env.mts`), regenerate.

- [ ] The script holds three verdicts, each with its own message naming what failed: `varlock load` fails (schema violation, exit nonzero, surface varlock's own output); an env item present in the resolved env but absent from the schema fails (detect per the research on varlock's JSON output; if no output shape exposes it, parse `.env` and `.env.*` files directly against the schema's declared keys); a stale `env.d.ts` fails (regenerate via `varlock load`, then `git diff --exit-code env.d.ts`).
- [ ] The semantics script change keeps the gate sentence, commit job, and CI step untouched (they call `bun run lint:env` either way). probity: observe the invariants red-green around the `semantics.ts` edit as usual.
- [ ] Regenerate, suites green.
- [ ] Commit: `feat(presets): fail the env gate on drift and undeclared items`.

---

### Task 5: dependency-cruiser at its strictest

**Files:**

- Create: `presets/web/files/dependency-cruiser.cjs` (targets `.dependency-cruiser.cjs`; exact filename per the tool's docs)
- Modify: `presets/web/src/item.ts` (devDependency pin, writes entry), `presets/web/src/semantics.ts` (script `'lint:graph': 'depcruise src'` or the documented invocation, gate after `lint:boundaries` with guards `It checks an import crosses no boundary.`, commitJob `graph`, ciJob `check`), `presets/web/files/lefthook.yml` (job `graph`), `presets/web/files/github-ci.yml` (step in `check`).

- [ ] Rules, strictest form per the research, without encoding any business rule twice: steiger already owns every Feature-Sliced rule (layers, cross-slice, public API), so dependency-cruiser adds only what steiger lacks. Extend `dependency-cruiser/configs/recommended-strict` (circular dependencies, orphans, unresolvable imports, packages missing from the manifest, all at error), point `tsConfig` at the scaffold's, set `tsPreCompilationDeps` on, and exclude the generated files.
- [ ] Verify the tool runs under Bun in a scratch directory before wiring anything.
- [ ] probity rhythm as usual; regenerate; suites green.
- [ ] Commit: `feat(presets): gate the import graph`.

---

### Task 6: The protect-generated hook

**Files:**

- Create: `presets/web/files/source/scripts/protect-generated.mts` (targets `scripts/protect-generated.mts`)
- Modify: whatever registers scaffold hooks. Read `packages/cli/src/commands/create/settings.ts` first to learn how the scaffold's `.claude/settings.json` comes together, then wire a PreToolUse hook that runs the script.

- [ ] The script reads the hook's JSON from stdin, extracts the target path, and denies (exit 2 with a reason on stderr, per the Claude Code hooks contract) any Edit or Write aimed at `*.gen.ts`, `env.d.ts`, `bun.lock`, `.env`, or `.env.*.local`. Everything else passes.
- [ ] Prove both verdicts by piping crafted JSON through the script by hand.
- [ ] probity rhythm around any `packages/cli/src` edit; suites green; regenerate.
- [ ] Commit: `feat(presets): refuse the edit a generated file never wants`.

---

### Task 7: CODEOWNERS with a real owner

**Files:**

- Create: `presets/web/files/CODEOWNERS` (targets `.github/CODEOWNERS`)
- Modify: `packages/cli/src/commands/create/name-token.ts` (a `__PROJECT_OWNER__` token), `packages/cli/src/commands/create/command.ts` and neighbors (owner resolution), tests beside each.

- [ ] The template covers the guardrail paths, every line owned by `@__PROJECT_OWNER__`: `*`, `.claude/`, `.github/workflows/`, `.env.schema`, the lint and gate configs.
- [ ] Resolution order, test-first: a `--owner` flag when given; else `gh api user --jq .login` through a child process (a real process boundary, so the test doubles it); else, in wizard mode, one question; else the CODEOWNERS file drops out of the installed file list (filter by target, mirroring how `shippedContents` reads targets). The token substitution itself extends `withProjectNames` with the same mechanics as the name token, covered by the existing property-test style.
- [ ] probity rhythm; the CLI package suite and mutation gate stay at zero survivors.
- [ ] Commit: `feat(cli): resolve an owner and write the code owners`.

---

### Task 8: Scorecard as an offered integration

**Files:**

- Create: `presets/web/files/github-scorecard.yml` (targets `.github/workflows/scorecard.yml`)
- Modify: `presets/web/src/item.ts` (an `integrations` entry named `scorecard`, `asks` text in the existing voice, the file wired per the integration shape).

- [ ] Workflow per the research: the pinned `ossf/scorecard-action` ref, least-privilege permissions, weekly schedule plus default-branch push.
- [ ] The integration invariants (`integration-invariants.ts`) govern the entry's shape; let them judge it.
- [ ] Regenerate; suites green.
- [ ] Commit: `feat(presets): offer the scorecard at create time`.

---

### Task 9: The security reviewer

**Files:**

- Investigate first: find where the repository's existing rules reviewer lives. The Stop hook that reviews changed code against the project rules likely sits in `.claude/settings.json` beside its reviewer definition. Mirror that mechanism.
- Create: a `security-reviewer` definition beside the existing reviewer, scoped to security posture only: secret handling, trust boundaries, injection surfaces, unsafe patterns. It reports findings and never edits.
- Modify: the hook registration so both reviewers run, independently marked.

- [ ] The reviewer's prompt states its scope and its refusal to duplicate the rules reviewer.
- [ ] Prove it fires: make a scratch edit with an obvious planted smell (a hardcoded secret in a scratch file), observe the hook's report, revert the scratch.
- [ ] Commit: `feat(harness): seat a reviewer who only reads for danger`.

---

### Task 10: Scaffold smoke, final round

**Files:** none in the repository. Temporary directory only.

- [ ] Scaffold with `--owner` given; confirm CODEOWNERS carries the owner, the protect-generated hook file landed, `.dependency-cruiser` config landed, and the Scorecard integration appears in the offered list (drive `create` with `--with scorecard` to take it).
- [ ] Gates: the full chain from the earlier smokes plus `lint:graph` and the hardened `lint:env`. Bite proofs: a circular import for `lint:graph`; an undeclared `.env` item and a stale `env.d.ts` for `lint:env`; a denied edit through the protect-generated hook (pipe the JSON by hand inside the scaffold).
- [ ] Scaffold once WITHOUT an owner and without `gh` on PATH: CODEOWNERS absent, everything else green.
- [ ] Fix templates forward as usual; commit `fix(presets): true the remainder against a real scaffold` when anything changed.

---

### Task 11: The chain, the note, and the record

- [ ] The harness note: two sentences in the repository `CLAUDE.md` under the TDD section naming the probity subagent symptom and the working pattern. Vale-clean.
- [ ] Full repository chain, then mutation on every touched package (`packages/preset`, `packages/cli`, `packages/oxlint-plugin-ket`, `presets/web`). Zero survivors.
- [ ] Push (the branch is public already) and update the pull request body with a "closing the remainder" section.

---

## Self-review notes

- Spec coverage: env hardening (Task 4), the two repository checks (Tasks 2 and 3), the comparator (Task 1), the note (Task 11), dependency-cruiser (Task 5), protect-generated (Task 6), CODEOWNERS (Task 7), Scorecard (Task 8), security reviewer (Task 9), the tooling pattern scoped to a `CLAUDE.md` note (Task 10 confirms nothing shipped empty).
- Order matters only where stated: Tasks 1 through 3 are repository-side and independent; Tasks 4 through 9 are scaffold-side and independent of each other; Task 10 needs 4 through 9; Task 11 closes.
- Names stay consistent: `check-env.mts`, `lint:graph`, `protect-generated.mts`, `__PROJECT_OWNER__`, `scorecard`.
