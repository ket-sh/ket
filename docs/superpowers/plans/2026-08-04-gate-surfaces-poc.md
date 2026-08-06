# Gate surfaces prototype implementation plan

> **For agentic workers:** Required sub-skill: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the gate surface experience end to end under `.trash/poc/`. A live loopback server shows an item's design artifacts, diagram, wireframe, and change brief, and updates the open tab without a refresh.

**Architecture:** A realistic item directory feeds `render.ts`. A Bun server binds `127.0.0.1` on an ephemeral port behind a session key, watches the item directory, and pushes every change to the tab over a WebSocket. The decision never enters the browser. The page only shows.

**Tech Stack:** Bun (`Bun.serve` with WebSocket upgrade, `node:fs` watch), the `d2` binary, `marked`, `diff2html`.

## Global constraints

- Spec: `docs/superpowers/specs/2026-08-04-gate-surfaces-design.md`.
- Work stays on the branch `feat/gate-surfaces`; it lands through its own pull request.
- Every commit message follows the caveman-commit skill and ends with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Everything the prototype writes stays under `.trash/poc/`, which `.gitignore` already excludes. No task commits prototype files, and no task writes outside that directory.
- The server binds `127.0.0.1` only. Every HTTP request and the WebSocket upgrade carry the session key or get a 403.
- No em dash in any authored prose, including the prototype's markdown artifacts.

---

### Task 1: The toolchain and the workspace

**Files:**

- Create: `.trash/poc/package.json` (via `bun init` and `bun add`)

**Interfaces:**

- Produces: `.trash/poc/` with `diff2html` and `marked` installed, a working `d2` binary on the machine, and the directories `item/` and `out/`.

- [ ] **Step 1: Install and verify d2.** Run `command -v d2 || brew install d2`, then `d2 --version`. Expected: a version prints. The spec's refusal path ("a missing binary refuses with the install hint") is what the product builds later; the prototype needs the binary itself.
- [ ] **Step 2: Create the workspace.** Run `mkdir -p .trash/poc/item .trash/poc/out`, then `git check-ignore .trash/poc`. Expected: the path prints back, proving git never sees the prototype.
- [ ] **Step 3: Install the two libraries.** Inside `.trash/poc/`: `bun init -y && bun add diff2html marked`. Expected: `bun.lock` and `node_modules/` appear under `.trash/poc/` only.
- [ ] **Step 4: Confirm the diff2html stylesheet path.** `ls .trash/poc/node_modules/diff2html/bundles/css/diff2html.min.css`. Expected: the file exists. `render.ts` reads it into the page.

---

### Task 2: The item directory

**Files:**

- Create: `.trash/poc/item/item.yaml`
- Create: `.trash/poc/item/solution-design.md`
- Create: `.trash/poc/item/architecture.d2`
- Create: `.trash/poc/item/adr.md`
- Create: `.trash/poc/item/acceptance.feature`
- Create: `.trash/poc/item/ui-design.md`
- Create: `.trash/poc/item/ui-design.html`
- Create: `.trash/poc/item/change-brief.md`
- Create: `.trash/poc/item/findings.md`
- Create: `.trash/poc/item/change.diff`

**Interfaces:**

- Produces: the artifact set `render.ts` reads. `item.yaml` carries `status:` on its own line, and `render.ts` switches views on it.

The item describes the gate surfaces feature itself, so the prototype reviews its own design and the content stays honest.

- [ ] **Step 1: Write `item.yaml`.**

```yaml
key: KET-42
title: The gate surfaces
kind: feature
size: story
status: awaiting-approval
```

- [ ] **Step 2: Write `architecture.d2`.**

