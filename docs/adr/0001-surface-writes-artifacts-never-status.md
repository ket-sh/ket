# The review surface writes artifacts and never a status

Status: accepted
Date: 2026-08-05

## Context

The gate surface serves an item's artifacts over a loopback port behind a session
key, and every human gate opens it. A reviewer reading the acceptance criteria on
that page finds a wording defect in a scenario, and wants to fix it where they
read it. The same page shows the item's status, one step from the command that
moves it.

ket keeps that status in `.ket/items/<key>/item.yaml`, and only a command writes
one. The write gate refuses a hand edit to that file, because a status anything
can write means nothing to the gates that read it.

## Decision

The browser edits artifacts. It never moves an item.

The surface takes a save for a feature file under the item's `features`
directory. The server resolves the path inside the item directory, refuses
anything landing outside it or missing the `.feature` extension, and gates that
route behind the session key like every other route. The watcher pushes the saved
file back to the open tab.

Nothing on the page moves a status. Each gate command says the address, gives the
summary, asks the question in the chat, and then runs `ket item approve`,
`ket item deliver`, or `ket item ship`. That command closes the surface as it
moves the item. No surface carries an approve button.

## Alternatives

- **A read-only surface**: costs the reviewer a round trip for every typo. They
  describe the edit in the chat, the session applies it, and the page reloads. The
  request-changes loop pays that cost again at each pass, and it lands on the
  person the surface exists to serve. It lost on that.
- **An approve button on the page**: costs the pipeline its single decision point.
  Two places would then move one item, and the record of who decided splits
  between the browser and `.ket/events.jsonl`. The session key gates a port rather
  than naming a person, so a status arriving over that port answers for nobody. It
  lost on that.

## Consequences

**Good**: the reviewer fixes a scenario where they read it, and git records that
edit like any other write. Status stays the output of a command, so
`ket gate shell` and the event log keep one authority between them. Both refusals
stay mechanical: a resolved path and an extension for the write, a command for the
move.

**Bad**: whatever holds the session key can write a feature file inside the item
directory, so that key carries the whole boundary. The loopback bind and the
random key are the mitigation. The server also writes the address, the port, and
its pid to `.surface.json` beside the item, so a project committing that file
commits a live key with it. Ignoring `.surface.json` closes that, and a fresh key
per start limits what an old one buys. A reviewer editing a scenario mid-gate
changes the artifact the review answered for, and nothing warns them. The open tab
showing the saved file is the only signal.
