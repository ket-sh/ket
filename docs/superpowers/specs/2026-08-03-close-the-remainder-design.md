# Close the remainder

Date: 2026-08-03. Status: approved. The final wave on the hero branch: every
item the earlier waves parked, plus the adopted triage picks, lands in the
same pull request.

## The env gate hardens

- `lint:env` stops being bare `varlock load` and becomes a small script,
  `scripts/check-env.mts`, holding three verdicts: the schema validates, an
  env item that no schema entry declares fails the gate, and a stale
  `env.d.ts` (one that regeneration would rewrite) fails the gate. The gate
  sentence stays within the declaration invariants.

## The repository learns two checks it kept by hand

- A boolean flag parameter that switches a function's body is a rule the
  clean-code doc keeps by hand. An in-house oxlint rule takes it over, in
  the current oxlint plugin mechanism, unit-tested, wired into the
  repository's own lint. This starts the in-house rule practice; the
  scaffold inherits the rule when the practice matures.
- A commit that touches `presets/*/files/**` without its preset's suite
  running let stale generated contents live for three commits once. A
  lefthook job takes it over: template changes run that preset's tests.

## The shipped order loses its comparator

- `shippedFilesOf` sorts with `localeCompare`, which reads the machine's
  locale, and every hand comparator over unique keys breeds equivalent
  mutants the 100 threshold rejects. The restructure: dedupe promises into
  a map keyed by path, sort the unique path strings with the default sort,
  and resolve files from the map without a nullable lookup. No comparator,
  no equivalent mutant, deterministic on any machine.

## The harness note

- probity's TDD judge reads the session transcript, and a background
  subagent's tool history only flushes at turn boundaries, so the judge can
  refuse a green edit whose red evidence it can't see yet. The repository's
  `CLAUDE.md` gains two sentences naming the symptom and the working
  pattern: re-observe the red where the edit happens, or hand the edit to
  the session whose transcript carries the evidence. The upstream defect
  belongs to `@nizos/probity`.

## The scaffold adopts the triage picks

- **dependency-cruiser, strictest form.** The scaffold gains the import
  graph gate beside steiger: no circular dependencies, no orphans, the
  Feature-Sliced layer order enforced, no reaching into a slice's internals
  past its index. Script `lint:graph`, wired at commit and in CI.
- **protect-generated hook.** The scaffold's harness settings gain a
  PreToolUse hook that refuses edits to generated files (`*.gen.ts`,
  `env.d.ts`, the lockfile) and secret paths (`.env`, `.env.*.local`). The
  doctrine the `generated` skill states becomes mechanical.
- **CODEOWNERS with a real owner.** A `__PROJECT_OWNER__` token joins the
  name tokens. `ket create` resolves it from `gh api user` when the GitHub
  CLI answers, else asks in the wizard, else skips the file. The scaffold's
  `.github/CODEOWNERS` covers the guardrail paths: rules, lint configs,
  workflows, the env schema, and the ownership file itself.
- **Scorecard.** An optional integration beside Codecov and CodeQL: the
  Open Source Security Foundation's weekly Scorecard workflow, offered at
  create time.
- **Security-only reviewer.** The repository's own harness gains a second
  Stop-hook reviewer scoped to security posture alone: secret handling,
  trust boundaries, unsafe patterns. It seats beside the rules reviewer in
  `.claude/settings.json`, never instead of it. The scaffold harness carries
  no Stop-hook reviewers yet, so the same seat there is a follow-up rather
  than part of this wave.
- **The tooling pattern, scoped to its smallest slice.** Of the scaffold's dev tools,
  only Stryker is heavy enough to justify lockfile isolation, and moving it
  would break `bun run test:mutation` conventions across the repo. The
  pattern lands as its smallest honest slice: the scaffold's
  `stryker.conf.json` stays, and the adoption note in the scaffold's
  `CLAUDE.md` records the pattern as the road for the first tool that
  genuinely needs it. No empty `tooling/` directory ships.

## Out of scope

- Porting the wider prior-art rule catalog beyond the boolean-flag rule.
  The practice lands here, and the catalog grows per need.
- Error tracking, translation tooling, and release automation: the user
  said no.
- Fixing probity upstream.
