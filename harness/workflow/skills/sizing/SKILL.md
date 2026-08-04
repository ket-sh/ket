---
name: sizing
description: Decide whether a request is an epic before sizing it by test layers. Use in triage, and whenever a size is proposed or challenged.
---

# Sizing a request

Two questions, and the order is the whole point. Ask whether the request is an
epic first. Only work that is not an epic gets sized by its test layers.

Getting the order wrong is the common failure: the ladder below always finds a
row that fits, so a request that should have been broken apart gets filed as a
story and the pipeline drives it as one job.

## 1. Is it an epic?

An epic is work nobody can specify yet. Three tests, and any one of them settling
`yes` makes it an epic. Stop there and do not read the ladder.

**Does the request name a capability rather than a change?** Authentication,
billing, search, notifications, onboarding and reporting are capabilities. Each
is a family of behaviors, and the request says which family, not which behavior.
Compare "add authentication" with "lock the account after three failed logins":
the second names one behavior and can be tested.

**Could you write the acceptance criteria now, without inventing scope?** If
finishing the criteria means deciding things the request never said, those
decisions are the work, and they belong to children rather than to guesses.
"Add authentication" leaves open whether it means passwords or a provider,
whether sessions expire, what happens on a reset, and whether an existing user
migrates. Nothing in the request answers any of it.

**Can you name two or more behaviors that could ship separately and each be
useful?** Sign in, sign out, session expiry and password reset each ship alone
and each earns its own scenario. That is a decomposition, so the parent is an
epic.

A request that fails all three tests is not an epic, however large it feels.
Size it with the ladder.

## 2. The ladder

For work that is not an epic, size follows the test layers the change requires,
never how big it feels. Take the largest row that applies.

| Requirement triggered                              | Size      |
| -------------------------------------------------- | --------- |
| Nothing beyond a unit test                         | `trivial` |
| Touches an adapter, so an integration test is owed | `subtask` |
| Adds an acceptance criterion or an invariant       | `subtask` |
| Spans more than one slice                          | `story`   |

The ladder stops at `story`. Nothing on it produces an epic, because an epic is
decided before the ladder is read.

## What a proposal says

Name the size, then name what decided it. For an epic, quote the test that
settled it and list the children you would cut. For anything else, name the
layer: the adapter it touches, the criterion it adds, or the slices it spans.

A proposal that says only a size is one nobody can argue with, and the person
confirming it deserves the reason.

## When a size is challenged

Take the challenge seriously rather than defending the answer. Re-run the three
epic tests out loud against the exact words of the request. Most disagreements
are one of two things: a capability read as a change, or a request whose
criteria seemed writable only because scope was invented to fill them.

If the challenge holds, say so plainly and re-propose. The person deciding is
the gate, not you.
