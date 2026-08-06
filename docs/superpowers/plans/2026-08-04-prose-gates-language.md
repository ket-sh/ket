# Prose gates language implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create asks for the documentation language: English keeps today's full prose package, and any other language keeps every gate on without English noise.

**Architecture:** The preset package ships a second Vale config, the language-agnostic core with a `CLAUDE.md` override section. The CLI learns the language (a `Configuration` field, one wizard question, `--language`), and a language module beside the law picks which Vale config lands at `.vale.ini`, rewrites `cspell.json`, and pins the dictionary. Dictionary knowledge is one table seeded from the `cspell-dicts` catalog.

**Tech Stack:** citty, clack, the preset pipeline, Vale ini sections, cspell overrides and imports.

## Global constraints

- Spec: `docs/superpowers/specs/2026-08-04-prose-gates-language-design.md`.
- Work stays on the branch `feat/prose-gates-language`; it lands through its own pull request.
- Test-first under probity for `packages/*/src` and `presets/*/src`; the established controller-assist pattern applies when probity can't see a subagent's red.
- Every commit message follows the caveman-commit skill and ends with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Mutation stays at 100 with zero survivors in every touched package.
- Authored markdown passes Vale.
- `bun run generate` is the only writer of any `contents.generated.ts`.
- Verified mechanics, settled up front: cspell refuses a negated `ignorePaths` entry (`!CLAUDE.md` there is an error), so the no-dictionary path uses an `overrides` entry of the shape `{ "filename": ["**/*.md", "!CLAUDE.md"], "enabled": false }`. The dictionary path imports `@cspell/dict-<tag>/cspell-ext.json` and sets `"language": "en,<tag>"` in a markdown override. Vale applies a later matching section as an override, so `[CLAUDE.md]` after `[*.md]` restores the full package.
- English output stays byte-identical to today: same `.vale.ini`, same `cspell.json`, same manifest.

---

### Task 1: The preset ships the core prose config

**Files:**

- Create: `packages/preset/files/vale.core.ini`
- Modify: `packages/preset/src/standing.ts` (`STANDING_FILES` gains `writes('vale.core.ini', '.vale.core.ini')`)
- Modify: `packages/preset/src/standing.test.ts` (both list assertions)
- Modify: `packages/preset/src/config-invariants.ts` and `packages/preset/src/config-invariants.test.ts` (the prose invariants read `~/.vale.core.ini` the way they read `~/.vale.ini`: every named style ships, the vocabulary ships)
- Regenerate: `presets/web/src/contents.generated.ts` and `presets/cli/src/contents.generated.ts` through `bun run generate` inside each preset package

- [ ] Red first: the standing lists and the widened prose invariants fail before the code moves.
- [ ] The `vale.core.ini` shape: the header block as today (`StylesPath`, `MinAlertLevel`, `Vocab`, `Packages`). `[*.md]` bases on Vale and ket only, with `Vale.Spelling = NO`, `ket.Intensifiers = NO`, and `ket.WeakOpeners = NO`. `[CLAUDE.md]` restores today's full block: Vale, Microsoft, and ket, with every Microsoft promotion `vale.ini` carries and the two house rules back at error. The exempt block closes the file unchanged.
- [ ] `presets/cli/src/item.test.ts` reads the standing configs in a loop near line 134; keep both preset suites green.
- [ ] Commit: `feat(preset): ship the core prose config`.

---

### Task 2: Create learns the language

**Files:**

- Modify: `packages/cli/src/shared/configuration.ts` (`language: string` on `Configuration`, rendered by `renderConfiguration`) and `packages/cli/src/shared/configuration.test.ts`
- Create: `packages/cli/src/commands/create/language.ts`, with tests beside it
- Modify: `packages/cli/src/commands/create/wizard.ts` (`askLanguage` between the integrations question and the workflow question), `packages/cli/src/commands/create/command.ts` (a `--language` string arg defaulting to `en`, wired through the wizard path and the flags path; the prose law applied beside `lawFor`; the dictionary pin joining the manifest `devDependencies`), and `packages/cli/src/commands/create/manifest.test.ts` where the manifest behavior changes

- [ ] `language.ts` carries the domain, red first for each behavior: `refuseLanguage` accepts a lowercase language tag and refuses anything else with a message naming what arrived; a dictionary table maps a tag to its pinned `@cspell/dict-*` package and import path, seeded from the `cspell-dicts` catalog with the Turkish row verified as `@cspell/dict-tr-tr@3.0.6`; a prose law mirroring `law.ts` keeps `.vale.ini` and drops `.vale.core.ini` for English, and lands the core at `.vale.ini` for any other language; a cspell rewrite takes the shipped `cspell.json` bytes and returns them untouched for English, with the import and the `en,<tag>` markdown override for a dictionary language, or with the disabling override for a language without one.
- [ ] The rewrite parses the shipped bytes, so a preset's own cspell differences survive it.
- [ ] Wizard: one text question in clack's voice, defaulting to `en`. Headless: `--language tr` with `--preset` works, and omitting the flag keeps English.
- [ ] `renderConfiguration` records the language in `.ket/config.ts`.
- [ ] Mutation on `packages/cli`: zero survivors.
- [ ] Commit: `feat(cli): ask the documentation language at create`.

---

### Task 3: Scaffold proof, three ways

- [ ] English, by default: scaffold a scratch project, diff `.vale.ini`, `cspell.json`, and `package.json` against a scaffold from main, and confirm zero drift. Full chain green.
- [ ] `--language tr`: `.vale.ini` carries the core shape. Plant an em dash in a Turkish `README.md` and `vale` flags it; plant an English passive in `CLAUDE.md` and `vale` flags that too. `lint:spell` passes correct Turkish with its diacritics and fails a word stripped of them. `package.json` pins `@cspell/dict-tr-tr`, and `bun install` plus the full chain stay green.
- [ ] A tag without a dictionary row, as in `--language xx`: cspell skips the project's markdown, keeps checking `CLAUDE.md` and the source, and the chain stays green.
- [ ] Wizard pty run: the language question appears after the integrations, and Enter keeps English.
- [ ] Remove every scratch; commit any forced fixes forward.

---

### Task 4: The chain and the pull request

- [ ] Full repository chain (`bun run lint && bun run check-types && bun run test && bun run lint:spell && bun run lint:prose`) plus mutation on `packages/cli` and `packages/preset`.
- [ ] Push the branch and open the pull request against main, titled `feat(create): ask the documentation language`, body naming the spec. End the body with the standard generated-with line.

---

## Self-review notes

- Spec coverage: the scope split and the surviving core (Task 1), the question, the flag, and the rewrites (Task 2), the Turkish and no-dictionary proofs (Task 3), landing (Task 4).
- Names stay consistent: `--language`, `language.ts`, `vale.core.ini` shipping to `.vale.core.ini` and landing at `.vale.ini`.
- The global constraints record the rejected mechanic where it bites: a negated `ignorePaths` entry never works, and the disabling override does.
