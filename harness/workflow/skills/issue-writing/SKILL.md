---
name: issue-writing
description: Write the title and the description an item carries. Use before `ket item file` runs, in triage and in decomposition, and whenever a title or a description is challenged.
---

# Writing the item somebody else has to read

Every item is read by somebody who was not in the conversation that filed it.
The title is what they see on the board, and the description is everything else
they get. Both are written before the item is filed, and both are checked
against the refusal list at the bottom of this page first.

The text lands through the filing command and nowhere else:

```
ket item file --title '<title>' --kind <kind> --size <size> --description '<description>'
```

Wrap the description at 72 columns. It is stored as a block in
`.ket/items/<key>/item.yaml` and read back in a terminal column, so it keeps the
line breaks you gave it. Editing that file by hand is refused by the write gate.

## The title, whatever the kind

| Rule                                               | Why it is the rule                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| 60 characters, 70 at the ceiling                   | a board column truncates, and a truncated title identifies nothing |
| The distinguishing word inside the first three     | a reader scans the front of a line and stops                       |
| Unique against every sibling on the board          | two items that read alike get worked twice or not at all           |
| The problem or the outcome, never the proposed fix | the fix is what the design stage decides, and it changes           |
| No trailing period                                 | a title is a label, not a sentence                                 |
| No kind, key, branch or `feat:` prefix             | the kind and the key are fields, and the board prints them         |
| One problem per item                               | an item is one job, and one job is one branch                      |

An `and` joining two shippable behaviors is not a title. It is two items, so
split it and file both. An `and` joining two halves of one behavior is fine, and
the test is whether either half could ship alone and be useful.

Each kind carries the rules above plus one shape of its own:

| Kind        | Shape                                                          | A title that fits                               |
| ----------- | -------------------------------------------------------------- | ----------------------------------------------- |
| bug         | symptom first, as a noun phrase: condition, verb, component    | `Expired sessions load a blank dashboard`       |
| feature     | the outcome the user ends up with                              | `Accounts lock after three failed logins`       |
| epic        | the goal the capability serves                                 | `Only the account owner reaches an account`     |
| child story | the one behavior the child ships, readable beside its siblings | `Password reset expires its link after an hour` |

Symptom first means the failing thing opens the line. `Login broken` names no
symptom, `Dashboard is blank after a session expires` buries the subject, and
`Expired sessions load a blank dashboard` says which condition, which verb and
which component in that order.

## The description a feature carries

Eight to 15 lines. A feature small enough that its title settles every question
needs no description, so write one when the title leaves a decision open.

```markdown
## Context

What a reader needs to judge the rest, in a line or two.

## Behavior

What the system does once this ships.

## Acceptance criteria

- Given <the state>, when <the event>, then <the outcome>.

## Out of scope

- <the neighboring thing this deliberately leaves alone>

## Links

- <a path or an address you read, never one you assumed>
```

Keep every `then` free of side effects. A criterion that changes what it
measures is a criterion nobody can run twice.

## The description a bug carries

Ten to 18 lines, and every heading below is mandatory. A bug owes a
reproduction test before implementation, and this description is what somebody
writes it from.

```markdown
## Steps to reproduce

1. <what you did, and what the step was meant to achieve>
2. <the next one>

It happened <every time, sometimes, or once>.

## Expected

<what should have happened>

## Actual

<what happened, verbatim, error text and exit code included>

## Environment

<only what differs from the project default, pasted from what a command printed>

## Notes

<speculation, and say it is speculation>
```

Each step carries its intent, because a reader who knows what the step was for
can reproduce the bug through a door you did not use. Keep the observations and
the guesses apart: the first paragraph of `Notes` is where a theory belongs, and
never above.

Paste the environment rather than describing it. What `node -v` printed beats a
sentence about which version you think you are on.

## The description an epic parent carries

Twelve to 20 lines. The parent is a container, and it says why the work exists
and where it is cut. It never holds a child's acceptance criteria.

```markdown
## Problem

What is wrong or missing today, and who it costs.

## Appetite

What this is worth before anyone designs it, counted in the sizes this project
uses: how many stories, not how many weeks.

## Approach

One paragraph. The shape of the answer, with no interface detail in it.

## Slice rationale

Where the cut falls and why the children run in that order.

## No-gos

- <what this deliberately does not cover>

## Children

- <the one line each child delivers>
```

Appetite is a budget, not an estimate. When the approach cannot fit inside it,
the scope gives way rather than the number.

An epic is filed before its decomposition runs, so at filing time the last two
sections hold questions rather than answers. Write them as
`unknown: where the cut falls` and `unknown: which children this needs`, and let
the decomposition answer them. The item's own `children` field is the list the
machine reads, so the section is for the reasoning, never for a second copy of
the keys.

The approach stays free of interface detail on purpose. Anything drawn in a
parent gets read as direction by whoever builds the children, and the design
stage is where those decisions belong.

## The description a child story carries

Six to 12 lines. The parent already argued the problem, so a child that argues
it again wastes the reader twice.

```markdown
## Parent

<the parent key>

## Behavior

The one observable thing this child ships.

## Acceptance criteria

- Given <the state>, when <the event>, then <the outcome>.

## Out of scope

- <only what differs from the parent's no-gos>
```

Where a child holds to the parent's boundaries exactly, leave `Out of scope`
saying so in one line. A reader who has to diff two documents to find the
difference will not do it.

## Count before you file

Run this review on your own draft, and treat it as a gate rather than a habit:

1. Count the title characters. Over 70 sends you back.
2. Count the description lines against the budget for the kind.
3. Read the refusal list below, line by line, against what you wrote.

Under the floor means a heading is standing empty, so fill it or find out what
you are missing. Over the ceiling means padding, so cut prose. Never cut a
reproduction step or an acceptance criterion to fit a budget: those are the
evidence, and the budget exists to bound the words around them.

## What this skill never submits

- **A bug with no steps to reproduce, or with an expected and no actual beside
  it.** The pair is the bug. One half of it is an opinion.
- **An actual that says it does not work.** If it did nothing at all, somebody
  would have noticed before now. Say what it did instead.
- **A title over 70 characters, or one carrying a key, a kind or a branch
  name.** Those are fields, and repeating them costs the characters that
  identify the item.
- **A title joining two shippable behaviors with `and`.** File two items.
- **A description that is only a link, only an image, or the title said
  again.** A reader who follows a link to learn what the item is has been given
  a task, not a description.
- **Acceptance criteria naming a function, a table or a widget.** Criteria state
  outcomes. A criterion that names the implementation has to be rewritten the
  first time the implementation moves.
- **`As a user` openings, and a so-that clause that repeats the want.** `So that
I can reset my password` beneath `I want to reset my password` says nothing.
  Write the clause when it names a trade-off somebody could argue with, and drop
  it otherwise.
- **Any path, API, version or requirement you did not read in this repository or
  in a source you can cite.** An invented path costs the reader the trust they
  had in every other line. Write the gap as `unknown: <the question>` and leave
  it for the person who can answer it.
- **Words added to reach a line count.** The budget is a ceiling, not a target.
- **An epic parent holding one child's acceptance criteria.** The child owns its
  criteria. A parent that holds them has decided the child's scope in a document
  nobody reviews when the child changes.

When a draft trips one of these, say which line failed and what would fix it,
then write it again. Filing it and promising to improve it later leaves the
board carrying an item nobody can act on.
