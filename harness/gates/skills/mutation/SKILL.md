---
name: mutation
description: Use when a mutation run leaves a survivor, or before lowering any threshold. How to kill a mutant, and why an equivalent one is a design signal rather than an exemption.
---

# The mutation gate

Stryker measures whether the suite asserts anything. A high line count with a low
mutation score is the signature of tests that execute code without checking it.

`bun run test:mutation` inside a package runs it over that package's domain. The
threshold breaks the build below 90.

## A survivor is a defect in the test

Never clear a survivor by lowering the threshold. Read what the mutant changed,
then write the test that would have noticed.

The report names the file, the line, and the exact substitution. Read it as a
question: _what input makes the original and the mutant disagree?_ If you can
answer that, you have the test. Add it and the mutant dies.

## Assertions that let mutants live

Four shapes come up again and again, and each one reports safety it does not
have:

- `toContain` where the whole value matters. A mutant that reorders or truncates
  still contains the fragment. Assert the exact value or the exact list.
- `toMatchObject` on a merge. Extra keys the mutant introduced pass unnoticed.
  Assert the exact key set.
- `length > 0` on a rendered artifact. An empty string passes. Assert what the
  content has to be.
- One element in a collection under test. `some` and `every` behave identically
  on a single item, so mutating one into the other survives. Use two.
- A snapshot the runner can rewrite. `toMatchSnapshot` asserts that the output
  equals whatever it last saw, so the fix for a failure is a keystroke and the
  changed bytes never reach a reviewer. Pin the value inline instead, and the
  mutant's output lands in the same diff as the change that caused it.

## Equivalent mutants

Some mutants cannot be killed because the mutated code behaves identically. That
is a **design signal, not an exemption**. Restructure until the distinction
matters.

Three that recur:

- **A guard on a value only read for truth.** `value !== undefined && check(value)`
  where `check(undefined)` is already false. Remove the guard, or stop letting
  undefined reach the function at all.
- **A dead fallback.** `list[0] ?? ''` where the list is never empty at that
  point. Restructure so the impossible case is not written down.
- **A flag a rule demands but no test can see.** A regular expression's unicode
  flag changes nothing for ASCII input, so every regex leaves one behind. Replace
  the regex with the string operations it was standing in for.

## The refactor ratchet

A refactor may not lower the mutation score it started from. Record the score
before, compare after. If it fell, behavior moved, and the work was never a
refactor.
