---
name: mechanical-checks
description: Use when a dependency arrives, when the toolchain gate names one at session start, or when you catch the project keeping a rule by discipline. How to find the checker, judge it, and propose it.
---

# A rule kept by hand is a rule waiting to break

Every dependency arrives with rules. Drizzle lets you write `delete()` with no
`where`. A migration file lets you take a lock that stops the service. A React
component lets you call a hook inside a condition. The library does not stop
you, so something else has to, and a sentence in a document is not something.

This is the same principle the `clean-code` skill states about lists: a
hand-maintained rule is where a gap hides. Read the authority, and make the
disagreement fail a check instead of shipping.

## When this runs

- `ket gate toolchain` names a dependency at session start. It names each one
  once, so the session it lands in is the one that has to answer.
- You are about to write a rule into a document, a review comment, or CLAUDE.md.
- A defect got through and the fix begins with the words remember to.

## 1. Write the rule as a decision, not as advice

A machine decides. "Never call `delete` without `where`" is a decision over an
AST. "Every migration states a lock timeout" is a decision over a file. "Use the
ORM carefully" is advice, and no tool will ever check it.

When the rule will not reduce to a decision over a file, an AST, an import
graph, a rendered artifact, or a diff, stop here. The rule needs sharpening
before it needs a tool.

## 2. Look for the checker before writing one

Search in this order through the `research` skill, and search every time, because
this changes:

1. **What the dependency already ships.** The check is often not called a
   linter: `drizzle-kit check` validates the migration folder, `tsc --noEmit`
   checks types, `terraform validate` checks a plan. Read the CLI's own
   commands first.
2. **An official lint plugin.** `eslint-plugin-drizzle` carries exactly two
   rules, delete and update without a `where`, and that narrowness is the model:
   it encodes the mistakes the type system cannot catch and nothing else.
   `eslint-plugin-react-hooks`, `@vitest/eslint-plugin`, `graphql-eslint` and
   `eslint-plugin-jsx-a11y` are the same shape.
3. **A category tool that never heard of your library.** Postgres migrations
   have squawk and eugene. OpenAPI has spectral. Kubernetes has kubeconform for
   schema and conftest for policy. Terraform has tflint and checkov. Secrets
   have gitleaks. These check the artifact, whatever produced it.
4. **The tool the ecosystem moved to.** Datree was documented everywhere and
   archived in 2024. Atlas moved its most useful Postgres analyzers behind a
   paid tier. Check the last release date, not the README.

## 3. Judge whether the check earns its cost

Google's Tricorder criteria are the best-evidenced bar, and the second one does
most of the work:

- **Understandable.** The engineer who sees the message knows what it means.
- **Actionable.** The message carries the fix.
- **Under one finding in ten is an effective false positive.** A finding counts
  as a false positive whenever nobody acts on it, however technically correct it
  was. A pedantically right rule nobody acts on is noise, and noise gets the
  whole checker disabled.
- **Real impact on correctness.**

Then the practical questions:

- **Does an existing gate already decide this?** The type system, the ring one
  checks, dependency-cruiser, or a gate in the chain may already own it. Two
  tools deciding one rule is one tool too many.
- **Style or correctness?** Formatters own style. ESLint deprecated its
  formatting rules for this reason. A lint rule a formatter could enforce pays
  the linter's cost for the formatter's benefit.
- **How fast is the feedback?** In the editor beats at the write beats at the
  commit beats in CI beats a comment on the pull request. ket runs ring one per
  write for exactly this reason.
- **Can a finding be suppressed locally?** squawk excludes per rule, Atlas reads
  `-- atlas:nolint`, oxlint reads an inline disable. A rule with no escape hatch
  is a rule somebody deletes globally the first time it is wrong.
- **What happens at the dependency's next major?** A checker inherits the
  upgrade risk of what it checks. `eslint-plugin-tailwindcss` still trails
  Tailwind v4.
- **What does it cost to run and to own?** Seconds per commit, a subscription,
  a single-maintainer repository.

## 4. When no checker exists, write the smallest one that fits the scope

Match the rule's scope to the tool. Choosing oxlint for an import rule means
maintaining a worse dependency-cruiser.

| The rule is about        | Write it as                                        |
| ------------------------ | -------------------------------------------------- |
| what a module may import | a dependency-cruiser rule                          |
| one file's syntax        | an oxlint JS plugin, or an ast-grep rule in YAML   |
| the shape of the repo    | a test in the suite that already runs              |
| a generated artifact     | regenerate it and diff, so a hand edit cannot pass |
| the pull request itself  | a Danger rule                                      |

oxlint takes JS plugins through `jsPlugins`, with an API shaped like ESLint's,
so a house rule is a file and a config entry. It has no type information and no
custom parsers, so a rule needing either belongs somewhere else.

Real rules that got written this way, each because the category tool had a hole:

- `no-process-env`, because the linter shipped no rule for it and every read had
  to go through the env schema.
- `no-direct-database-url`, written after a migration path read the wrong
  connection, a role got made superuser to make it work, and a superuser
  bypasses row level security. Nothing caught it, because the wrong principal
  returns rows instead of errors.
- `no-raw-execute` in repositories, scoped to one directory, with a single
  carve-out for the `SET LOCAL` that the audit trail needs.
- A GraphQL schema policy run inside an oxlint plugin, because oxlint has no
  GraphQL parser and the rules had to match the cloud console's policy exactly.

Two habits go with a hand-written check:

- **Record the tool gap in the file.** Which tool owns this category, and why it
  was not used. That paragraph is what lets somebody delete your rule later.
- **Arm it both ways.** A rule that matches nothing passes forever. Keep a
  fixture it must reject and one it must accept, and run them in the suite.

## 5. Propose it. Never install it.

ket proposes, the user decides. Bring five things and then stop:

1. The rule, in one sentence.
2. The defect it prevents, from this repository's history when possible.
3. The checker, and whether it is maintained, free, and suppressible.
4. Where it would run: the editor, ring one, the commit hook, or CI.
5. What it costs: a dependency, seconds, a subscription.

Adding a dependency, editing a config, or wiring a hook happens after the user
says yes. Never install a checker to demonstrate it, and never widen an ignore
file to quiet a finding.

"No" is an answer. The toolchain gate has already recorded the name, so the
question does not come back every session.

## What this is not

A reason to lint everything. A check that fires on nothing, or that everybody
turns off, costs more than the rule it replaced. One narrow rule that catches a
real defect beats ten that catch style.
