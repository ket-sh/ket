---
name: stages
description: Use after an item is filed or moved, and whenever deciding what to run next on it. The stage table, the commands that move an item between statuses, and the only two places the pipeline waits for a person.
---

# The stages an item moves through

An item carries one status, written in `.ket/items/<key>/item.yaml`. Only a
command moves it. Editing that file by hand is refused by the write gate,
because a status anything can write is a status that means nothing.

## The three human gates

The whole pipeline stops for a person exactly three times, and each one is a
decision the machine has no standing to make alone:

1. **The triage confirmation.** Before anything is filed, the user confirms the
   kind and the size.
2. **The decomposition confirmation.** Before an epic gets children, the user
   picks which of them to file. That list is the scope of the work, and scope
   belongs to the person paying for it.
3. **`/ket:approve <key>`.** Before any source is written, the user approves.

Stop at those three and wait. Between them, keep going without asking. An agent
that files an item and then reports back has left the job half done, and an
agent that decides an epic's children alone has decided what the product is.

## The table

| Status              | Size                   | What runs here                                     | What ends it                                |
| ------------------- | ---------------------- | -------------------------------------------------- | ------------------------------------------- |
| not filed yet       | any                    | `ket:triage` proposes, the user confirms           | `ket item file`, filing it triaged          |
| `triaged`           | `epic` or `story`      | nothing yet                                        | `ket item design <key>`                     |
| `triaged`           | `subtask` or `trivial` | nothing, because design is not owed at this size   | `/ket:approve <key>`, a human gate          |
| `designing`         | `epic`                 | research the breakdown, propose it, the user picks | the chosen children, then the first of them |
| `designing`         | `story`                | the design artifacts                               | `ket item submit <key>`                     |
| `awaiting-approval` | any                    | nothing                                            | `/ket:approve <key>`, a human gate          |
| `implementing`      | any                    | the failing test, then the code that answers it    | not built yet                               |

## Decomposing an epic

An epic is a container, not a job, and its children are the scope of the work.
Never invent that list alone.

**First, find out how this is usually broken down.** Use `ket:decomposer`, which
researches the shape before it proposes one. An epic like authentication,
billing or search has been built thousands of times, and the standard breakdown
is knowledge worth having rather than something to derive from first principles.
The `prior-art` skill owns how that search is run and `research` owns where the
answer comes from.

**Then propose, and wait.** Show the user the candidate children, each with one
line saying what it delivers, and say which ones the research suggests are
usually needed and which are usually optional. Ask which to file. This is the
second human gate. Do not file anything until they answer.

Take the answer as given. A user who drops a candidate has decided it is out of
scope, and a user who adds one you did not propose has told you something the
research missed. Neither is an invitation to argue.

**Then file what they chose**, one command per child:

```
ket item file --parent <epic key> --title '<title>' --kind <kind> --size <size>
```

Each child has to be smaller than the epic, and only an epic or a story takes
children at all. The command records the link on both ends and prints the key it
allocated.

Candidates the user dropped are not lost. Say plainly which ones went, so they
can be filed later if the work turns out to need them.

Then work the first child from the top of the table: it is `triaged`, so it
takes `ket item design` next. The epic keeps its own status and stops governing
writes while a child of it is in flight, so the child is the job and one job
still means one branch. Do not run the children in parallel. Two of them in
flight at once is two jobs, and the write gate refuses both.

## Why design is mandatory above subtask

`ket item approve` refuses a `triaged` story or epic. Work at that size either
spans more than one slice or cannot be specified without being broken down, and
neither is a call to make while writing the first test.

Work at `subtask` and `trivial` skips design entirely. Running a one-line change
through a design stage buys nothing a unit test does not already say, and a gate
that everything must pass is a queue, not a gate.

Design stays available at every size. Only the gate is conditional: run
`ket item design` on a small item whenever the approach is genuinely unclear.

## What each design stage produces

For a story, use the agents the harness ships and write the artifacts beside the
item in `.ket/items/<key>/`:

- `ket:solution-design` for the approach
- `ket:adr` when a decision is load-bearing and worth recording
- `ket:gherkin` for the acceptance criteria
- `ket:ui-design` when a target has a surface

Prose beside an item is allowed while the item is `designing`. Source is not:
the write gate refuses every write under a target's source path until the status
reaches `implementing`.