```d2
session: Claude Code session {
  approve: /ket:approve
  question: AskUserQuestion
}
cli: ket item show {
  assemble: page assembly
  render: d2 render
}
server: loopback server {
  http: HTTP behind the session key
  ws: WebSocket push
}
item: .ket/items/KET-42 {
  design: solution-design.md
  diagram: architecture.d2
  wire: ui-design.html
  brief: change-brief.md
}
tab: review tab

session.approve -> cli: starts
item -> cli.assemble: feeds
cli -> server: serves
server.ws -> tab: pushes changes
tab -> server.http: asks with the key
session.question -> session: the decision stays here
```

- [ ] **Step 3: Compile the diagram both ways.** Run `d2 .trash/poc/item/architecture.d2 .trash/poc/out/architecture.svg` and `d2 --ascii-mode extended .trash/poc/item/architecture.d2 .trash/poc/out/architecture.txt`. Expected: both files render, and the text one reads as a diagram in the terminal. Fix the source until both pass.
- [ ] **Step 4: Write `solution-design.md`.** Sections, in order: `## The seam` (the show command reads artifacts, the session decides in chat), `## Modules that change` (name `packages/cli/src/commands/item/`, the page assembly, the server), `## Boundaries kept` (no renderer import in `packages/cli`, the TUI stays out, the browser never writes state). Three short paragraphs, one per section, grounded in the spec.
- [ ] **Step 5: Write `adr.md`.** One decision record: D2 over Mermaid. Context (the surface is a browser, the artifacts live in markdown), decision (a `.d2` file beside the design, rendered by the binary), consequences (offline single binary and a text mode for the chat; GitHub renders Mermaid fences and not D2, recorded as the price).
- [ ] **Step 6: Write `acceptance.feature`.**

```gherkin
Feature: The gate surfaces

  Scenario: An item awaiting approval shows its design
    Given an item awaiting approval with design artifacts beside it
    When the reviewer opens the item's page
    Then the page shows the solution design, the decision record, the acceptance criteria, and the wireframe

  Scenario: A verifying item shows its change brief before its diff
    Given a verifying item with a change brief and review findings
    When the reviewer opens the item's page
    Then the change brief appears before the findings and the full diff stays collapsed

  Scenario: A revised artifact reaches the open tab unasked
    Given an open item page
    When a design artifact beside the item changes
    Then the page shows the revision without the reviewer refreshing
```

- [ ] **Step 7: Write `ui-design.md` and `ui-design.html`.** The markdown states the layout decision in prose (a single column, brief before findings before diff, one accent color for actions). The HTML is the schematic wireframe built from the web preset's real tokens, copied from `presets/web/files/source/styles.css`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>KET-42 wireframe</title>
    <style>
      :root {
        --color-surface: oklch(1 0 0);
        --color-surface-sunken: oklch(0.97 0 0);
        --color-ink: oklch(0.21 0 0);
        --color-ink-muted: oklch(0.47 0 0);
        --color-brand: oklch(0.48 0.19 265);
        --color-brand-ink: oklch(0.99 0 0);
        --color-edge: oklch(0.89 0 0);
        --radius-panel: 0.75rem;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --color-surface: oklch(0.18 0 0);
          --color-surface-sunken: oklch(0.14 0 0);
          --color-ink: oklch(0.97 0 0);
          --color-ink-muted: oklch(0.73 0 0);
          --color-brand: oklch(0.76 0.15 265);
          --color-brand-ink: oklch(0.16 0 0);
          --color-edge: oklch(0.31 0 0);
        }
      }
      body {
        background: var(--color-surface);
        color: var(--color-ink);
        font-family: system-ui, sans-serif;
        margin: 0;
        padding: 2rem;
        display: grid;
        gap: 1rem;
        max-width: 48rem;
      }
      .panel {
        border: 1px solid var(--color-edge);
        border-radius: var(--radius-panel);
        padding: 1rem;
        background: var(--color-surface-sunken);
      }
      .panel h2 {
        margin: 0 0 0.5rem;
        font-size: 1rem;
      }
      .ghost {
        color: var(--color-ink-muted);
      }
      .actions {
        display: flex;
        gap: 0.5rem;
      }
      .button {
        border-radius: var(--radius-panel);
        padding: 0.5rem 1rem;
        border: 1px solid var(--color-edge);
      }
      .button.primary {
        background: var(--color-brand);
        color: var(--color-brand-ink);
        border-color: var(--color-brand);
      }
    </style>
  </head>
  <body>
    <header class="panel">
      <h2>KET-42 · The gate surfaces</h2>
      <span class="ghost">awaiting approval</span>
    </header>
    <section class="panel">
      <h2>Change brief</h2>
      <p class="ghost">What changed, file by file, and where to look first.</p>
    </section>
    <section class="panel">
      <h2>Findings</h2>
      <p class="ghost">What survived the two-seat review.</p>
    </section>
    <section class="panel">
      <h2>Diff</h2>
      <p class="ghost">Collapsed until asked.</p>
    </section>
    <footer class="actions">
      <span class="button primary">Decided in the chat</span>
      <span class="button">Not here</span>
    </footer>
  </body>
