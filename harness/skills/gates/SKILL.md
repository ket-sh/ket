---
name: gates
description: Use when a gate fails, or before running the chain. What each one checks and what a failure is telling you.
---

# The gate chain

Ten commands, and every one of them is a claim about the code. A failure is
information, not an obstacle.

| Run                       | Checks                                  | A failure means                                                             |
| ------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `bun run lint`            | style, correctness, import order        | usually mechanical; read the rule name                                      |
| `bun run check-types`     | the type surface at full strictness     | a type was widened somewhere, often by an `any` arriving from a boundary    |
| `bun run lint:boundaries` | what a module may import                | a layer was crossed; the fix is where the code lives, not the config        |
| `bun run lint:dead`       | code and dependencies nothing reaches   | either delete it, or the thing that should use it is missing                |
| `bun run lint:dup`        | the same knowledge written twice        | check whether it is one rule before merging                                 |
| `bun run lint:spell`      | words the project has not agreed on     | a real typo, or a term that belongs in `cspell-words.txt` in this same diff |
| `bun run lint:prose`      | the prose in every markdown file        | the house style, including no em dash anywhere                              |
| `bun run fmt:check`       | formatting, so a diff shows only intent | run `bun run fmt`                                                           |
| `bun run test`            | the behavior the suite claims           | read the assertion before the implementation                                |
| `bun run test:mutation`   | whether the suite asserts anything      | a survivor is a defect in the test; see the `mutation` skill                |

## What the hooks add

The commit hook arms seven of these on the files you staged, so most failures
arrive while you are still writing rather than at review.

Two more run per edit and are ket's own, and they are the ones no other tool has:

- A **trivial** item writing to an adapter path is refused. A trivial change that
  needs an integration test was never trivial, so the classification was wrong
  and triage runs again.
- A **refactor** touching a `.feature` file is refused. A changed scenario makes
  the work a feature. This is the machine-checkable definition of a refactor.

When either fires, the answer is to re-triage, never to work around it.

## Never lower a threshold

A threshold that moves to accommodate the code is not a gate. If a number has to
change, that is a decision with a reason recorded, not a step in getting a build
green.
