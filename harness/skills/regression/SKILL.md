---
name: regression
description: Use the moment a defect is found, in review, in a run or in production. The order the fix goes in, the ranking of what stops it recurring, and what a mistake report says instead of an apology.
---

# A defect becomes a check

A defect that gets fixed is one defect. A defect that becomes a check is a whole
class of defect, closed.

## Reproduce, then the missing test, then the fix

The `tdd` skill owns red, green and refactor. A defect changes what the red step
means rather than whether it happens. The `findings` skill owns what a review
finding has to prove before anybody acts on it, so this skill starts one step
later, from a defect somebody already confirmed.

**A defect found in review or in a run is a test that was missing.** The code
already proved itself wrong, so the failing test is not a design step, it is
evidence that you found the same wrongness the reporter did. That makes the test
the deliverable and the fix the smaller half, and it holds even when the fix is
one character and you can already see it. The obvious fix is the one that ships
untested, because its author was sure.

1. **Reproduce it.** Watch it fail, from the reported input, before touching
   anything. A fix for a defect nobody reproduced is a guess with a commit
   message attached. Reproduce it at the layer it lives on, too: **a fixture
   written by hand agrees with the implementation rather than with reality**,
   which is how a gate reads a relative path for months while the platform sends
   an absolute one and every rule in it silently matches nothing. When a
   boundary is the suspect, drive the real producer: the hook, the command, the
   file.
2. **Write the failing test**, and read the message it prints. That message is
   what somebody gets the next time.
3. **Fix it**, and watch that same test go green.

## Rank what you reach for

Most durable first. The top of the list needs nobody to remember anything.

| Reach for                                       | Why it holds                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| A type that makes the bad state unrepresentable | The defect stops compiling. Nothing has to run and nobody has to remember |
| A lint rule                                     | Fires at the edit, on code nobody has written yet                         |
| A test                                          | Runs on every change, and names the behavior in its failure               |
| A gate in the chain                             | Covers the class across the repository rather than one call site          |
| A line in a document                            | Nothing runs it                                                           |

The bottom row is the point of the table. Prose is enforced by whoever remembers
to read it, and a rule enforced by memory is not enforced. Prose is where a rule
goes when nothing above it can hold that rule, and from then on it is a bet on
attention.

The rows are not exclusive. Removing the bad state from the type and keeping the
test that proves the behavior is one answer, not two.

Reach as high as the defect allows. A total map over a lifecycle, with no
default arm, turns "somebody forgot the new status" from a runtime surprise into
a build failure, and that beats any test of the same rule.

## When nothing checks this class, propose the checker

Say what would catch it, in the report, as something concrete somebody can
build. Four shapes cover most of it:

- **A custom oxlint rule**, when the defect is a call, an import or a literal
  that is right in one module and wrong everywhere else. Its exemption list is
  the module that owns the thing plus the test whose subject is that seam, and
  nothing beyond those two.
- **A dependency-cruiser rule**, when the defect was a module reaching across a
  boundary. The gate chain already runs the tool, so this costs one rule and no
  new dependency.
- **A check that reads the authority and compares against it.** Look for this
  one first, because it is the strongest. When the defect was a list disagreeing
  with something else, a config naming a plugin nothing ships, a pipeline
  missing a gate the preset declares, a pinned tool nothing calls, the fix is
  not to correct the list. Stop maintaining it: read whatever declares the truth
  and fail on the difference. The `clean-code` skill says why, and the
  `generated` skill gives the regenerate-and-diff shape of it.
- **A source scan**, when the fact is textual and no import edge reaches it: a
  machine-specific path committed in a file, a skipped test, a key read directly
  where an accessor exists.

Proposing a checker for a **new dependency** is a different job, and the
`mechanical-checks` skill owns it. This skill is for the defect that already
happened, and the difference is the evidence: a failing case is in your hands,
so the checker can be proved rather than argued for.

## What a mistake report says

This is the report you write about a defect of your own, and the `findings`
skill owns the other one, where a reviewer raises a defect in somebody else's
work. Four parts, and nothing else:

1. **What broke**, as observable behavior. Say that every source write was
   allowed, rather than that the path comparison was wrong.
2. **The reproduction.** The command, the input, and what it printed, so
   somebody else can run the same line.
3. **Why the gates let it through.** The part that gets skipped, and the useful
   one. The suite was green, so name what it was checking instead.
4. **What catches it next time**, at the highest rank the defect allows, plus
   what you rejected from higher up the table and why.

Never an apology, and never a promise to be more careful. Neither one runs. A
promise inside a report is a rule with no gate behind it, which ranks it below
the weakest row of the table above.

## The check owes proof that it can fail

A check that cannot fail is worse than no check, because it reports a safety
nobody has and it stops anybody asking again. The `suppression` skill covers the
shape this takes.

A defect-born check owes the stronger version of that proof, and it costs
nothing, because the failing case is already in your hands. Put the defect back
exactly as it was, run the check, read what it says, then take the defect out
again. A check that goes red carrying a message nobody can act on has moved the
defect rather than caught it.

## The check lands with the fix

Same commit, or its sibling in the same batch. A check promised for later never
lands, and the fix then reads as somebody changing their mind rather than as a
defect closed.
