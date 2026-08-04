---
name: generated
description: Use when a file was written by a generator, or when adding one. Who owns it, why hand-editing it is a defect, and how a drift check turns the question into a gate.
---

# A generated file belongs to its generator

Editing generated output is writing into a buffer somebody else is about to
overwrite. The edit works, the tests pass, and the next run of the generator
reverts it silently. The bug that follows has no diff to point at.

**Edit the source, run the generator, commit both.** Every time, with no
exception worth the debugging session.

## Say so in the name

A generated file announces itself: `*.generated.ts`, or a directory the project
agrees is output. A reader who has to open the file to learn who owns it will
sometimes not open it.

Then keep the two apart. A file that is partly authored and partly generated has
no owner, so the generator cannot overwrite it and a person cannot trust it.
Split it: a generated file plus an authored one that imports it.

## Drift is the gate, not the reminder

Nothing enforced by memory stays enforced. The check is mechanical and it fits
on one line:

```
<the generate command> && git diff --exit-code <the output paths>
```

Regenerate, then require the tree to be unchanged. A stale artifact fails at the
commit rather than months later, on the machine of whoever next runs the
generator for an unrelated reason.

Two properties are worth getting right:

- **Drift fails.** Committed output disagreeing with what the source produces is
  an error, not a warning. It means one of the two is a lie.
- **A source with no output yet is a different signal.** Content nobody has
  generated is incomplete work, and it warns. Content that disagrees is wrong,
  and it fails.

## Do not commit what a run produces

Reports, caches and incremental state are output too, and they are not the
artifact. A mutation report, a coverage directory and a runner's temporary
directory belong in the ignore file. They change on every run, so committing
them buries the diff that matters under noise nobody reads.

## Name the output the generator refuses to invent

When a generator names a file for you, name it yourself. A tool that falls back
to a random or sequential name writes something you cannot rename afterwards
without hand-editing its bookkeeping, which is the thing this skill exists to
forbid. Pass the name at generation time, and regenerate rather than repair when
you forget.

## When you think you need to edit it

You have picked the wrong lever. The change belongs in one of three places: the
source the generator reads, the generator's own configuration, or the generator.
When none of those can express what you want, that is a finding to report, not a
file to edit.
