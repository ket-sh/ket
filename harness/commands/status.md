---
description: Show what is in flight and what each item is waiting on
order: 6
---

Read every `.ket/items/*/item.yaml` and report what is in flight.

An item is in flight when its status is one of `triaged`, `designing`,
`awaiting-approval`, `implementing` or `verifying`. An `idea` is waiting to be
picked up and a `shipped` item is done.

Group by status, newest key last, and name what each one is waiting on. If more
than one item is in flight, say so plainly: the write gate refuses every source
write while that is true, because one job means one branch.

The generated board at `.ket/BOARD.md` is not written yet. Read the items.
