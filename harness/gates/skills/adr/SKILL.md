---
name: adr
description: Use when recording a decision. The template, where the record lives, and why an accepted record is superseded rather than edited.
---

# Decision records

A record with one option is a preference. What makes it a decision is the set
of alternatives you rejected and what each one would have cost.

## Where it lives

`.ket/items/<key>/adr.md`, beside the item whose design stage decided it.
Without the workflow, the artifact lives under `docs/adr/` instead.

The item key is the number. ket allocates keys in order already, and a second
numbering scheme would be a hand-maintained list that has to agree with the
first. A list like that is where a gap hides, so ket keeps only one. To find
every decision this project has made, read `.ket/items/*/adr.md`.

## The template

```markdown
# The decision, written as a sentence

Status: accepted
Date: the day it was decided

## Context

Why the decision was needed. Two to four sentences about this project, not
about software in general.

## Decision drivers

- What the decision must satisfy, one line each
- The next driver

## Decision

Option: The chosen option, named the way its alternatives are named
Verdicts: ++ | +

What was decided, in plain words.

## Alternatives

### The option

Verdicts: -- | ++

What it costs, and why it lost.

Cost: the price, in one line.

### The next option

Verdicts: + | -

The same, for the next option.

Cost: its price, in one line.

## Consequences

**Good**: what this buys, concretely.

**Bad**: the trade-offs and the risks, honestly, with the mitigation where one
exists.
```

At least two rejected alternatives. Name what each one costs rather than
dismissing it, because the reader who reopens this decision will be somebody
who thinks the rejected option was better.

## What the approval page folds

The gate surface reads this exact shape. Each `###` alternative lifts into its
own card, and the `Cost:` line becomes the strip under that card. The
`## Decision drivers` bullets, the `Option:` line, and the `Verdicts:` lines
fold into a matrix panel beside the record: one row per option, one column per
driver, read left to right in driver order.

A verdict line holds one glyph per driver, split on `|`. The vocabulary is
`++` strongly meets, `+` meets, `0` neutral, `-` misses, `--` strongly misses,
`X` ruled out, and `?` unknown. Verdict honestly: a row of `++` reads as
marketing, and `?` is the honest glyph for a driver nobody measured. The page
strips the `Option:` and `Verdicts:` lines out of the prose, and a row whose
glyph count misses the driver count is dropped whole.

The matrix stays optional. Skip the drivers and the verdict lines, and the page
simply lays no matrix; no column is summed either way, because the matrix shows
the reading and the decision stays in the prose.

## Never edit an accepted record

A record is history. When the decision changes, write a new record on the new
item and name the one it supersedes. Set the old record's status to
`superseded by <key>` and leave the rest of it alone.

Editing an accepted record deletes the reason somebody chose the thing you are
now replacing, and that reason is the one thing the record exists to keep.

## Keep it under a page

Honest costs beat marketing. A record nobody finishes reading records nothing.
