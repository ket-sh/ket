# Mutation runs incrementally on pull requests and whole on main

Status: superseded by 0006
Date: 2026-08-06

> **TL;DR** Splits the mutation job into a per-package matrix, retests only
> the changed mutants on pull requests, and refreshes the full baseline on
> every main merge. Maintainer-authorized gate change.

## Context

One CI job ran every package's whole mutation suite in sequence. A pull
request touching two test files paid 61 minutes for work a developer machine
finishes in six and a half. The threshold and the scope aren't moving. The
question is when each mutant has to prove itself again. The
maintainer authorized this change in session on 2026-08-06.

## Decision drivers

- A pull request answers in minutes
- Every mutant still meets the full suite somewhere
- No threshold or scope moves
- One slow package stops hiding the rest

## Decision

Option: Incremental pull requests, whole main, one job per package
Verdicts: ++ | ++ | ++ | ++

Five matrix jobs run in parallel, one per package that carries a mutation
suite, behind an aggregate job that keeps the required check's name. Pull
requests run Stryker with `--incremental` against a cached baseline, and retest only
the mutants whose code or tests changed. Every merge to main runs
`--incremental --force`: the whole suite, rewriting the baseline the next
runs restore. Turbo's task cache rides the same restore, so an untouched
package replays instead of re-running its dry run.

A pull request trusts the baseline main last wrote. A wrong baseline heals at
the next main merge, and the break-at-100 threshold judges the full mutant
set either way.

## Alternatives

### One whole run per pull request

Verdicts: -- | ++ | ++ | --

The status quo. Every mutant proves itself on every push, and every push
costs an hour on a two-core runner.

Cost: an hour of wall clock per push, growing with the codebase.

### Larger runners

Verdicts: + | ++ | ++ | -

Money for cores. The run stays whole and serial per package, so the ceiling
moves without the shape changing.

Cost: a monthly bill that scales with exactly the thing the suite grows by.

### Sharding the cli package by directory

Verdicts: + | + | ++ | +

Finer parallelism inside the slowest package. Each shard pays its own dry
run, the shard list becomes hand-kept config, and the package totals need
stitching before the threshold reads them.

Cost: config that has to agree with the directory tree forever.

## Consequences

**Good**: a pull request pays for what it changed, packages fail
independently and in parallel, and the required check keeps its name so
branch protection stands untouched.

**Bad**: between two main merges, a pull request leans on the cached
baseline instead of re-proving unchanged mutants. The window closes at the
next merge, and a cold cache falls back to a whole run by itself.
