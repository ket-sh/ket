---
description: File a piece of work and carry it to the first gate
argument-hint: what the work is
order: 1
---

The user wants this built: **$ARGUMENTS**

Classify it, confirm the classification, file it, and then keep going. Do not
write source in this turn; the gate will refuse it and it should.

## 1. Classify

Read `.ket/config.yaml` to learn the targets, then read enough of the codebase to
answer two questions.

**Kind** is `feature`, `bug`, `refactor` or `chore`.

**Size** comes from the `ket:sizing` skill. Read it rather than guessing: it asks
whether the request is an epic before it sizes anything, because a request that
names a capability rather than a behavior is an epic however small it sounds.

Use the `ket:triage` agent for this. It proposes; it does not decide.

## 2. Confirm

Say the proposed kind and size in one line, with the reason in one more. Then ask
with AskUserQuestion, two questions in the one call:

| Question | Options                               |
| -------- | ------------------------------------- |
| Kind     | `feature`, `bug`, `refactor`, `chore` |
| Size     | `epic`, `story`, `subtask`, `trivial` |

Put the proposal first in each list and give every option one line saying what it
costs the work: a bug owes a reproduction test, a refactor may not change a
scenario, an epic gets children before it gets code. The machine proposes and the
person decides, and the gates check that decision against what the change
actually touches later.

This is the first of the four human gates. Stop here and wait.

## 3. Write the title and the description

Read the `ket:issue-writing` skill and write both to it. The title checklist
applies whatever the kind, the description follows the template for the kind the
user just confirmed, and the review step at the end of that skill runs before
the command does rather than after somebody complains.

The description is the whole handover to a reader who was not in this
conversation. Write nothing into it you did not read in this repository or in a
source you can cite, and write a gap as `unknown: <the question>`.

## 4. File

```
ket item file --title '<title>' --kind <kind> --size <size> --description '<description>'
```

A feature small enough that its title settles every question can go without the
flag. Everything else carries one.

It prints the key it allocated. Tell the user the key.

## 5. Carry on

Filing is not the end of the turn. Read the `ket:stages` skill, find the row for
the status and size you just filed, and do what it says. Keep moving through the
table without asking, until you reach a row that names a human gate.

For most work that means opening design, writing the artifacts, and submitting
for approval. For an epic it means researching how the work is usually
broken down, proposing the children, and stopping for the user to pick which
ones to file. That is the second gate, and the children are the scope of the
work, so it is not a choice to make alone. For `subtask` and `trivial` work the next row is already the
approval gate, so filing ends the turn.

When you stop, say which item is in flight, what status it holds, and what you
need from the user to continue.

Do not edit `.ket/items/*/item.yaml` yourself. The gate refuses it, because a
status that anything can write is a status that means nothing.
