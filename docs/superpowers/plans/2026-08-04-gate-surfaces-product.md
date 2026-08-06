# Gate surfaces product implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the prototype under `.trash/poc/` into the product: a `ket item show` command in `packages/cli`, the gate commands that bring the surface to the user, and the artifact conventions the agents follow.

**Architecture:** The page assembly is a pure domain function from artifacts to HTML. A server adapter owns the loopback socket, the session key, the watcher, and the lifecycle files. The show subcommand wires them, the status subcommands kill the server, and the harness commands open the surface at every human gate. The prototype is the porting reference and dies at the end.

**Tech Stack:** Bun, Vitest with fast-check, `marked`, `diff2html`, `gridstack`, `codemirror` with `@codemirror/legacy-modes`, the `d2` binary.

## Global constraints

- Spec: `docs/superpowers/specs/2026-08-04-gate-surfaces-design.md`, including its section on the surface arriving at the gate.
- Work stays on `feat/gate-surfaces`; every commit follows the caveman-commit skill and ends with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Test-first is non-negotiable: probity refuses any write under `packages/*/src` until a failing test covers it, and the failing run has to happen in the transcript of whoever edits. Behavior specs, state-based, doubles only at process boundaries, hermetic temporary directories for every filesystem test.
- The porting reference is `.trash/poc/` (render.ts, reading.ts, panel.ts, viz.ts, server.ts, editor.ts). Port behavior, never copy tests, and re-decide names against the clean-code rules.
- The decisions the prototype settled bind the port: decision in the chat and never in the browser, half-or-full brick widths, dblclick full width, continuous borders on the rounded content element, tri-state theme with double-rendered D2, brief and diff as separate pages, drivers matrix without totals, callouts with an off switch, no boundary panel, no grade badges, no gamification.
- Verdict ledger: `.superpowers/sdd/2026-08-04-gate-surfaces-poc/progress.md` carries every deferred finding; consult it before re-fighting a settled question.

---

### Task 1: The page domain

**Files:**

- Create: `packages/cli/src/commands/item/surface/page.ts` (pure assembly: artifacts in, HTML out)
- Create: `packages/cli/src/commands/item/surface/page.test.ts`, `page.property.test.ts`
- Create: `packages/cli/src/commands/item/surface/reading.ts` (markdown to the reading layout), with its test pair

**Interfaces:**

- Produces: `assemblePage(item: ItemSurface, options: SurfaceOptions): string` where `ItemSurface` carries the key (from the directory name, `item.yaml` key wins when present), status, and the artifact contents already read; no filesystem inside.

- [ ] Behavior specs first, red before green, one behavior per test: the stage picks the default section and hides nothing; a missing artifact dims its nav entry; every emitted address carries the session key; ordered heading runs render as a numbered column; a document without a summary renders the quiet empty callout; the matrix renders rows without totals; the plain variant marks itself derived.
- [ ] A fast-check property per declared invariant, starting with: whatever the artifact contents, the emitted HTML never contains the key outside address positions, and every nav entry resolves to exactly one section.
- [ ] Port the assembly and reading transforms from the reference until green, then refactor to the naming rules. Commit per red-green cycle.

### Task 2: The surface server adapter

**Files:**

- Create: `packages/cli/src/commands/item/surface/server.ts` (loopback serve, key gate, WebSocket push, watcher, info file, idle timeout)
- Create: `packages/cli/src/commands/item/surface/server.test.ts` (hermetic: own temporary directory, ephemeral ports, real sockets)

**Interfaces:**

- Consumes: `assemblePage`.
- Produces: `startSurface(itemDir, options): Promise<SurfaceHandle>` (address with key, pid, stop), `reuseOrStartSurface(...)` reading the info file, `stopSurface(itemDir)` tolerating a stale pid and always removing the info file.

- [ ] Red first: a request without the key gets 403 on every route including the upgrade; a change under the item directory reaches a connected socket; a second start reuses the live server; stop kills and cleans, stale info files included; every exit path removes the info file (the prototype leaked it on idle exit).
- [ ] Port the adapter. The editor save endpoint accepts only feature files resolved inside the item, exactly as the reference guards it.

### Task 3: The show subcommand and the lifecycle

**Files:**

- Modify: `packages/cli/src/commands/item/command.ts` (add `show`; `approve`, `deliver`, `ship` kill the item's surface)

- [ ] Red first at the command boundary: `show` prints the address as JSON and opens the browser unless headless; the status movers stop a live surface; `show` on a missing item refuses with context.
- [ ] Wire, green, refactor. The d2 binary renders both themes per source; a missing binary refuses with the install hint.

### Task 4: The harness brings the surface to the gates

**Files:**

- Modify: `harness/workflow/commands/approve.md`, `review.md`, `ship.md`, `triage.md` equivalents (the gate commands run `ket item show`, say the address, and take the decision through AskUserQuestion in the chat)
- Modify: `harness/workflow/agents/solution-design.md` (writes `architecture.d2` beside the design; d2 reserved words noted), `ui-design.md` (writes the token wireframe HTML), `reviewer.md` or `review.md` (survivors land in `findings.md`), the stage skills (the change brief at `verifying`, the summary-first authoring rules from the attention rubric)

- [ ] Write the updates to the commands and agents; `harness/**` is Vale-exempt from the Microsoft rules but never from the house rules.
- [ ] Record the artifact-editing decision as an accepted record via the `adr` skill: the browser edits artifacts behind the key, decisions still move only through commands; the spec's "no surface carries an approve button" line survives, and the write path is the artifact, never the status.

### Task 5: Assets and parity

- [ ] `packages/cli` gains `marked`, `diff2html`, `gridstack`, `codemirror`, `@codemirror/legacy-modes` as dependencies; the served bundle vendors them offline. One accepted record notes the set and why each earns its place.
- [ ] Parity proof: run the product surface against `.trash/poc/item-rl2`, screenshot the same sections the prototype settled, and compare by eye against `out/round6-*.png` and `out/round5-*.png`.
- [ ] Full chain green (`bun run lint && bun run check-types && bun run test && bun run lint:spell && bun run lint:prose`), then the cli package's mutation run for the new domain.
- [ ] Delete `.trash/poc/` whole. The ledger and the committed docs are the record from here.

---

## Self-review notes

- Spec coverage: the page by stage (Task 1), the keyed live server and its lifecycle (Tasks 2 and 3), the surface arriving at every gate (Task 4), the three artifact shapes and the authoring conventions (Task 4), prototype-before-product closing with the prototype's deletion (Task 5).
- The derived plain layer with a drift gate stays out of scope here; it needs the generator design, and the ledger's open findings carry it.
- Task granularity leans on the reference implementation; the red-green rhythm and the mutation gate keep the port honest.
