---
description: File a piece of work, classified and confirmed before anything is built
argument-hint: what the work is
---

The user wants this built: **$ARGUMENTS**

Classify it, confirm the classification, then file it. Do not write source in
this turn; the gate will refuse it and it should.

## 1. Classify

Read `.ket/config.ts` to learn the targets, then read enough of the codebase to
answer two questions.

**Kind** is `feature`, `bug`, `refactor` or `chore`.

**Size** is decided by the test layers the change requires, never by how big it
feels:

| Requirement triggered                              | Minimum size |
| -------------------------------------------------- | ------------ |
| Nothing beyond a unit test                         | `trivial`    |
| Touches an adapter, so an integration test is owed | `subtask`    |
| Adds an acceptance criterion or an invariant       | `subtask`    |
| Spans more than one slice                          | `story`      |
| Cannot be specified without being broken down      | `epic`       |

Use the `ket:triage` agent for this. It proposes; it does not decide.

## 2. Confirm

Tell the user the proposed kind and size in one line, with the reason in one
more, and wait for one word. They may override. This is deliberate: the machine
proposes and the person decides, and the gates check the decision against what
the change actually touches later.

## 3. File

```
ket item file --title '<title>' --kind <kind> --size <size>
```

It prints the key it allocated. Tell the user the key and what happens next:
nothing may be written under a target's source path until `/ket:approve` runs.

Do not edit `.ket/items/*/item.yaml` yourself. The gate refuses it, because a
status that anything can write is a status that means nothing.
