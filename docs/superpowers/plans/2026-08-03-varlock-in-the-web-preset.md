# Varlock in the web preset implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The web preset scaffold carries a schema-driven env through varlock, gated by `lint:env`, with varlock's official skill installed.

**Architecture:** Templates first: `.env.schema`, `bunfig.toml`, the Vite plugin, and the generated types file. The skills-lock entry follows, the item and semantics promise it all, and a scaffold smoke proves the gate bites both ways.

**Tech Stack:** varlock, `@varlock/vite-integration`, `@env-spec` decorators, Bun, Vite, TanStack Start.

## Global constraints

- Spec: `docs/superpowers/specs/2026-08-03-varlock-in-the-web-preset-design.md`.
- Research brief with the verified facts and sources sits in the conversation record; the load-bearing facts repeat below where a task needs them.
- Test-first under probity for `presets/web/src/**`. Template files carry no test cycle here; the smoke task runs them.
- No code comments beyond a constraint the code can't express. No `any`, no `as`, no `@ts-ignore` in hand-written code; a generated file keeps whatever its generator emits.
- Every commit message follows the caveman-commit skill and ends with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Work stays on the branch `feat/a-home-page-that-shows-the-parts`.
- Dependency pins are exact: resolve with `npm view <package> version` at implementation time. Expected neighborhoods: `varlock` near 1.16.0, `@varlock/vite-integration` near 1.4.0.
- Verify decorator and option names against the current varlock docs (varlock.dev, or the Context7 library if indexed) before writing them; the spec fixes intents, not spellings.
- `bun run generate` is the only writer of `contents.generated.ts`.

---

### Task 1: The env templates

**Files:**

