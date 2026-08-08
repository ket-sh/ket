---
description: Show what is in flight and what each item is waiting on
order: 7
---

Read every `.ket/items/*/item.yaml` and report what is in flight.

An item is in flight when its status is one of `triaged`, `designing`,
`awaiting-approval`, `implementing`, `verifying` or `awaiting-merge`. An `idea`
is waiting to be picked up and a `shipped` item is done.

Group by status, newest key last, and name what each one is waiting on. If more
than one item is in flight, say so plainly: the write gate refuses every source
write while that is true, because one job means one branch.

Read the items. Nothing generates a board file: `ket watch` draws one live from
the same items, so this command and that screen never disagree.
