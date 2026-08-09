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

## 2. Start the watcher

```
ket item await $ARGUMENTS --past awaiting-merge
```

Run it as a background task beside the surface, after saying the address. It
blocks until the item leaves `awaiting-merge`, then prints the move as one json
line, so the confirmation reaches this session the moment it lands.

The watcher follows `.ket/events.jsonl`, and every path that ships the item
writes that log: the command in step 5, the TUI's offer key, any other session.
Whichever path moves the item completes this watcher, so a merge recorded
somewhere else cancels the wait by itself. One watcher hears every path, so
never start a second.

Then tell the user plainly: ship it in the browser, in the TUI (choose the
card, press its offer key), or tell me here. I'll continue the moment it lands.

When the watcher returns, the gate is passed: read the json line it printed,
skip step 5, and let the next `/ket:continue` pick up what is behind the item.

## 3. Say what is closing

Read the item and tell the user: the title, the kind, the size, and the pull
request it went out on. Lead with what shipping records, then the detail. This is
the last of the four human gates, so it is worth more than a silent transition.

## 4. Ask whether it merged

Ask with AskUserQuestion: it merged, or it has not merged yet. A machine can read
a green pipeline, and only the person watching the repository knows the work
landed. If they say it has not, stop and leave the item where it stands.

A confirmation can land while the question is open: the watcher completing is
the user answering from another surface. Take it as the confirmation, skip the
move below, and continue.

## 5. Move it

Stop the watcher task first, belt and suspenders: the move below completes it
anyway, and a watcher with nothing left to hear has no business running.

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
