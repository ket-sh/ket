# Optional workflow implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The workflow becomes a create-time choice: decliners get gates without pipeline commands, skills, state, or copy.

**Architecture:** The plugin splits first (`harness/gates` keeps the id `ket`, `harness/workflow` is new). The CLI then learns the choice (wizard question, `--no-workflow`, conditional settings and scaffold state, hint tokens). The templates follow (two `CLAUDE.md` variants per preset in the clean shape, tokenized hero hint).

**Tech Stack:** Claude Code plugins and marketplace manifest, citty, clack, the preset pipeline.

## Global constraints

- Spec: `docs/superpowers/specs/2026-08-03-optional-workflow-design.md`.
- Work stays on the branch `feat/optional-workflow`; it lands through its own pull request, merged when its checks pass.
- Test-first under probity for `packages/*/src` and `presets/*/src`; the established controller-assist pattern applies when probity can't see a subagent's red.
- Every commit message follows the caveman-commit skill and ends with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Mutation stays at 100 with zero survivors in every touched package.
- Authored markdown passes Vale; `harness/**` keeps only the house rules (no em dash).
- `bun run generate` is the only writer of any `contents.generated.ts`.
- The hero hint copy without the workflow is exactly: text `Make it yours: edit` with code `src/entities/welcome`. With the workflow it stays exactly today's sentence and code.

---

### Task 1: The plugin splits

**Files:**

- Move: `harness/hooks`, code-rule skills, `rules-reviewer.md`, `security-reviewer.md` into `harness/gates/...`; commands, stage skills, pipeline agents into `harness/workflow/...`; each bundle gets its own `hooks/hooks.json` (the turn gate moves to the workflow bundle, everything else stays with the gates).
- Modify: `.claude-plugin/marketplace.json` (two plugins: `ket` from `./harness/gates`, `ket-workflow` from `./harness/workflow`).
- Modify: `packages/preset/src/harness-skills.ts` and its consumers if the skills path moved (run the repo suite to find every reader of `harness/skills`; `law-invariants` reads harness skills for the CLAUDE.md law - keep it green).
- Modify: the `gherkin` and `adr` skills' artifact-location sentence (one line each: without the workflow the artifact lives under `docs/`).

- [ ] Use `git mv` so history follows. Validate both hooks.json files parse. The repo suite stays green (the law invariants and harness-skills reader are the risk).
- [ ] Commit: `refactor(harness): split the gates from the workflow`.

---

### Task 2: Create learns the choice

**Files:**

- Modify: `packages/cli/src/shared/configuration.ts` (a `workflow: boolean` on `Configuration`), `packages/cli/src/commands/create/wizard.ts` (`askWorkflow` between integrations and key; `askKey` only on yes), `command.ts` (`--no-workflow` boolean arg wired through both paths; hint tokens), `settings.ts` (`ket-workflow@ket` entry only on yes), `scaffold.ts` (`BOARD.md` and `items/.gitkeep` only on yes), `name-token.ts` (two hint tokens fed from the choice: `__HERO_HINT_TEXT__`, `__HERO_HINT_CODE__`).
- Tests beside each, red first; mutation zero survivors.

- [ ] The two hint values, exact: workflow yes gives text `Start your first feature in Claude Code with` and code `/ket:feature "your prompt"`; no gives text `Make it yours: edit` and code `src/entities/welcome`.
- [ ] `renderConfiguration` records the choice in `.ket/config.ts` so the gates and any later tool can read it.
- [ ] Headless: `--no-workflow` with `--preset` works; default remains workflow on. Wizard: the question reads in clack's voice; declining skips the key question (the key then defaults from the directory name for config completeness).
- [ ] Commit: `feat(cli): make the workflow a choice at create`.

---

### Task 3: The templates follow

**Files:**

- Rewrite: `presets/web/files/CLAUDE.md` into the clean shape (one concern per heading: architecture, routing, design tokens, environment, testing, the pipeline, the gates, the overflow valve; prose voice kept; every paragraph ends in a skill pointer or a flat invariant; the growth rule stated once). Create: `presets/web/files/CLAUDE.plain.md` - the same file without the pipeline section.
- Same pair for `presets/cli/files/CLAUDE.md` (its existing content, restructured only as far as splitting the pipeline section out).
- Modify: `presets/web/files/source/routes/index.tsx` (the hint line becomes the two tokens), the e2e steps if any assert the hint (none do today - verify).
- Modify: both presets' `item.ts` to promise the plain variants (target `CLAUDE.md` selection happens in the CLI: extend the install path so the workflow choice picks which template lands at `CLAUDE.md` and drops the other - mirror the `ownedFiles` filter precedent).
- Regenerate both presets; invariants green.

- [ ] Both CLAUDE.md variants pass Vale. The plain variant never mentions `/ket:` commands, items, or the board.
- [ ] Commit: `feat(presets): let the templates follow the workflow choice`.

---

### Task 4: Scaffold smoke, both ways

- [ ] Workflow on (default): `.ket/BOARD.md` and `.ket/items/` present, settings enable both plugins, `CLAUDE.md` carries the pipeline section, the hero hint reads today's sentence, full gate chain green in the scaffold.
- [ ] Workflow off (`--no-workflow`): no board, no items, settings enable only `ket@ket`, `CLAUDE.md` carries no pipeline text (a `/ket:` search finds nothing), the hero hint reads the chosen copy, the page renders (screenshot), and the gates still bite (one sealed-write proof through the write gate script if reachable, else the lint chain).
- [ ] Wizard pty run: the workflow question appears after integrations; declining skips the key question.
- [ ] Fix templates forward as usual; commit any forced fixes.

---

### Task 5: The chain and the pull request

- [ ] Full repo chain plus mutation on `packages/cli` (and `packages/preset` if touched).
- [ ] Push, open the pull request, watch its checks in the background, and merge it (squash, delete branch) when they pass, per the user's standing instruction.

---

## Self-review notes

- Spec coverage: split (Task 1), choice (Task 2), templates (Task 3), proofs (Task 4), landing (Task 5).
- The kept plugin id `ket` is the compatibility decision: existing scaffolds keep loading the gates bundle unchanged.
- Names stay consistent: `ket-workflow`, `--no-workflow`, `__HERO_HINT_TEXT__`, `__HERO_HINT_CODE__`, `CLAUDE.plain.md`.
