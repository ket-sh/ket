---
description: Close an item once its pull request has merged
argument-hint: the item key
order: 6
---

Ship **$ARGUMENTS**, which means recording that its pull request merged.

## 1. Bring the surface

```
ket item show $ARGUMENTS
```

Run it in the background. It starts or reuses the item's loopback server and
keeps serving until the item moves, so a foreground run never returns and the
turn stalls behind it.

Read the address from `.ket/items/$ARGUMENTS/.surface.json`, the file the server
writes beside the item with its port and its pid, and say the address in the
chat. The page opens on the change brief with the surviving findings under it, so
the user sees what landed rather than a key and a status. Add `--headless` when
no browser can open.

## 2. Say what is closing

Read the item and tell the user: the title, the kind, the size, and the pull
request it went out on. Lead with what shipping records, then the detail. This is
the last of the four human gates, so it is worth more than a silent transition.

## 3. Ask whether it merged

Ask with AskUserQuestion: it merged, or it has not merged yet. A machine can read
a green pipeline, and only the person watching the repository knows the work
landed. If they say it has not, stop and leave the item where it stands.

## 4. Move it

```
ket item ship $ARGUMENTS
```

This closes the surface as well. The gate is over, so the server it started dies
with it.

If it refuses, say why in the user's words. An item still verifying owes the
mutation gate first, and an item still implementing has not reached
`ket item verify` yet.

After it succeeds the item is `shipped` and governs nothing. The next
`/ket:continue` picks up whatever is in flight behind it.
