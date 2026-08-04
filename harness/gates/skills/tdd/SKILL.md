---
name: tdd
description: Use before writing any implementation code or test in this project. The order, the verification style, and the invariant that decides whether a test may change.
---

# Test-driven and behavior-driven, inside out

## The order

Red, green, refactor. No implementation code before a failing test, and the
failure has to be observed rather than assumed. probity enforces this at the
edit itself, so a block is information: it means no failing test covers what you
were about to write.

Work **inside out**. Start at the core domain and grow outward to the adapters
and the delivery surface. Design emerges from the tests rather than being
imposed on them.

One behavior per test. A unit is a **behavior**, not a class and not a file.

## The verification style

**State-based, not interaction-based.** Assert on outcomes and on returned or
observable state. Exercise internal collaborators through the unit under test
instead of mocking them.

Test doubles belong at real process boundaries only: network, filesystem, clock,
child processes. A double anywhere else is a test coupled to a decision that
should be free to change.

## Behavior-style names

Structure and name tests Given, When, Then. Describe what the system does in
domain language, never how it does it.

- Good: `an unregistered target resolves to no preset`
- Bad: `calls resolvePreset twice`

A scenario has to make sense to someone who has never seen the implementation.

## The invariant

**Test code changes if and only if behavior changes.**

A pure refactor must never require touching a test. When it does, the test has
coupled itself to an implementation detail, so rewrite it around public behavior
rather than patching it.

Forbidden in tests: reaching into private state, asserting call order or counts
of internals, importing a module that is not part of the public surface.

## Property tests

Every declared invariant gets a fast-check property beside the example tests, in
its own `*.property.test.ts` file. Example-based tests cover the cases you
thought of. A property covers the ones you did not.

## Tests that touch the filesystem

A test exercising real input and output names its own temporary directory and
never relies on the working directory. This is not politeness, it is the
boundary: mutation testing drives code down branches the author never meant to
reach, so a test that would only write somewhere safe "because the happy path
goes elsewhere" will eventually write somewhere real.

A mutation run that changes anything outside its sandbox is a defect in the
test, and it gets fixed in the test.
