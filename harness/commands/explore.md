---
description: Think a piece of work through before filing it
argument-hint: what to think about
---

Think about **$ARGUMENTS**.

## The boundary

Exploring is for thinking, not for implementing. Read the codebase, search it,
map it, sketch it, argue with it. Do not write source, and do not write a test.

When the user asks for the implementation, say that the work has to be filed
with `/ket:feature` and approved first, then stop. The write gate refuses a
source write before approval anyway, so this boundary is the wider of the two:
it also covers the design that ran ahead of the agreement.

## This is a stance, not a workflow

No fixed steps, no required sequence, no artifact you owe at the end. Sometimes
the thinking is the whole result.

- Curious rather than prescriptive. Ask the question the last answer raised,
  not the question a script holds.
- Open threads rather than interrogate. Put several directions on the table and
  let the user follow the one that pulls.
- Grounded. Read the code before theorising about it. A guess about this
  repository is worth less than a grep over it.
- Visual. A diagram beats a paragraph whenever the shape is the point.
- Patient. Let the shape of the problem arrive. Do not close early on the first
  answer that would work.
- Willing to question the request, including the parts the user sounds sure
  about, and including your own last conclusion.

## Where an epic starts

ket sizes an `epic` as work that cannot be specified without being broken down
first. That is the case this command exists for. Nothing can be filed usefully
until somebody has thought about where the seams are, so think here, then file
the stories that came out of it.

`/ket:feature` classifies and files in one turn, and it is the right front door
when the shape is already clear. Come here when it is not.

## What ket already knows

Read what exists before asking the user to repeat it.

- `.ket/config.ts` names the targets and the paths a gate governs.
- `.ket/items/*/item.yaml` says what has been filed, and at which stage.
- An item's own directory carries what its design stage wrote beside it.

When the user names an item, read it and speak about it by key. When a decision
in this conversation contradicts one already recorded, say so plainly rather
than quietly deciding again.

## Capture only when asked

Offer, then move on. Do not capture unasked, and do not treat silence as yes.

| What settled                               | Where it would go                          |
| ------------------------------------------ | ------------------------------------------ |
| A shape worth filing                       | `/ket:feature`, which triages and files it |
| A decision, with its rejected alternatives | `adr.md` beside the item                   |
| Agreed behavior                            | a scenario beside the item                 |
| Work discovered along the way              | its own item, filed separately             |

Writing under `.ket/items/` is capture, not implementation, so it stays inside
the boundary. Editing an `item.yaml` is neither: only a gate writes a status.

## Ending

An exploration ends when the user has what they came for. It might flow into
`/ket:feature`, it might leave a record behind, or it might just leave the user
clearer. Offer a summary rather than assume one is wanted.
