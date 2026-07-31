---
description: File a piece of work and carry it to the first gate
argument-hint: what the work is
order: 1
---

The user wants this built: **$ARGUMENTS**

Classify it, confirm the classification, file it, and then keep going. Do not
write source in this turn; the gate will refuse it and it should.

## 1. Classify

Read `.ket/config.ts` to learn the targets, then read enough of the codebase to
answer two questions.

**Kind** is `feature`, `bug`, `refactor` or `chore`.

**Size** comes from the `ket:sizing` skill. Read it rather than guessing: it asks
whether the request is an epic before it sizes anything, because a request that
names a capability rather than a behavior is an epic however small it sounds.

Use the `ket:triage` agent for this. It proposes; it does not decide.

## 2. Confirm

Tell the user the proposed kind and size in one line, with the reason in one
more, and wait for one word. They may override. This is deliberate: the machine
proposes and the person decides, and the gates check the decision against what
the change actually touches later.

This is the first of the two human gates. Stop here and wait.

## 3. File

```
ket item file --title '<title>' --kind <kind> --size <size>
```

It prints the key it allocated. Tell the user the key.

## 4. Carry on

Filing is not the end of the turn. Read the `ket:stages` skill, find the row for
the status and size you just filed, and do what it says. Keep moving through the
table without asking, until you reach a row that names a human gate.

For most work that means opening design, writing the artifacts, and submitting
for approval. For an epic it means decomposing into children and then working
the first child. For `subtask` and `trivial` work the next row is already the
approval gate, so filing ends the turn.

When you stop, say which item is in flight, what status it holds, and what you
need from the user to continue.

Do not edit `.ket/items/*/item.yaml` yourself. The gate refuses it, because a
status that anything can write is a status that means nothing.
