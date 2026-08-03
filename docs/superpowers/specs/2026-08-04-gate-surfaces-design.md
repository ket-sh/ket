# The gate surfaces

Date: 2026-08-04. Status: approved. Own branch, own pull request.

## Why

The pipeline stops for a person four times, and today every stop is prose in
the chat. The design artifacts behind `/ket:approve` are long documents, the
architecture lives in the reader's head, and a UI decision has no picture.
Approving a change means reading every file on GitHub. Each gate keeps its
decision in the chat and gains a surface that shows what the decision is
about, without leaving Claude Code.

## The decision stays in the chat

- Every gate resolves in the conversation: a structured summary, then
  AskUserQuestion, then the command that moves the item. No surface carries
  an approve button.
- The triage and decomposition confirmations move to AskUserQuestion. A
  question carries four options at most, so decomposition candidates arrive
  in groups of four.
- AskUserQuestion is unavailable inside subagents, so a gate always
  resolves in the main session. The harness commands already run there.

## One command serves the eyes

- `ket item show <key>` assembles a review page from the artifacts beside
  the item, starts an ephemeral loopback server, opens the browser, and
  prints the address as JSON.
- The server binds `127.0.0.1` on an ephemeral port and gates every request
  behind a session key drawn from `/dev/urandom`. The superpowers companion
  server is the security template: loopback bind, key in the query string,
  state files written under `umask 077`.
- The server watches the item's directory and pushes every change to the
  open tab over a WebSocket, so a revision during the request-changes loop
  appears without a refresh. The session key gates the WebSocket the same
  way it gates HTTP.
- A second `show` for the same item reuses the live server instead of
  starting another.
- The server dies with the gate. The command that moves the item's status
  kills it, and a four hour idle timeout collects the abandoned tab.

## What the page shows, by stage

- While the item awaits approval: the solution design with its architecture
  diagram, the ADR, the acceptance criteria, and the UI wireframe.
- While the item verifies or awaits merge: the change brief on top, the
  surviving review findings under it, and the full diff collapsed at the
  bottom, rendered by a vendored diff2html.

## The artifacts grow three shapes

- `ket:solution-design` writes `architecture.d2` beside `solution-design.md`.
  The show command shells out to the `d2` binary for a bundled,
  self-contained SVG, and the chat summary may carry the same diagram as
  text through `d2 --ascii-mode`. A missing binary refuses with the install
  hint. D2 renders offline from one binary; the price, recorded here, is
  that GitHub renders Mermaid fences and not D2.
- `ket:ui-design` writes `ui-design.html` beside `ui-design.md`: a wireframe
  built from the scaffold's real design tokens, schematic on purpose. It
  states a design decision, not an implementation promise.
- When an item enters `verifying`, the session writes `change-brief.md`:
  what changed, file by file, why, and where a reviewer should look first.
  This is meat's job without meat's API key, because the model is already
  in the session. A brief is a navigation aid, not a review; the two-seat
  review stays the judge, and `/ket:review` writes its surviving findings
  to `findings.md` so the page can show them.

## Prototype before product

- The whole experience prototypes under `.trash/poc/` first: a realistic
  item directory, a small Bun server script, a D2-rendered SVG, and a
  change brief written from a real diff in this repository.
- What survives the prototype ships as real items through the pipeline: the
  show command in `packages/cli` behind its failing tests, and the updates
  to the commands and agents under `harness/`.

## Out of scope

- Approve buttons in the browser. The decision point stays single.
- difit and meat as dependencies. difit shows the raw diff the brief exists
  to spare the reader from, and meat ships the diff to an external API the
  session already replaces.
- Installing `d2` for scaffold users, beyond the refusal with the hint.
- Model Context Protocol (MCP) Apps. The terminal client can't render them
  today; recheck later.
