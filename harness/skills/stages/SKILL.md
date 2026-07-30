---
name: stages
description: Use after an item is filed or moved, and whenever deciding what to run next on it. The stage table, the commands that move an item between statuses, and the only two places the pipeline waits for a person.
---

# The stages an item moves through

An item carries one status, written in `.ket/items/<key>/item.yaml`. Only a
command moves it. Editing that file by hand is refused by the write gate,
because a status anything can write is a status that means nothing.

## The two human gates

The whole pipeline stops for a person exactly twice:

1. **The triage confirmation.** Before anything is filed, the user confirms the
   kind and the size.
2. **`/ket:approve <key>`.** Before any source is written, the user approves.

Stop at those two and wait. Between them, keep going without asking. An agent
that files an item and then reports back has left the job half done.

## The table

| Status              | Size                   | What runs here                                   | What ends it                           |
| ------------------- | ---------------------- | ------------------------------------------------ | -------------------------------------- |
| not filed yet       | any                    | `ket:triage` proposes, the user confirms         | `ket item file`, filing it triaged     |
| `triaged`           | `epic` or `story`      | nothing yet                                      | `ket item design <key>`                |
| `triaged`           | `subtask` or `trivial` | nothing, because design is not owed at this size | `/ket:approve <key>`, a human gate     |
| `designing`         | `epic`                 | decomposition, one child at a time               | the first child, worked from `triaged` |
| `designing`         | `story`                | the design artifacts                             | `ket item submit <key>`                |
| `awaiting-approval` | any                    | nothing                                          | `/ket:approve <key>`, a human gate     |
| `implementing`      | any                    | the failing test, then the code that answers it  | not built yet                          |

## Decomposing an epic

An epic is a container, not a job. Break it down inside its design stage, one
command per child:

```
ket item file --parent <epic key> --title '<title>' --kind <kind> --size <size>
```

Each child has to be smaller than the epic, and only an epic or a story takes
children at all. The command records the link on both ends and prints the key it
allocated.

Then work the first child from the top of the table: it is `triaged`, so it
takes `ket item design` next. The epic keeps its own status and stops governing
writes while a child of it is in flight, so the child is the job and one job
still means one branch. Do not run the children in parallel. Two of them in
flight at once is two jobs, and the write gate refuses both.

## Why design is mandatory above subtask

`ket item approve` refuses a `triaged` story or epic. Work at that size either
spans more than one slice or cannot be specified without being broken down, and
neither is a call to make while writing the first test.

Work at `subtask` and `trivial` skips design entirely. Running a one-line change
through a design stage buys nothing a unit test does not already say, and a gate
that everything must pass is a queue, not a gate.

Design stays available at every size. Only the gate is conditional: run
`ket item design` on a small item whenever the approach is genuinely unclear.

## What each design stage produces

For a story, use the agents the harness ships and write the artifacts beside the
item in `.ket/items/<key>/`:

- `ket:solution-design` for the approach
- `ket:adr` when a decision is load-bearing and worth recording
- `ket:gherkin` for the acceptance criteria
- `ket:ui-design` when a target has a surface

Prose beside an item is allowed while the item is `designing`. Source is not:
the write gate refuses every write under a target's source path until the status
reaches `implementing`.
