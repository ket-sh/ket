---
description: Pass the human gate so implementation may begin
argument-hint: the item key
order: 3
---

Approve **$ARGUMENTS** so work on it can start.

This is one of the four human gates. Bring the work in front of the user, say
what the decision costs, and ask. The page shows what the decision is about and
the chat holds the decision itself, so no surface carries an approve button.

## 1. Bring the surface

```
ket item show $ARGUMENTS
```

Run it in the background. It starts or reuses the item's loopback server and
keeps serving until the item moves, so a foreground run never returns and the
turn stalls behind it.

The server writes `.ket/items/$ARGUMENTS/.surface.json` beside the item, holding
the address, the port and its own pid. Read the address from there and say it in
the chat. The command opens the browser itself, and a tab the user closed leaves
the address in the chat as the only way back to the page.

The file appears once the server listens. If it is not there yet, read it again
rather than starting a second show.

Add `--headless` when no browser can open. The address in the chat is then the
whole surface.

The page lets the user fix a scenario's wording in place, and the save writes that
feature file back beside the item. Nothing else on the page writes, and no status
moves there.

## 2. Start the watcher

```
ket item await $ARGUMENTS --past awaiting-approval
```

Run it as a background task beside the surface, after saying the address. It
blocks until the item leaves the status it names, then prints the move as one
json line, so the approval reaches this session the moment it lands. Name the
status the item actually holds: an item that skipped design waits at `triaged`.

The watcher follows `.ket/events.jsonl`, and every approval path writes that
log: the command in step 6, the TUI's offer key, any other session. Whichever
path moves the item completes this watcher, so an approval given somewhere else
cancels the wait by itself. One watcher hears every path, so never start a
second.

Then tell the user plainly: approve in the browser, in the TUI (choose the
card, press its offer key), or tell me here. I'll continue the moment it lands.

When the watcher returns, the gate is passed: read the json line it printed,
skip step 6, and carry the item onward the way the `stages` skill says.

## 3. Read the drift

```
ket item drift $ARGUMENTS
```

One line per plain-language sibling. On `stale`, `unstamped`, or `orphaned`,
re-derive or confirm that sibling the way the `plain` skill says, stamp with
`ket item stamp $ARGUMENTS`, and only then summarize. The page shows the same
lag beside the audience switch, so a reviewer sees what you skipped.

## 4. Say what the approval turns on

The page carries the artifacts. The chat carries the decision, so lead with the
decision:

- **The decision, in one line.** What approving starts and what it costs, under
  160 characters, with a verb in it.
- **The item.** Its title, its kind, its size.
- **The artifacts written beside it.** The solution design with its architecture
  diagram, the decision record, the acceptance criteria, the wireframe. Name the
  ones missing too, because the page dims them and the user reads a dimmed entry
  as a question.
- **What could change the answer.** An open question, a risk the design named, a
  step nothing undoes. These stay in the summary. Nothing the decision turns on
  belongs a level down.

Front-load all of it: the summary first, then the detail, in every bullet and
every sentence. Split a sentence over 25 words. Give the number rather than an
adjective about it.

## 5. Take the decision in the chat

Ask with AskUserQuestion. Three options, each saying what follows from it:

| Option              | What follows                                            |
| ------------------- | ------------------------------------------------------- |
| **Approve**         | the command below runs and implementation opens         |
| **Request changes** | the artifacts get revised and this gate runs again      |
| **Hold**            | the item stays at `awaiting-approval` and the turn ends |

An approval can land while the question is open: the watcher completing is the
user answering from another surface. Take it as the approval, skip the move
below, and continue.

On request changes, ask what to change, revise the artifacts beside the item, and
say what moved. The open tab updates itself through the push channel, so the user
rereads the revision without touching the browser. Then ask again.

Take the answer as given. A user who holds an item has told you the design is not
ready, and that is not an invitation to argue.

## 6. Move it

Stop the watcher task first, belt and suspenders: the move below completes it
anyway, and a watcher with nothing left to hear has no business running.

```
ket item approve $ARGUMENTS
```

This closes the surface as well. The gate is over, so the server the gate started
dies with it.

If it refuses, say why in the user's words. An item already implementing does not
need approving, and an idea has not been triaged yet.

After it succeeds, writes under a target's source path are allowed. probity
still requires a failing test before implementation code, and the gate still
refuses a trivial item touching an adapter.