- Create: `presets/web/files/source/env.schema` (targets `.env.schema`)
- Create: `presets/web/files/bunfig.toml` (targets `bunfig.toml`)
- Create: `presets/web/files/source/env.d.ts` (targets `env.d.ts`, generated once here)
- Modify: `presets/web/files/vite.config.ts`
- Modify: `presets/web/files/gitignore`
- Modify: `presets/web/files/tsconfig.json` (only if `env.d.ts` falls outside its include set)
- Modify: `presets/web/files/cspell.json`, `presets/web/files/knip.json`, `presets/web/files/oxlintrc.json` ignores (only what the gates demand; start without and let Task 4's smoke prove the need)

**Interfaces:**

- Produces: the schema, the Bun guard, and the plugin wiring Tasks 3 and 4 build on.

- [ ] **Step 1: Write the schema**

`.env.schema` intent (verify decorator spellings against the docs first):

```env-spec
# This env file uses @env-spec - see https://varlock.dev/env-spec for more info
#
# @defaultRequired=infer @defaultSensitive=false
# @generateTsTypes(lang=ts, path=env.d.ts)
# ----------

# @sensitive @example=shh-never-commit-me
EXAMPLE_SECRET=

# @example=hello
EXAMPLE_PUBLIC_ITEM=
```

Binding requirement on type generation: the generated file must not widen the global `process.env` or `import.meta.env` types (the default generation extends both with plain `string`, which defeats `tsconfig` strictness). Find the documented options that keep those globals out (the research found `processEnv` and `importMetaEnv` toggles on the generation decorator) and set them in the schema. If no such option exists in the current release, generate to a path the tsconfig excludes from ambient globals and record the deviation.

- [ ] **Step 2: Generate the types file once**

In a throwaway directory, install the pinned `varlock`, copy the schema, run the generation (`varlock load` triggers it), and copy the resulting `env.d.ts` into `presets/web/files/source/env.d.ts` verbatim. That file is a generated artifact. Never edit it by hand.

- [ ] **Step 3: Guard Bun's dotenv**

`presets/web/files/bunfig.toml`: the setting that stops Bun loading `.env` files on its own. The research found `env = false`, with an `[env] file = false` object form. Verify against the current Bun docs, use the documented spelling, and put nothing else in the file.

- [ ] **Step 4: Wire the plugin**

In `presets/web/files/vite.config.ts`, add `varlockVitePlugin(...)` as the first plugin, before `tanstackStart(...)`, with the server-render inject option pinned to the self-loading value in writing. Verify the option's exact name against the docs. The research shows `ssrInjectMode` with the value `auto-load`. Import from `@varlock/vite-integration`.

- [ ] **Step 5: Extend the ignore lists**

`presets/web/files/gitignore` gains `.env` and `*.local`. Give `env.d.ts` the same treatment `routeTree.gen.ts` already gets wherever that name appears in the template configs. Add nothing speculative beyond that parity.

- [ ] **Step 6: Commit**

```bash
git add presets/web/files
git commit -m "feat(presets): teach the scaffold a schema-driven env

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: The official skill enters the lock

**Files:**

- Create: `presets/web/files/skills-lock.json` (a web-preset copy that overrides the shared one at `packages/preset/files/skills-lock.json`)

- [ ] **Step 1: Learn the lock's mechanics**

Read `packages/cli/src/commands/create/skills-install.ts` (and `packages/preset/src/skills.ts`) to see exactly how entries resolve and how the install checks `computedHash`. Compute the varlock entry the same way the existing entries came to be.

- [ ] **Step 2: Write the override**

The web copy holds every entry from the shared `packages/preset/files/skills-lock.json` plus one more: name `varlock`, source `dmno-dev/varlock`, sourceType `github`, skillPath `skills/varlock/SKILL.md`, and the hash computed per Step 1 against the file's current content.

- [ ] **Step 3: Commit**

```bash
git add presets/web/files/skills-lock.json
git commit -m "feat(presets): install the official varlock skill

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Promises, scripts, and the gate

**Files:**

- Modify: `presets/web/src/item.ts`
- Modify: `presets/web/src/semantics.ts`
- Modify: `presets/web/files/lefthook.yml`
- Modify: `presets/web/files/github-ci.yml`
- Modify: `presets/web/files/CLAUDE.md`
- Regenerate: `presets/web/src/contents.generated.ts`

- [ ] **Step 1: Observe the red**

From the repository root, run `bash -c 'cd presets/web && bun run test'` before and after the `item.ts` edit. The mismatch between promises and carried bytes is the failing test probity wants.

- [ ] **Step 2: Promise and pin**

`item.ts`: `writes()` entries for `.env.schema`, `bunfig.toml`, `env.d.ts`, and the skills-lock override (the standing entry shows the mapping to mirror). `varlock` joins `dependencies`, `@varlock/vite-integration` joins `devDependencies`, both pinned from `npm view`.

`semantics.ts`: script `'lint:env': 'varlock load'` and one gate after `lint:ui`:

```ts
{
  script: 'lint:env',
  guards: 'It checks the env matches its schema.',
  commitJob: 'env',
  ciJob: 'check',
},
```

`lefthook.yml`: an `env` job, priority 1, matching `.env.schema`, running `bun run lint:env`. `github-ci.yml`: a `bun run lint:env` step in the `check` job, beside the other lint steps. The `scriptRunsInJob` invariant demands that step.

`CLAUDE.md`: one short paragraph in the template. The env is a schema before it becomes a value, and `.env.schema` holds the decisions. Nothing edits `env.d.ts` by hand, and the `varlock` skill carries the rules for growing it. Keep the file's voice. The template passes Vale.

- [ ] **Step 3: Regenerate, settle, commit**

`bun run generate && bun run test` in `presets/web`, then the root suite. Commit:

```bash
git add presets/web/src/item.ts presets/web/src/semantics.ts presets/web/src/contents.generated.ts presets/web/files
git commit -m "feat(presets): gate the env on its schema

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Scaffold smoke, third round

**Files:** none in the repository. Everything happens in a temporary directory.

- [ ] **Step 1: Scaffold and install**

```bash
rm -rf /tmp/env-smoke
bun packages/cli/src/run.ts create /tmp/env-smoke --preset web < /dev/null
cd /tmp/env-smoke && bun install
```

Confirm `.env.schema`, `bunfig.toml`, and `env.d.ts` landed, `.gitignore` carries the new lines, and the varlock skill sits under the scaffold's installed skills.

- [ ] **Step 2: The gate holds and bites**

```bash
bun run lint:env
```

Expected: green. Then break the schema (append a line `BROKEN_REQUIRED_VAR= # @required` or set a `@type=url` item to a non-url value in `.env`), rerun, and expect a nonzero exit naming the violation. Restore. Also prove the build-side failure once: with the broken env in place, `bun run build` must fail through the Vite plugin.

- [ ] **Step 3: Everything old stays green**

```bash
bun run test && bun run test:integration && bun run test:component && bun run check-types && bun run lint && bun run lint:boundaries && bun run lint:dead && bun run lint:spell && bun run lint:ui && bun run storybook:build && bun run test:browser
```

A failure is a template defect: fix the template, regenerate, re-scaffold, rerun. Watch for the gates meeting `env.d.ts` and `.env.schema` for the first time. That's where Task 1's Step 5 parity either holds or gets amended.

- [ ] **Step 4: The dev server still greets**

Boot `bun run dev`, screenshot the page, confirm the hero still renders (the plugin must not disturb it), kill the server.

- [ ] **Step 5: Commit any forced template fixes**

```bash
git add presets/web
git commit -m "fix(presets): true the env against a real scaffold

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Skip when nothing changed.

---

### Task 5: The whole chain

- [ ] **Step 1: Repository chain**

```bash
bun run lint && bun run check-types && bun run test && bun run lint:spell && bun run lint:prose
```

New legitimate vocabulary (varlock, env-spec, and friends) goes into `cspell-words.txt`.

- [ ] **Step 2: Mutation on the touched package**

```bash
cd presets/web && bun run test:mutation
```

Expected: zero survivors. Push and the pull request wait for the user's word.

---

## Self-review notes

- Spec coverage: schema and templates (Task 1), skill (Task 2), gate and promises (Task 3), verification (Tasks 4 and 5). Out of scope respected: no `varlock scan`, no encryption, no CLI preset changes.
- The strictness requirement (no `process.env` widening) is Task 1's binding constraint and Task 4's check-types run proves it survives in a real scaffold.
- Names stay consistent: `lint:env`, `env` commit job, `.env.schema`, `env.d.ts`.
