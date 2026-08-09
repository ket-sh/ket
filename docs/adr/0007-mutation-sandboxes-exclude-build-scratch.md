# Mutation sandboxes exclude build scratch and always clean up

Status: accepted
Date: 2026-08-10

> **TL;DR** The cli mutation config stops copying build scratch into the
> sandbox, every mutation config cleans its temp dir after failed runs too,
> and the cli build sweeps the scratch file Bun leaks. Thresholds, mutate
> lists, and test scope don't move. Maintainer-authorized gate change.

## Context

`bun build --compile` writes a hidden scratch copy of the Bun runtime,
about 63 MB, into the working directory on every build. On Bun 1.3.14 the
scratch file survives successful builds as well as killed ones, which
upstream tracks as the open issue `oven-sh/bun#14020`. The acceptance scripts and
`turbo build` compile `packages/cli` on every run, so 160 orphaned scratch
files, 9.4 GB, had gathered there unseen.

Stryker never reads `.gitignore`. Its sandbox copy takes everything the
always-ignored list doesn't name, so every mutation run carried that pile
into `.stryker-tmp`. A failed or interrupted run never cleaned its sandbox,
and fourteen of them stacked up to 88 GB. No flag or environment variable
moves the scratch file: Bun tries the working directory first and consults
`TMPDIR` only when that open fails. The maintainer authorized this change
in session on 2026-08-09.

## Decision drivers

- A mutation run's disk cost stays bounded by the sources it mutates
- The gate itself never moves: thresholds, mutate lists, test scope
- Interrupted runs stay cheap, because interruption is routine here
- No tool leaves oversized or mutated state in the working tree

## Decision

Option: exclude scratch from the sandbox, sweep the leak at its source,
always clean the temp dir
Verdicts: ++ | ++ | ++ | +

The cli config gains `ignorePatterns`: `**/*.bun-build`, `/dist`,
`/.turbo`, and `/reports`. The directory patterns anchor to the package
root, so a future source directory that happens to share a name still
reaches the sandbox. All five configs gain `cleanTempDir: "always"`, which
also removes the sandbox when the run fails. The cli build script runs
through `sh -c` and sweeps `.*.bun-build` on both exit paths while
preserving the build's exit status. The wrapper exists because Bun's own
shell fails the whole script on an unmatched glob, and a platform without
the leak has nothing to match. A later successful build also sweeps
whatever an interrupted one left behind.

Measured on the bounded verification run, the sandbox copy fell from
9.5 GB to 3.2 MB. A hard-killed run leaves one 3.2 MB sandbox with no
scratch files inside. The fourth driver reads a single plus because a
`SIGKILL` still leaves that one sandbox: cleanup runs in process, so no
setting can cover it.

## Alternatives

### Mutate in place

Verdicts: ++ | ++ | -- | --

`inPlace: true` skips the sandbox copy entirely. It also voids
`ignorePatterns` by documented design, restores originals only on four
catchable signals, and lets concurrent package runs under `turbo` mutate
workspace sources that sibling runs import through `node_modules` links.

Cost: a hard kill leaves mutated source in the working tree, on a
repository whose history shows fourteen interrupted runs.

### Upgrade Bun past the leak

Verdicts: 0 | ++ | 0 | ++

Bun 1.3.14 is the newest release, the upstream fix closed unmerged as
stale, and the rewrite that replaces the cleanup path hasn't shipped in a
tagged release.

Cost: waiting on upstream with no bound while the pile regrows.

### Exclude compiling tests from the mutation run

Verdicts: 0 | ++ | 0 | 0

The diagnosis this work started from. The full cli suite runs zero
compiles: the scratch files entered sandboxes by copy, not by execution,
so there was nothing to exclude.

Cost: none to reject, and rejecting it kept the vitest configs untouched.

## Consequences

**Good**: sandboxes stay a few megabytes regardless of what builds leaked
before the run. Failed runs clean up after themselves. The sweep converges:
each successful build removes every scratch file present, including older
orphans.

**Bad**: `cleanTempDir: "always"` removes the sandbox a broken dry run
would otherwise leave for diagnosis, so debugging one takes a rerun with
`--cleanTempDir false` on the command line. A `SIGKILL` still leaves one
small sandbox behind.

**Recorded follow-up**: the scaffold presets ship this same defect. A
scaffolded project's build compiles a binary, and the stryker config the
presets write carries neither the scratch pattern nor `cleanTempDir`.
`packages/preset` already machine-checks preset-written mutation configs
through `sandboxInvariants`, so the fix there extends that invariant
rather than hand-editing templates. That lands as its own job. Until it
does, ket's own configs stay hand-kept, and this record is the reason why.