</html>
```

- [ ] **Step 8: Capture the real diff.** Run `git show e4f67f7 > .trash/poc/item/change.diff`. Expected: a multi-file diff of the reviewer pair change.
- [ ] **Step 9: Write `change-brief.md` from that diff.** Read `.trash/poc/item/change.diff` first, then write the brief a reviewer would want: `## What this change does` (one paragraph), `## File by file` (one line per file in the diff, naming what moved and why), `## Where to look first` (the one or two hunks that carry the risk). Every named file exists in the diff; nothing invented.
- [ ] **Step 10: Write `findings.md`.** Two entries in the findings shape the review commands use: location, defect, failure scenario, verdict. Ground both in the real diff (a hook contract edge and a marker path assumption are honest candidates). Mark one `confirmed` and one `dropped` with its reason, so the page proves it renders both.

---

### Task 3: The page assembly and the server

**Files:**

- Create: `.trash/poc/render.ts`
- Create: `.trash/poc/server.ts`
- Create: `.trash/poc/stop.ts`

**Interfaces:**

- Consumes: the Task 2 artifact set, the Task 1 packages.
- Produces: `renderPage(itemDir: string, key: string): Promise<string>`; a server whose stdout prints `{ "url": string, "port": number, "pid": number }` and which writes the same JSON to `.trash/poc/out/server-info.json`; `stop.ts`, which kills the pid from that file.

- [ ] **Step 1: Write `render.ts`.**

```ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { html as diffToHtml } from 'diff2html';
import { marked } from 'marked';

const read = async (dir: string, name: string): Promise<string> => {
  try {
    return await readFile(join(dir, name), 'utf8');
  } catch {
    return '';
  }
};

const section = (title: string, body: string): string =>
  body ? `<section class="panel"><h2>${title}</h2>${body}</section>` : '';

const prose = async (dir: string, name: string): Promise<string> =>
  marked.parse(await read(dir, name)) as string;

const diagram = (dir: string): string => {
  const rendered = Bun.spawnSync(['d2', join(dir, 'architecture.d2'), '-']);
  return rendered.exitCode === 0 ? rendered.stdout.toString() : '';
};

const stageOf = (itemYaml: string): string =>
  itemYaml.match(/^status: (.+)$/m)?.[1] ?? 'awaiting-approval';

const approvalSections = async (dir: string, key: string): Promise<string> =>
  [
    section('Solution design', await prose(dir, 'solution-design.md')),
    section('Architecture', diagram(dir)),
    section('Decision record', await prose(dir, 'adr.md')),
    section('Acceptance criteria', `<pre>${await read(dir, 'acceptance.feature')}</pre>`),
    section(
      'Wireframe',
      `<iframe src="/wireframe?key=${key}" style="width:100%;height:32rem;border:1px solid var(--color-edge);border-radius:0.75rem"></iframe>`,
    ),
  ].join('');

const reviewSections = async (dir: string): Promise<string> => {
  const diff = await read(dir, 'change.diff');
  const diffHtml = diff ? diffToHtml(diff, { drawFileList: true }) : '';
  const diffCss = await readFile(
    join(import.meta.dir, 'node_modules/diff2html/bundles/css/diff2html.min.css'),
    'utf8',
  );
  return [
    section('Change brief', await prose(dir, 'change-brief.md')),
    section('Findings', await prose(dir, 'findings.md')),
    section(
      'Diff',
      `<style>${diffCss}</style><details><summary>The full diff</summary>${diffHtml}</details>`,
    ),
  ].join('');
};

export const renderPage = async (itemDir: string, key: string): Promise<string> => {
  const item = await read(itemDir, 'item.yaml');
  const stage = stageOf(item);
  const showsDesign = stage === 'designing' || stage === 'awaiting-approval';
  const body = showsDesign ? await approvalSections(itemDir, key) : await reviewSections(itemDir);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>KET-42 · ${stage}</title>
<style>
  :root { --color-edge: oklch(0.89 0 0); }
  body { font-family: system-ui, sans-serif; max-width: 56rem; margin: 2rem auto; padding: 0 1rem; display: grid; gap: 1rem; }
  .panel { border: 1px solid var(--color-edge); border-radius: 0.75rem; padding: 1rem; overflow-x: auto; }
  .panel h2 { margin-top: 0; font-size: 1rem; }
  .panel svg { max-width: 100%; height: auto; }
</style>
</head>
<body>
<header class="panel"><h2>KET-42 · The gate surfaces · ${stage}</h2></header>
${body}
<script>
  const live = new WebSocket(\`ws://\${location.host}/ws?key=${key}\`);
  live.onmessage = () => location.reload();
</script>
</body>
</html>`;
};
```

- [ ] **Step 2: Write `server.ts`.**

```ts
import { watch } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { renderPage } from './render.ts';

const itemDir = join(import.meta.dir, 'item');
const infoPath = join(import.meta.dir, 'out', 'server-info.json');
const key = randomBytes(24).toString('base64url');
const idleMs = Number(process.env['KET_POC_IDLE_MS'] ?? 4 * 60 * 60 * 1000);
const tabs = new Set<Bun.ServerWebSocket<unknown>>();

let idle = setTimeout(() => process.exit(0), idleMs);
const alive = (): void => {
  clearTimeout(idle);
  idle = setTimeout(() => process.exit(0), idleMs);
};

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request, self) {
    const url = new URL(request.url);
    if (url.searchParams.get('key') !== key) {
      return new Response('refused: missing or wrong session key', { status: 403 });
    }
    alive();
    if (url.pathname === '/ws') {
      return self.upgrade(request) ? undefined : new Response('upgrade refused', { status: 400 });
    }
    if (url.pathname === '/wireframe') {
      const wire = await readFile(join(itemDir, 'ui-design.html'), 'utf8');
      return new Response(wire, { headers: { 'content-type': 'text/html' } });
    }
    return new Response(await renderPage(itemDir, key), {
      headers: { 'content-type': 'text/html' },
    });
  },
  websocket: {
    open(ws) {
      tabs.add(ws);
    },
    close(ws) {
      tabs.delete(ws);
    },
    message() {},
  },
});

let pending: ReturnType<typeof setTimeout> | undefined;
watch(itemDir, { recursive: true }, () => {
  clearTimeout(pending);
  pending = setTimeout(() => {
    alive();
    for (const tab of tabs) tab.send('changed');
  }, 150);
});

