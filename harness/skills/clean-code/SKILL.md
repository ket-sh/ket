---
name: clean-code
description: Use when naming anything, when a function grows, or when deciding whether two similar pieces of code are duplication. The rules this project holds code to.
---

# Clean code, as this project means it

## Naming

Names reveal intent. A reader should not need the implementation to know what a
variable, function or module is for.

**Domain language everywhere.** `slice`, `manifest`, `preset`, `adapter`,
`domain`, `usecase`, `gate`, `ring`, `item`, `stage`, `threshold`, `override`.
Never a generic `manager`, `helper`, `util`, `data` or `info`.

**One concept, one name, across the whole codebase.** A `target` and a `preset`
are different things. Do not let them drift into each other.

## Functions and modules

One function, one job. One module, one reason to change.

Keep functions small. When a block needs a comment to explain what it does, pull
it into its own function: the name **is** the comment.

A function taking a boolean flag to switch behavior is two functions. Split it.

Prefer pure functions in the core domain and push side effects to the edges:
filesystem, process, network, clock. This is also what makes the mutation gate
reachable, since a pure function needs no sandbox to test.

## Simplicity

**KISS.** The simplest design that passes the tests wins. Cleverness is a cost
somebody pays later.

**YAGNI.** Build what the current requirement needs. Leave room to extend, and do
not build the extension.

**DRY for knowledge, not for lines.** One authoritative representation per
business rule. Two pieces of code that look alike but encode different decisions
are not duplication, and merging them couples two things that should move
independently.

The corollary matters more than the rule: **a hand-maintained list is where a gap
hides.** When a list has to agree with something else, do not maintain both. Read
the authority and compare against it, so the disagreement fails a test instead of
shipping.

## The scope of a change

Every line in the diff traces to the item that asked for it. A fix that also
reformats the file, renames the function beside it or tidies a comment on the
way past costs more than it looks. The reviewer can no longer see which lines
were the fix, and the refactor ratchet cannot tell whether a score moved
because behavior moved or because something unrelated came along for the ride.

Match the surrounding style even where you would have chosen differently. The
thing you wanted to clean up is a real finding, so file it as its own item
rather than folding it into this one.

The exception is what your own edit orphaned. An import nothing reaches now, a
function the change left unreachable: those arrived with the change and they
leave with it.

## Errors

No silent failures. Never swallow an error without handling it or passing it on.

Fail with context. The message carries the operation attempted and why it failed:
which command, which preset, which path.

Model expected failures as typed results or states, not thrown surprises. No git
repository, an already configured project, an interrupted wizard: these drive what
the command does next, so they belong in the type.

## Comments

**Do not write comments.** Code explains itself through naming and structure, and
a block that needs explaining needs extracting or renaming instead.

The sole exception is a constraint the code genuinely cannot express. If in doubt,
do not write it.

Delete commented-out code. Git remembers.
