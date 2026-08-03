---
name: verification
description: Use before saying anything is done, fixed, passing, applied or working. What a completion claim owes, and why a status nobody measured is worse than no status.
---

# Before you say it is done

ket exists to make a status mean something. A claim of done that nobody
measured is the failure the whole product is aimed at, arriving from inside.

**Run the command. Read the output. Then claim.** In that order, every time. No
fresh output means no claim.

## What counts as evidence

Evidence is a command you ran in this session, after the last edit, whose output
you read.

These are not evidence:

- The same command run before the last change. The change is what you are making
  a claim about.
- A subset run. `bun run test --filter one-package` proves one package.
- The absence of an error in a tool's report. A formatter that printed nothing
  formatted nothing.
- A gate you did not run because "that change could not have affected it." The
  gate exists because that reasoning fails.
- Reasoning about what the code will do. The suite exists so nobody has to.

## The claim carries its numbers

A report saying "done, tests pass" is unfalsifiable and therefore useless to the
stage after it. Say what ran and what it said: the command, the count, the
score, the exit. A reader who disagrees can then rerun the same line.

This applies hardest to a subagent handing work back. The caller cannot see your
terminal, so anything you do not quote did not happen as far as the pipeline is
concerned.

## Green is a claim too

A pass proves nothing when the check was not aimed at the change. Before
believing a green:

- Did the new test fail before the fix? An assertion that passed all along
  measured nothing. The `tdd` skill makes this the order rather than an
  afterthought.
- Did the run include the new file? A test file the runner never selected
  reports no failures because it reports nothing.
- Did the whole chain run, or the fast lane? A changed-file selector cannot see
  a check with no import edge to what it guards, and a source scan is exactly
  that. The full chain before a completion claim is not optional; see the
  `gates` skill for what each one covers.

The `suppression` skill covers the other way a green lies: a check that matches
nothing.

## Partial is a legitimate answer

"Three of the four gates pass, `lint:dead` reports an unreachable export, and
here is the line" is a good report. It is honest, it is actionable, and the next
stage can decide.

"Done" when one gate is red is not a smaller version of that report. It is a
different claim, and it is false.

## When something surprises you, say so

An unexpected pass belongs in the report as much as a failure. A test that went
green without the change, a gate that took a tenth of the time it took
yesterday, a file the run did not mention: each one is a thread somebody should
pull. Swallowing it because the summary looked good is how a suite quietly stops
measuring.
