---
name: gherkin
description: Use before writing or changing any .feature file. The six checks a scenario passes, and the rule that decides whether a scenario may change at all.
---

# Scenarios

A `.feature` file is what the person approving an item approves. It states the
agreed behavior in language a reader follows without opening any code.

Write the scenario before the automation. A scenario written after the code
documents the code rather than the agreement, and the agreement was the point.

Scenarios live beside the item that agreed them, under
`.ket/items/<key>/features/`. Without the workflow, the artifact lives under
`docs/features/` instead.

## The invariant

**A scenario changes if and only if the agreed behavior changes.**

Step definitions absorb every implementation change. A rename, an extracted
module, a new adapter: each of those reaches the steps and stops there. When a
`.feature` file has to move for a change nobody agreed to, the scenario had
coupled itself to the code.

The write gate holds this line without reading a word of the scenario. A
`refactor` item touching a `.feature` file is refused, because a changed
scenario makes the work a feature. When it fires, triage runs again. Do not
work around it.

## BRIEF

Every scenario passes all six.

- **Business language.** Words come from the product domain. Never from the
  DOM, the toolchain, or the test infrastructure.
- **Real data.** Concrete values a reader can check. A placeholder such as "a
  valid account" names nothing the reader can disagree with.
- **Intention revealing.** State what the actor achieves, not the mechanics
  that get them there.
- **Essential.** Delete any line whose removal loses no meaning. Incidental
  detail hides the rule the scenario was written to illustrate.
- **Focused.** One scenario, one rule.
- **Brief.** Three to five steps. A longer one is smuggling setup that belongs
  in `Background` or inside a step definition.

## Declarative, never imperative

Describe what, not how. "When the shopper checks out with an expired card"
beats four steps of navigating, typing and clicking.

Selectors, URLs, keystrokes and coordinates never appear in a step. Those are
adapter details, and they live in the step definitions.

Do not over-correct into abstraction either. "Given the app works, then it
works" states no behavior. Keep at least one concrete, checkable value.

## Structure

- One When and one Then per scenario. A second pair is a second scenario.
- Scenarios run in any order and give the same result. One that depends on
  another scenario's leftovers is a defect in both.
- `Background` holds context every scenario in the file needs. Setup for one
  scenario stays in that scenario's Given.
- `Scenario Outline` earns its place when one rule holds across a table of real
  value combinations. It never disguises unrelated cases as one rule.
- Tags classify, they do not configure. Suite selection and quarantine, not
  parameters smuggled into a step.

## One file per behavior area

Not one file per criterion, which scatters a single rule across the tree. Not
one file per item, which grows past reading. A file you have to scroll to find
a scenario in is two files.

The filename names the behavior area and never repeats the folder above it.

## The review test

Read the finished scenario as somebody who has never seen the implementation.
If a step needs the code to make sense, rewrite that step in domain language
before it lands.
