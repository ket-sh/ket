---
name: prior-art
description: Use before building anything, and again the moment you catch yourself writing a utility. The two searches that come first, when each is owed, and what a departure from the settled answer has to record.
---

# Look for the settled answer first

Most problems worth solving have been solved. The question a change opens is
rarely how you would write this. It is who already wrote it, and what would stop
this project from using what they wrote.

## Two searches, asking different things

### How is this solved in general?

The pattern, the standard, the maintained library, the failure reports from
people who ran it under load. This search runs against the outside world, and it
answers what the solution should look like.

### Does something already here do it?

The framework feature nobody read about, the flag on a command already
installed, the function inside a dependency that arrived for one of its other
capabilities. This search runs against the manifest, and it answers who owns
this problem in this project.

The second one catches the expensive defect, and no other step in the chain
catches it. **A custom implementation of a built-in passes every gate.** The
type checker accepts it, the linter accepts it, it has tests, and its mutation
score can be a hundred. Nothing anywhere asks whether the code needed to exist,
because every check reads the code that is in front of it.

So read the manifest and the lockfile, then read what each dependency can do
rather than what this project currently asks of it. A dependency arrives for one
feature and the rest of it stays invisible until somebody looks.

## When the search is owed

The `stages` skill holds the table. The row is `triaged` at size `epic` or
`story`, where `ket item design <key>` opens the design stage: both searches
belong there, before `ket item submit`. A design naming a library that was never
compared against an alternative has skipped this.

`subtask` and `trivial` work skips design, and it does not skip the second
search. A one-line change is exactly where a bespoke helper gets written,
because the work is too small to design and the lookup felt slower than typing.
Asking whether something here already does this costs one lookup.

Then once more, unplanned. Writing a second implementation of anything while an
item is `implementing` is the signal that the search never happened. Stop and
run it.

## Where the finding goes

The `research` skill owns the rest: which source answers first, what a citation
has to carry, and which artifact beside the item consumes it. Do not invent a
second way of doing that here.

One thing this search adds to it. **An empty result is a finding**, and it goes
in the same place as a positive one. "Nothing maintained covers this, and here
is what I looked at" is what stops the next person repeating your afternoon, and
it is the only thing that makes a bespoke implementation defensible a year later
when somebody proposes deleting it.

## Departing from the settled answer on purpose

The settled answer is a default and not a law. Departing from one is allowed.
Departing from one silently is not, because the next reader cannot tell a
decision from an oversight, and both look like the same code.

A deliberate departure is a decision, so it is a record. The `adr` skill owns
the format and the home. Three things the record carries beyond the template:

- **The settled answer, named, with its source.** A record that never states
  what everybody else does cannot be reopened by somebody who knows.
- **The constraint that disqualifies it here.** Specific, and measured wherever
  a measurement exists. "Too heavy" is a number somebody can go and check, so
  check it and write the number down.
- **What the bespoke version owes from now on.** Which of the settled answer's
  edge cases it does not handle, and what happens the day one of them arrives.

The reason that comes up most is ruled out already. The `research` skill says
what "it was quicker to write" is worth as a finding.

## What it costs when nobody looks

Three shapes, and every one of them works on the day it lands:

- **The glob matcher.** It handles the patterns in its own tests. Later somebody
  writes a brace expansion, or a negation, or one star where the author only
  implemented two, and the pattern quietly selects nothing. A check that matches
  nothing passes, and the `suppression` skill covers what that costs.
- **The retry loop.** Three attempts, a fixed delay, no jitter and no budget.
  Every caller retries in step, so a dependency that got slow now takes a
  synchronized burst, and the outage runs longer than the one the loop was
  written to survive.
- **The config loader.** It reads a file and merges defaults. It knows nothing
  about an environment layer, a schema, or the precedence order every reader
  already expects, so each consumer learns a local dialect of something they
  already knew.

Each of them passes review, because a reviewer reads the diff and the
alternative is not in the diff. The cost lands later and it never stops: a
reader learning a private version of a public idea, and an edge case that
arrives once a year with nobody left who knows why the code has this shape.

That is why the question has one place it can be asked. Before the diff exists.
