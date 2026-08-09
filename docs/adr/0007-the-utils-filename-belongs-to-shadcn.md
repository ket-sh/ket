# The utils filename belongs to shadcn in the web scaffold

Status: accepted
Date: 2026-08-09

> **TL;DR** The web preset houses its class-merge helper at
> `src/shared/lib/utils.ts`, the one path shadcn apply overwrites, accepting a
> filename the naming rule forbids. Maintainer-approved exception.

## Context

`shadcn apply` resolves the `utils` alias in `components.json`, takes the
parent directory, and writes its `utils.ts` helper there. No alias value
avoids that filename. The web preset aliased the helper as `@/shared/cn`, so
apply added `src/shared/utils.ts` beside it: a duplicate helper at a segment
name steiger refuses. The scaffold's first commit died on the boundaries
gate. The clean-code rule forbids generic names like `utils`, so housing the
helper under that name needs the authorization this record carries. The
maintainer approved it in session on 2026-08-09.

## Decision drivers

- The scaffold's first commit passes the gates it writes
- One helper carries the class-merge rule, before and after apply
- No machinery of ket's own around the vendor's CLI
- Names reveal intent, the rule the filename bends

## Decision

Option: house the helper where apply lands it
Verdicts: ++ | ++ | ++ | -

`components.json` aliases `utils` to `@/shared/lib/utils`, and the preset
ships the helper at `src/shared/lib/utils.ts` with its behavior tests beside
it. Apply overwrites the file the preset already ships, so the scaffold ends
with one helper either way, and the tests catch an overwrite that changes
what it does. `lib` is a segment name Feature-Sliced Design blesses, so the
boundaries gate stays green. The filename stays generic, which is the single
minus: the segment and the alias carry the meaning the name gives up. The
`designSystemInvariantsOf` check in `@ket/preset` holds every shadcn preset
to shipping a file at the landing, so the collision can't return unnamed.

## Alternatives

### Keep cn.ts and delete the stray helper after apply

Verdicts: ++ | + | -- | ++

Create-time cleanup that knows where shadcn writes and removes the duplicate
it leaves.

Cost: ket code coupled to the vendor's internals, breaking without a signal
on the next shadcn release.

### Point the lib alias elsewhere and let the orphan land

Verdicts: -- | -- | + | ++

An explicit `lib` alias moves the landing, and the duplicate still arrives,
now as a file nothing imports. The dead-export gate names it, and silencing
that gate is off the table.

Cost: a second helper nobody imports, behind a gate ignore this repository
refuses to write.

## Consequences

**Good**: `bun create` with a preset code commits cleanly. The helper exists
once, tested, at the path every shadcn document assumes. The invariant
guards every future shadcn preset.

**Bad**: one file in every web scaffold wears a name the naming rule
forbids, and readers meet the `cn` helper through a file called `utils`.
