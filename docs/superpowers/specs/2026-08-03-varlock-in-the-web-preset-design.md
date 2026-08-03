# Varlock in the web preset

Date: 2026-08-03. Status: approved. Third wave on the hero branch, same pull
request.

## Why

An env var in a scaffolded project is a decision nobody wrote down: no
schema, no types, no leak protection. Varlock turns the env into a schema
(`.env.schema` with `@env-spec` decorators), validates it, generates types,
and redacts secrets. The official TanStack Start example uses the Vite
integration, so the scaffold follows it.

## The scaffold shape

- `varlock` rides `dependencies` (the server boot imports its self-loading
  module) and `@varlock/vite-integration` rides `devDependencies`, both
  pinned exactly at implementation time.
- `varlockVitePlugin()` opens the plugin list in `vite.config.ts`, before
  `tanstackStart()`, with the server-render inject mode pinned in writing to
  the plugin's self-loading setting, so `vite preview` keeps working without
  a wrapper.
- `.env.schema` ships with the root decorators `@defaultRequired=infer` and
  `@defaultSensitive=false`, type generation into `env.d.ts`, and two
  placeholder items: one public, one `@sensitive`, both with `@example`
  values. The varlock skill teaches how to grow it.
- Type generation must not widen `process.env`: the generated globals for
  `process.env` and `import.meta.env` stay off, so maximum strictness keeps
  `string | undefined` on direct reads. `ENV` from `varlock/env` is the
  typed door.
- `env.d.ts` is a generated file and gets the same gate treatment as
  `routeTree.gen.ts`. The gitignore gains `.env` and `*.local`.
- A `bunfig.toml` template turns Bun's own automatic dotenv loading off.
  Bun otherwise loads `.env` files first, and those values would outrank
  the schema.

## The gate

`lint:env` runs `varlock load`. A schema violation fails the gate, the
commit hook, and the CI `check` job. The build fails on its own through the
Vite plugin, and the gate makes the same failure visible without a build.

## The skill

Varlock publishes a skill of its own in its repository. The web preset's
`skills-lock.json` gains that entry (`dmno-dev/varlock`), so `ket create`
installs the official skill instead of a hand-written copy. The scaffold's
`CLAUDE.md` gains an env paragraph that points at it.

## Out of scope

- `varlock scan` beside gitleaks in the secrets gate. Worth a look later.
- Encryption, proxy, and Cloudflare integrations.
- The CLI preset. Only the web preset learns varlock in this wave.
