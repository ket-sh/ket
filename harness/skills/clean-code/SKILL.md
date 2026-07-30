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

**A name that lies is worse than a vague one.** A `Map` is not a `list`. A
boolean is not a `flag`, which reads as a bit field. A promise resolves to a
value rather than holding a request. The reader trusts the name and stops
reading, which is the whole point of naming it well and the whole cost of naming
it wrongly.

## Functions and modules

One function, one job. One module, one reason to change.

**The test is whether you can name it without an `and`.** `parseAndWrite` is two
functions wearing one name, and the name already told you.

Keep functions small. When a block needs a comment to explain what it does, pull
it into its own function: the name **is** the comment.

**Mixed levels of abstraction is the deeper smell.** A function that
orchestrates a decision and also picks a string apart is two functions, and its
length is the symptom rather than the disease. Extract the low level part and
the caller reads as a sentence.

A function taking a boolean flag to switch behavior is two functions. Split it.

**Three required arguments is where to start worrying.** Fold unrelated values
into one named argument object, so a call site says which value is which and
adding a fourth breaks nothing. Optional configuration with a default does not
count against this.

Prefer pure functions in the core domain and push side effects to the edges:
filesystem, process, network, clock. This is also what makes the mutation gate
reachable, since a pure function needs no sandbox to test.

## A file reads top to bottom

Order a new file so a reader meets things in the order they need them: types and
constants, then the small general helpers, then the exported thing the file is
named after, then its private parts in the order they are called. Nobody should
have to scroll up to learn what they are looking at.

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

The other corollary is the rule of three. The third time you write the same
idiom, it becomes a named function in one place. The first two are not yet
evidence of anything.

## Values that carry meaning get names

A bare number holding a decision is a decision nobody can find: a timeout, a
retry count, a length limit, an exit code. Hoist it to a named constant above the
code that reads it. The exceptions are the numbers that mean themselves, like
zero, one and an index.

A string repeated in a third file becomes a shared constant in the same change.
Renaming a path should touch one file.

**A test keeps its literals.** `expect(key).toBe('cli-1')` documents the value
under test, and `expect(key).toBe(KEY_PREFIX)` documents nothing: the assertion
now moves whenever the constant moves, so it cannot catch the constant moving.
The literal **is** the assertion. Do not import the constants module into a test
to source what the test is checking.

## Errors

No silent failures. Never swallow an error without handling it or passing it on.

Fail with context. The message carries the operation attempted and why it failed:
which command, which preset, which path.

Model expected failures as typed results or states, not thrown surprises. No git
repository, an already configured project, an interrupted wizard: these drive what
the command does next, so they belong in the type.

**Degrading on purpose still leaves a trace.** When carrying on is the right
answer, as with a cache that would not answer or an optional tool that is
absent, the code says so at warning level with the reason attached. A catch that
does nothing is indistinguishable from a bug, both to the next reader and to the
person wondering why the fast path never runs.

## No path that only exists on your machine

Never commit a path rooted at a home directory or at one checkout: not in source,
not in a test, not in a document. It breaks on every other machine, it breaks in
the pipeline, and it publishes a username.

Build paths instead: from the module's own location, from the working directory
the caller passed, or from a temporary directory the test made for itself. When a
test needs a path with a particular shape, invent one. Only the shape is under
test, so `/repo/.ket/items/cli-1` proves what the real path would have proved.

## Comments

**Do not write comments.** Code explains itself through naming and structure, and
a block that needs explaining needs extracting or renaming instead.

The sole exception is a constraint the code genuinely cannot express. If in doubt,
do not write it.

Delete commented-out code. Git remembers.
