# The whole mutation run moves to a weekly schedule

Status: accepted
Date: 2026-08-06

> **TL;DR** Every push runs mutation incrementally; the whole suite reruns on
> a weekly schedule instead of every main merge. Supersedes ADR 0005.
> Maintainer-authorized gate change.

## Context

ADR 0005 split mutation into a per-package matrix, incremental on pull
requests and whole on every main merge. The whole run then met the hardware.
This repository is private, so GitHub's free runners give it two cores.
Stryker reads that as one checker plus one test runner.
The cli package's whole run costs 43 minutes single-threaded, per merge, on
metered private-repo minutes. The maintainer ruled paid runners out and
authorized this revision in session on 2026-08-06.

## Decision drivers

- No money: free runners, bounded metered minutes
- A main merge answers in minutes
- Every mutant still meets the full suite on a bounded clock
- The threshold and the scope never move

## Decision

Option: Incremental everywhere, whole weekly
Verdicts: ++ | ++ | + | ++

Pull requests and main merges both run Stryker `--incremental` against the
cached baseline, so a merge retests only what it changed. A scheduled weekly
workflow, open to a hand start through `workflow_dispatch`, runs
`--incremental --force`: the whole suite, rewriting the baseline every run
restores. The trust window for an unchanged mutant grows from one merge to
at most one week, which is why the third driver reads a plus and not a
double. The break-at-100 threshold still judges the full mutant set on
every run. The same shape ships to both scaffold presets: incremental in
their CI workflow, a weekly whole run beside it.

## Alternatives

### Whole on every main merge

Verdicts: -- | -- | ++ | ++

ADR 0005's shape. Correct and current, and 43 single-threaded minutes of
metered time per merge on the free two-core runner.

Cost: the merge cadence pays the hardware bill in wall clock and minutes.

### A self-hosted runner for the whole run

Verdicts: ++ | ++ | ++ | ++

The maintainer's machine as a runner: fourteen cores, no metered minutes,
the whole run in about seven minutes. All plusses on the drivers, and the
maintainer passed on it: it ties a repository gate to a personal machine
being awake.

Cost: the gate inherits one laptop's uptime.

### Sharding the slowest package

Verdicts: + | + | ++ | ++

Directory shards in parallel free jobs. ADR 0005 already priced it: config
married to the directory tree, a dry run per shard, and more metered minutes
in total, not fewer.

Cost: hand-kept shard lists that grow stale with the tree.

## Consequences

**Good**: a main merge pays for what it changed, usually minutes. The weekly
whole run bounds baseline drift to seven days and rewrites the baseline from
scratch, and `workflow_dispatch` lets anyone force it early, for free.

**Bad**: between weekly runs, an unchanged mutant carries its kill from the
baseline. A defect in Stryker's incremental diffing would therefore hide
for at most a week. The schedule also stops firing when the repository goes
quiet for sixty days. That's a GitHub behavior worth knowing rather than a
hole in the gate, because a dormant repository merges nothing.
