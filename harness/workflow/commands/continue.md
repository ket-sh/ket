---
description: Pick up the item in flight and carry it onward
order: 4
---

Find the item in flight and carry it as far as it goes.

## 1. Find it

Read every `.ket/items/*/item.yaml` and take the ones whose status is neither
`idea` nor `shipped`. If none is in flight, say so and stop rather than
inventing work.

The job is the item whose status has moved past `triaged`. Items still
`triaged` are the backlog: they wait their turn and crowd nobody. When nothing
has moved past `triaged`, the filed item with the lowest key is the one to pick
up.

An epic that lists a child in flight is not the job. The child is. Work the
child and leave the epic where it stands.

If two items have moved past `triaged` and neither is the parent of the other,
stop and say so. One job means one branch, and the write gate refuses both
until one of them lands.

## 2. Carry it

Read the `ket:stages` skill. Find the row for the status and size of the item
you found, run what that row names, and then find the next row. Keep going.

Do not stop between rows to report progress or ask permission. The pipeline is
built to run on its own, and the three human gates are the only places it waits.

## 3. Stop at a gate

The four human gates are the triage confirmation, the decomposition
confirmation, `/ket:approve` and `/ket:ship`. Stop at one of those, and only
there.

When you stop, say which item is in flight, what status it holds, and what you
need from the user. If the item is waiting on approval, tell them the exact
command:

```
/ket:approve <key>
```

An item at `awaiting-merge` is waiting on a person to merge it, so tell them:

```
/ket:ship <key>
```

## 4. What each of the later statuses owes

`implementing` carries the failing test to green, then runs
`ket item verify <key>`. That command runs ring two, so a refusal names the
project check that failed. Fix it and run the command again.

`verifying` runs `/ket:review` and answers whatever it found, then runs
`ket item deliver <key>` for the mutation gate. A survivor is a defect in the
test, so read the `mutation` skill and kill it rather than moving on.

`awaiting-merge` opens the pull request if it is not open, then stops. Only a
person closes it.

The `progress` skill holds the shape of that report: every task, every time,
rather than only the one that moved.
