# The surface answers for its five rented dependencies

Status: accepted
Date: 2026-08-06

## Context

The gate surface serves an item's artifacts as server-rendered HTML over a
loopback port. Bun runs everything in this repository, but the surface's tests
run under Node. Stryker's mutation runner binds to Vitest, and the mutation
gate is this product's central claim. Every runtime dependency the surface
takes must therefore work on both runtimes, ship its own types where possible,
and carry a defensible supply chain. Whatever the surface bundles reaches a
reviewer's browser through the served page.

Five packages earn a place: `ws` 8, `marked` 17, `diff2html` 3, `gridstack` 13,
and `codemirror` 6 with `@codemirror/legacy-modes` for the Gherkin mode. This
record holds why each one, and what each costs.

## Decision

- **`ws`** carries the live-reload channel on top of `node:http`. The built-in
  first rule points at `Bun.serve()` WebSockets, and they lose here for one
  reason only: `Bun.serve` doesn't exist under Node, and the mutation gate runs
  the server's tests there. `ws` has no runtime dependencies and runs on both.
  `socket.io` lost because a loopback page needs no reconnection tiers, no
  rooms, and no long-poll fallback, and its client costs 200 KB.
- **`marked`** renders the markdown artifacts. It has no runtime dependencies,
  ships its own types, and the surface never trusts its raw HTML pass-through:
  the renderer escapes every HTML token and drops links outside the safe scheme
  list. `markdown-it` buys parser-level HTML refusal at the price of six
  runtime dependencies; `remark` is a transformation toolchain the surface
  doesn't need.
- **`diff2html`** turns `git diff` text into the folded file views. Its input
  shape is the deciding factor: the surface already holds unified diff text, and
  the bare `diff` package alone would mean writing the renderer and the parser
  by hand. The
  React diff viewers are out because the page has no React.
- **`gridstack`** lays the panels as draggable, resizable bricks. It's
  framework-neutral TypeScript with zero runtime dependencies and first-party
  types. `react-grid-layout` is React-only, `muuri` has no resize model, and
  `interact.js` is a gesture primitive that would leave the layout engine to
  ket.
- **`codemirror`** powers the criteria editors, one per feature file. The
  version 6 meta-package tree-shakes to a small bundle, edits well on phones,
  and takes the legacy Gherkin mode through `@codemirror/legacy-modes`. Monaco
  brings a VS Code experience the page doesn't need at several megabytes;
  a bare text area loses highlighting and bracket matching, which is the whole
  point of an editor for acceptance criteria.

## Consequences

**Good**: every package here runs identically under Bun and Node, so the served
page and the mutation gate exercise the same code. Four of the five ship their
own types. The served bundle vendors everything at serve time through
`Bun.build`, so an open surface needs no network.

**Bad**: `ws` has no first-party types, so `@types/ws` rides along as a second
trust boundary. `diff2html` renders through `@profoundlogic/hogan`, a
single-vendor fork of Twitter's abandoned template engine. That fork sits in
the render path of every diff the surface shows, and a lockfile pin plus the
regular dependency review carry the risk until upstream moves. `marked` left
sanitizing to its callers by design, so the escaping in the reading renderer is
load-bearing and its tests are the proof it stays that way.
