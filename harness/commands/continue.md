---
description: Pick up the item in flight and carry it to the next stage
---

Find the single item in flight and continue it.

Read its status and do the next thing the pipeline asks for. If nothing is in
flight, say so and stop rather than inventing work.

The stages after `implementing` are not built yet: mutation and review run as
their own gates in a later slice. For now, continuing an implementing item means
carrying its failing test to green, then telling the user what remains.

The `progress` skill holds the shape of that report: every task, every time,
rather than only the one that moved.
