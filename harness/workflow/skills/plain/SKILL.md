---
name: plain
description: Use after writing or revising a prose artifact. The plain-language sibling, who derives it, the stamp that ties it to its source, and the drift the gate reads.
---

# The plain-language sibling

Three artifacts can carry a plain-language sibling beside them: `spec.md` with
`spec.plain.md`, `solution-design.md` with `solution-design.plain.md`, and
`adr.md` with `adr.plain.md`. The sibling says what the technical document
says, for a reader who approves the work without living in the code. The
approval page offers both behind a switch, and dims the plain option where
nobody wrote one.

## Who derives it, and when

The agent that wrote the technical artifact derives its sibling, last, after
the technical document settles. A sibling derived early describes a draft.
Revising the technical artifact re-opens this duty: derive again, or reread
the sibling and confirm it still holds.

The sibling is a derived reading, never a second source of truth. The
technical document stays authoritative, and the sibling's last line says so:

```markdown
A plain-language reading of the solution design. The technical document is
authoritative.
```

## How to write it

- Open with a `# ` title. The page drops everything above the first title, so
  a sibling without one leaks its stamp into the prose.
- Put `> **TL;DR** <the whole document in one plain line>` right under the
  title, under 160 characters, with a verb in it. The page lifts that quote
  into the callout above the sibling and falls back to `No summary written`
  where nobody wrote one, so the first paragraph never restates it.
- One idea per sentence, under 20 words, active voice, no term the reader
  would have to look up. Name outcomes, not mechanisms.
- Keep the shape flat: a title, a few short paragraphs, at most one list. The
  reader who needs headings navigation reads the technical document instead.
- Write it in the language the project writes its documentation in.

## The stamp

After deriving, stamp the item:

```
ket item stamp <key>
```

The command writes a `Source:` fingerprint above each sibling's title, tying
it to the technical document it read. Never write or edit that line by hand;
the stamp owns it, and the page never shows it.

## The drift

```
ket item drift <key>
```

One line per sibling: `fresh`, `stale`, `unstamped`, or `orphaned`, failing on
anything but fresh. Stale means the technical document moved after the stamp:
re-derive or confirm the sibling, then stamp again. The approval page shows the
same reading as a note beside the switch, so a reviewer sees a lagging sibling
without running anything.

The check has no off switch. The honest answer to a stale sibling is a fresh
derivation or a deliberate restamp, both of which leave a diff a review can
see.
