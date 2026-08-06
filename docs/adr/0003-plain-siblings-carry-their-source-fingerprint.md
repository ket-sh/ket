# Plain siblings carry their source fingerprint above the title

Status: accepted
Date: 2026-08-06

> **TL;DR** Ties each plain sibling to its technical source with one in-file
> fingerprint line the page never shows, checked by `ket item drift`.

## Context

The gate surface offers a plain-language sibling beside `spec.md`,
`solution-design.md`, and `adr.md`. The workflow derives the sibling from the
technical document, and no two derivations come out byte for byte the same. A
mechanical gate still has to say when the technical document moved after the
derivation. The record here holds where that tie lives and what shape it
takes.

## Decision drivers

- Invisible on the approval page
- Travels with the file it describes
- A hand edit to the sibling stays legitimate
- Reviewable in an ordinary diff
- No new file kinds beside the item

## Decision

Option: A Source line above the title
Verdicts: ++ | ++ | ++ | + | ++

Each sibling opens with `Source: <hex>`: the first twelve hex characters of
the technical source's `sha256` digest. The line seats
above the `# ` title, the reading layout drops
everything above the first title, and the marker never reaches a reader.
`ket item stamp` owns the line. `ket item drift` answers `fresh`, `stale`,
`unstamped`, or `orphaned` per sibling, failing on anything but fresh. Only
the source side gets a hash: the sibling invites hand edits, and a check that
flags every wording fix trains people to restamp without reading.

## Alternatives

### A sidecar lock beside the item

Verdicts: ++ | - | ++ | + | --

One machine-owned file per item, the Terraform and uv shape. It keeps prose
untouched, but a copied or renamed sibling detaches from its entry, and every
item grows a file kind that exists only for the check.

Cost: a second file to keep honest, and pairing that breaks on a move.

### Comparing git history

Verdicts: ++ | ? | ++ | -- | ++

The Lunaria shape: compare the last meaningful commit that touched each side.
Nothing lands on disk, which also means the tie has no reviewable record. The
check needs full history depth and reads squash merges as noise.

Cost: a check that depends on how CI fetched and merged the repository.

### Hashing both sides

Verdicts: ++ | ++ | -- | + | ++

The gh-aw shape: fingerprint the source and the derived text. It answers "did
someone hand-edit the sibling," which is a question ket never asks. The
surface exists so a reviewer can fix wording in place.

Cost: every legitimate edit reads as drift until someone restamps.

### Trusting file timestamps

Verdicts: X | X | X | X | X

Git sets timestamps at checkout, so every clone reads as drift everywhere.

Cost: a gate that fires on clone and never on the thing it watches.

## Consequences

**Good**: the tie lives in the one file it describes, and a restamp shows up
as a one-line diff. The page, the CLI, and the harness all read the same
answer. The stamp doubles as the re-bless verb: a human who confirms a
sibling still holds restamps it, and that decision leaves a diff.

**Bad**: a sibling without a leading `# ` title would leak the marker into
its rendered prose, so the convention makes the title mandatory. The
twelve-hex prefix is a staleness signal, never a security boundary. It also
says nothing about whether the sibling reads plainly, so a readability rule
scoped to `*.plain.md` stays open as a follow-up.
