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

## 2. Say what the approval turns on

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

## 3. Take the decision in the chat

Ask with AskUserQuestion. Three options, each saying what follows from it:

| Option              | What follows                                            |
| ------------------- | ------------------------------------------------------- |
| **Approve**         | the command below runs and implementation opens         |
| **Request changes** | the artifacts get revised and this gate runs again      |
| **Hold**            | the item stays at `awaiting-approval` and the turn ends |

On request changes, ask what to change, revise the artifacts beside the item, and
say what moved. The open tab updates itself through the push channel, so the user
rereads the revision without touching the browser. Then ask again.

Take the answer as given. A user who holds an item has told you the design is not
ready, and that is not an invitation to argue.

## 4. Move it

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
