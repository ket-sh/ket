---
description: Pick up the item in flight and carry it to the next human gate
---

Find the item in flight and carry it as far as it goes.

## 1. Find it

Read every `.ket/items/*/item.yaml` and take the ones whose status is neither
`idea` nor `shipped`. If none is in flight, say so and stop rather than
inventing work.

An epic that lists a child in flight is not the job. The child is. Work the
child and leave the epic where it stands.

If two items are in flight and neither is the parent of the other, stop and say
so. One job means one branch, and the write gate refuses both until one of them
lands.

## 2. Carry it

Read the `ket:stages` skill. Find the row for the status and size of the item
you found, run what that row names, and then find the next row. Keep going.

Do not stop between rows to report progress or ask permission. The pipeline is
built to run on its own, and the two human gates are the only places it waits.

## 3. Stop at a gate

The two human gates are the triage confirmation and `/ket:approve`. Stop at
either one, and only there.

When you stop, say which item is in flight, what status it holds, and what you
need from the user. If the item is waiting on approval, tell them the exact
command:

```
/ket:approve <key>
```

The stages after `implementing` are not built yet. Mutation and review run as
their own gates in a later slice, so continuing an implementing item means
carrying its failing test to green and then saying what remains.

The `progress` skill holds the shape of that report: every task, every time,
rather than only the one that moved.