const info = {
  url: `http://127.0.0.1:${server.port}/?key=${key}`,
  port: server.port,
  pid: process.pid,
};
await writeFile(infoPath, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info));
```

- [ ] **Step 3: Write `stop.ts`.**

```ts
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const infoPath = join(import.meta.dir, 'out', 'server-info.json');
const info = JSON.parse(await readFile(infoPath, 'utf8')) as { pid: number };
process.kill(info.pid);
await rm(infoPath);
console.log(`stopped ${info.pid}`);
```

- [ ] **Step 4: Start and probe.** Run `cd .trash/poc && bun server.ts &`, capture the JSON line. Then `curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:<port>/"`. Expected: `403`. Then curl the full `url` from the JSON. Expected: HTML containing `Solution design`, `Architecture`, an `<svg`, `Acceptance criteria`, and the wireframe iframe.
- [ ] **Step 5: Probe the other stage.** Edit `item.yaml` to `status: verifying`, curl the `url` again. Expected: HTML containing `Change brief`, `Findings`, `<details>`, and diff2html markup. Restore `status: awaiting-approval` afterward.

---

### Task 4: Live behavior, in a real browser

**Interfaces:**

- Consumes: the running server and its `server-info.json`.

Chrome verifies every claim here. A page nobody rendered proves nothing.

- [ ] **Step 1: Open the tab.** `open "$(jq -r .url .trash/poc/out/server-info.json)"`. Expected: the approval view renders with the diagram and the wireframe.
- [ ] **Step 2: Prove the push.** With the tab open, append a line to `.trash/poc/item/solution-design.md`. Expected: the tab shows the new line within a second, untouched. Then flip `item.yaml` to `status: verifying`. Expected: the tab morphs to the review view by itself. This is the spec's no-refresh requirement; if it fails, fix the watch or the WebSocket before moving on.
- [ ] **Step 3: Screenshot both stages headless.** For each status value, run Chrome headless against the keyed `url`: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --screenshot=.trash/poc/out/<stage>.png --window-size=1200,1600 "<url>"`, then read both images. Expected: the approval shot shows the four design sections and the wireframe, and the review shot shows brief, findings, and the collapsed diff.
- [ ] **Step 4: Prove the idle timeout.** Restart with `KET_POC_IDLE_MS=15000 bun server.ts &`, wait twenty seconds without touching it, then `ps -p <pid>`. Expected: `ps` finds nothing.
- [ ] **Step 5: Prove the stop.** Start again, run `bun stop.ts`. Expected: `stopped <pid>` prints, `ps -p <pid>` finds nothing, and `stop.ts` removed `server-info.json`.
- [ ] **Step 6: Show the terminal diagram.** `cat .trash/poc/out/architecture.txt`. Expected: the text rendering reads as the same architecture. This is what the chat summary would carry.

---

### Task 5: The verdict

- [ ] **Step 1: Present the evidence.** Show the user both screenshots, the live-push observation, the text diagram, and the timings that stood out. Say plainly what felt wrong.
- [ ] **Step 2: Record what survives.** With the user, mark each surface keep, change, or drop: the page assembly, the keyed live server, the D2 pair, the wireframe, the brief-over-diff page.
- [ ] **Step 3: Draft the product items.** For what survived, list the items the pipeline takes next: the show command in `packages/cli` behind failing tests, the server lifecycle tied to the status commands, and the harness updates (`approve.md`, `review.md`, the design agents, the AskUserQuestion moves for triage and decomposition). Each item gets a one-line deliverable; filing them is the user's call.

---

## Self-review notes

- Spec coverage: the loopback server behind a session key (Task 3), the push without refresh (Task 4 step 2), server reuse and the kill by status commands stay product scope (Task 5 step 3 carries them), the stage-split page (Tasks 2 and 3), the three new artifact shapes (Task 2), D2 with the text mode (Task 2 step 3, Task 4 step 6), the brief over the collapsed diff (Task 2 steps 8 to 10, Task 3), prototype-before-product (the whole plan).
- The prototype skips the four-hour default only through `KET_POC_IDLE_MS`; the default in the code matches the spec.
- Type consistency: `renderPage(itemDir, key)` is the one seam between Tasks 3 and 4. Task 3 names the server-info JSON shape once, and `stop.ts` with the Task 4 steps read it.
