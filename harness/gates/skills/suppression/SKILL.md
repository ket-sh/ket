---
name: suppression
description: Use when reaching for a disable directive, a skip, a bypass, a widened ignore list or a moved threshold. Every one of them turns a gate off, and this is what to do instead.
---

# Turning a gate off

A red gate is a claim about the code that came out false. Suppressing it does
not make the claim true, it stops anybody asking. The suppression outlives the
afternoon that produced it, and from then on the gate reports a safety nobody
has.

## The shapes this takes

Each of these is the same move wearing a different tool's clothes:

| The move                                                   | What stops being checked                |
| ---------------------------------------------------------- | --------------------------------------- |
| `oxlint-disable`, `eslint-disable`                         | the rule, on that line, forever         |
| `@ts-expect-error`, `@ts-ignore`, `as any`, a widened type | the type surface at that boundary       |
| `test.skip`, `describe.skip`, `test.todo`                  | the behavior the test claimed           |
| `test.only`, `describe.only`                               | **every other test in the file**        |
| `--no-verify`, `LEFTHOOK=0`                                | the whole pre-commit chain              |
| a new `stryker.conf.json` exclusion                        | the mutation gate over that code        |
| a lowered `thresholds.break`                               | the mutation gate over everything       |
| a typo added to `cspell-words.txt`                         | the spelling of that word, project wide |
| a Vale rule set to `NO`, a `<!-- vale off -->`             | the house prose style                   |
| a gitleaks allowlist entry                                 | a secret shaped like that one, forever  |
| a `knip`, `jscpd` or dependency-cruiser ignore             | the boundary the entry now spans        |

`test.only` deserves the bold. It does not turn off one check, it turns off the
file, and the run still prints green. A mutation run over a file with an `only`
in it measures almost nothing and reports a score.

## What to do instead

**Stop and find the root cause.** A rule fired because a rule was written to
fire on this. Read the rule's name, then fix what it named. When the first
attempt does not produce a clean fix, that is the signal to rethink the
approach, not the signal to reach for the directive.

**When you cannot fix it the right way, say so and stop.** Pausing to ask is a
legitimate outcome. Shipping a suppression you were not sure about is not.

## The one case a directive is correct

A suppression is right when the suppression **is** the engineering answer: a
documented limitation of the language or the tool, where no fix exists to write.
That is rare, and it comes with three obligations.

1. It is scoped to the narrowest thing that works: one line, not one file, and
   never the project config.
2. The reason travels with it. ket forbids comments, so the reason goes where
   reasons live: `adr.md` beside the item, naming the tool, the version, and the
   limitation. "The linter is wrong here" is not a reason. "The rule cannot see
   through a dynamic import, and here is the upstream issue" is.
3. It is a review-blocking claim. Somebody other than its author agrees the fix
   does not exist.

## A skipped test is technical debt whatever the comment says

"Keeping the skip so the scenario is written down somewhere" is not a reason.
The scenario belongs in a test that runs. Three ways out, in order of
preference:

1. **Move it to a check that can run.** A scenario no test can reach at its own
   layer often becomes a source scan: read the files and assert the structural
   fact directly. A rule you cannot exercise you can still read.
2. **Drive it through the real thing.** Spawn the command, the binary or the
   script and assert on its documented output. Slower than a unit test and still
   a test.
3. **Delete it**, with a commit message saying why the scenario cannot be proved
   here and where the equivalent guarantee lives.

## A threshold that moves is not a threshold

A number changed to let the build pass has stopped measuring anything. When a
threshold genuinely has to change, that is a decision with a recorded reason and
a fresh measured baseline, never a step in getting to green. Read the `mutation`
skill before touching a mutation number.

## The accidental suppression

The worst suppression is the one nobody wrote. **A check that matches nothing
passes.** A glob with a typo, a mutation `mutate` pattern excluding more than it
meant to, a lint override scoped to a path that was renamed: every one of them
reports success while checking zero files, and it keeps doing so for months.

So a check owes proof that it can fail. When you add one, break the code it
guards and watch it go red before you trust the green. When a check is
pattern-based, assert that the pattern selects something, because a rule
matching nothing is the same as a rule that is not there.

## The bypass is for a broken hook, not a busy afternoon

`--no-verify` and `LEFTHOOK=0` exist so a misconfigured hook cannot lock the
repository. Use them to repair the hook, in the commit that repairs it, and
nowhere else. The pipeline runs the same gates and does not read the flag, so a
bypassed commit only delays the failure to a place with a worse feedback loop.
