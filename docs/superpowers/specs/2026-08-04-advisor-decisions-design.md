# The advisor learns two more arrivals

Date: 2026-08-04. Status: approved. Own branch, own pull request.

## Why

The advisor names a new dependency and sends the session down two routes:
`mechanical-checks` for the rule it brings, `find-skills` for the craft.
A dependency is one decision a project makes, not the only one. Two more
arrive as their own kind of decision and today go unadvised:

- A recorded decision. An ADR states a choice the project made, and that
  choice may want a rule that guards it and a skill that applies it, the
  same two routes a dependency travels.
- A file kind the preset never shipped. The first `.tf`, the first
  `.graphql`, the first `.prisma` is a technology entering the project
  under its own decision, and it brings its own rule and its own skill.

## The look grows two sources

`ket gate toolchain` keeps its one job, naming what arrived since it last
looked, and learns two more places to look. Each source reuses the same
shape the dependency source already has: a candidate set, minus what the
preset already covers, minus what a prior session recorded, leaves the
arrivals. Every arrival travels the two routes the reply already names.

- **Dependencies** stay unchanged: the manifest names them, the preset
  ships some, and the record holds the rest.
- **Decisions** come from the ADRs the project holds, under
  `.ket/items/*/adr.md` with the workflow and `docs/adr/*.md` without it.
  The arrival is the decision's own sentence, the first heading of the
  record. The preset ships none, so only the record covers a decision
  once named.
- **Kinds** come from the file a write touches. A write names one path,
  its extension is the kind, and a kind the preset never shipped and no
  session has recorded is the arrival. The preset's own files are the
  cover, so a `.ts` or a `.feature` the scaffold wrote never proposes
  anything.

## What each source reads, and when

- The dependency and decision sources read what the project holds, so
  they answer at a session start and after a write both.
- The kind source reads the write itself, so it answers only when a write
  names a path. A kind already in the project before the advisor first
  ran arrives the next time a write touches its extension, not before.
  The reply says so rather than implying it swept the tree.

## The record grows three sections

`.ket/toolchain.json` holds one seen list today. It grows to three, one
per source: `dependencies`, `decisions`, `kinds`. The look reads the
section its source belongs to, and writes back only that section, so
naming a dependency never marks a decision seen.

## The reply names each arrival for its own kind

The proposal stays one reply the session reads once. It names the
dependencies, the decisions and the kinds that arrived, each under its
own sentence, and sends every one down the `mechanical-checks` and
`find-skills` routes. A decision reads as a decision to research, a kind
as a technology to learn, a dependency as it does today. ket proposes,
the user decides, one proposal at a time.

## Out of scope

- Parsing an ADR past its heading. The sentence is the decision, and the
  body waits for the session that researches it.
- Classing a kind by its directory rather than its extension. An
  extension is the kind, and a `migrations/` folder is its own slice.
- A config target as a decision. One target governs the whole repository
  today, so a second is the monorepo slice, its own job.
- Sweeping the tree for kinds at a session start. A kind arrives with a
  write, and a tree sweep on every session start pays a cost no arrival
  earns.
