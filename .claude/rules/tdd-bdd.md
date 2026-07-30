# Test-driven and behavior-driven rules, applied inside-out (Detroit/classicist) and written as behavior-style specs

## Method

- Test-first, always: red → green → refactor. No implementation code before a failing test.
- Work **inside-out**: start from the core domain and grow outward toward adapters and delivery surfaces. Design emerges from the tests.
- One behavior per test. A "unit" is a **behavior**, not a class or a file.

## Verification style

- **State-based, not interaction-based.** Assert on outcomes and returned/observable state.
- Exercise internal collaborators indirectly through the unit under test instead of mocking them.
- Test doubles only at real process boundaries: network, filesystem, clock, child processes.

## Behavior-style spec language

- Tests are behavior specs: structure and name them Given/When/Then (arrange/act/assert).
- Describe _what_ the system does in domain language ("an unregistered target resolves to no preset"), never _how_ ("calls resolvePreset() twice").
- A scenario must make sense to someone who has never seen the implementation.

## The invariant

- **Test code changes if and only if behavior changes.**
- A pure refactor must never require touching a test. If it does, the test has coupled itself to implementation details, so rewrite it around public behavior instead of patching it.
- Forbidden in tests: reaching into private state, asserting call order/counts of internals, importing non-public modules.

## Property tests and the mutation gate

- Every declared invariant gets a fast-check property test. Example-based tests cover the cases you thought of, and a property covers the ones you didn't.
- Stryker measures whether the suite asserts anything. A high line count with a low mutation score is the signature of tests that execute code without checking it.
- A surviving mutant is a defect in the test, not in the threshold. Kill it.
- Some mutants are equivalent: the mutated code behaves identically, so no test can distinguish it. That's a design signal, not an exemption. It usually means a value is only ever read for truth, as with a boolean consumed by a truthiness check where `false` and `undefined` are interchangeable. Restructure so the distinction matters, or expose the behavior the value actually represents.

## Tests that touch the filesystem stay hermetic

- A test that exercises real I/O names its own temporary directory and never relies on the working directory. Passing `--cwd` isn't optional politeness, it's the boundary.
- Mutation testing is what makes this strict rather than tidy. Stryker drives the code down branches the author never meant to reach, so a test that would only write somewhere safe "because the happy path goes elsewhere" will eventually write somewhere real.
- A mutation run that changes anything outside its sandbox is a defect in the test, and it gets fixed in the test.

## Why this isn't negotiable here

ket exists to prove that AI-written code is what it appears to be, and mutation
score is the measurement that catches a suite asserting nothing. A test coupled
to implementation inflates coverage, survives no mutants that matter, and makes
the product's central claim false in its own repository first.
