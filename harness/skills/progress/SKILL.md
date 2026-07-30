---
name: progress
description: Use after each step of a multi-step run, and whenever reporting what remains. The whole list every time, not only the part that moved.
---

# Reporting what remains

After every step of a multi-step run, report the whole plan. Not the step that
just finished, the whole plan.

A report naming only what moved leaves the reader counting what did not, and
the thing a reader wants from a progress report is the count.

## The shape

One line per task, every task, in the order the plan put them. Each line
carries one of three states.

| State         | Means                                           |
| ------------- | ----------------------------------------------- |
| `done`        | finished, and a gate or a command proved it     |
| `in progress` | started, not finished                           |
| `waiting`     | not started, and the line says what it waits on |

`done` is a claim about a command you ran, not about code you wrote. Until
something has run over the work and passed, the state is `in progress`. Writing
`done` on unverified work is the one failure this report exists to prevent.

Close with the next step. Nothing after that: a summary of the summary tells
the reader less than the list already did.

## When the run is an item

An item moves through stages, and the stages it still owes are the plan. Name
every one of them, not the one in front of you, so the reader sees how far the
item is from `shipped` rather than how far the last turn got.

When the write gate refuses something, that refusal belongs in the report as
the thing a task waits on. It is the most useful line in the list, because it
names the classification that has to change before anything else moves.
