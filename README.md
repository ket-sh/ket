# ket

An opinionated TypeScript ecosystem of AI agents and guardrails, for Web, API,
Desktop, Mobile, and the terminal.

ket scaffolds a project where every quality rule runs as a machine gate. Then it
drives agents through a pipeline those gates hold to. A status moves only when a
gate moves it, and agents that run ahead of a stage hit a refusal at the write
itself rather than at review.

New here? [The handbook](docs/handbook.md) walks the whole system: what runs
at every moment, the pipeline's stages and its four human gates, and every
skill by name.

## Install

ket needs Bun, and its prose gate runs Vale through
[mise](https://mise.jdx.dev). No release exists yet, so build ket from a
checkout.

```sh
git clone https://github.com/ket-sh/ket
cd ket
bun install
bun run --cwd packages/cli build
ln -s "$PWD/packages/cli/dist/ket" ~/.local/bin/ket
```

Confirm it answers:

```sh
ket --help
```

The pipeline ships as a Claude Code plugin from the same repository. A project
ket creates points at the `ket-sh/ket` marketplace. Until the plugin reaches the
default branch, register the checkout instead:

```sh
claude plugin marketplace add "$PWD"
```

## Create a project

Run `create` from the directory that will hold the project.

```sh
cd ~/Projects
ket create
```

The first question asks for a name. Above the field sits the current directory,
so you can see where the project lands before you type. Pass a name as an
argument to skip that question:

```sh
ket create shop
```

Then it asks two more questions:

```text
Please select your project type                              cli
Which online services do you want to use?                    codecov codeql coderabbit
What key should item IDs carry?                             SHOP
```

The second question offers what the preset you chose supports, and nothing else.
Each line says what the tool costs, because all three are free on a public
repository and charge on a private one. Pick none and the project still gets a
pipeline. Pick some and the files that run them arrive with it. To skip the
question, name them on the command line:

```sh
ket create shop --with codecov,codeql
```

Then `create` writes the project and tells you what to run:

```text
   🎉  shop is ready

   Move into it
   cd shop

   Install the toolchain
   bun install

   Run the suite
   bun run test

   ╭───┬─────────────────────────┬────────────────────────────────────────────╮
   │   │ run                     │ what it does                               │
   ├───┼─────────────────────────┼────────────────────────────────────────────┤
   │ ⚙ │ bun run lint            │ It checks style, correctness and imports.  │
   │ ⚙ │ bun run check-types     │ It checks types at full strictness.        │
   │ ⚙ │ bun run lint:boundaries │ It checks what a module may import.        │
   │ ⚙ │ bun run lint:dead       │ It finds code nothing reaches.             │
   │ ⚙ │ bun run lint:dup        │ It finds knowledge written twice.          │
   │ ⚙ │ bun run lint:spell      │ It finds words nobody has agreed on.       │
   │ ▷ │ bun run lint:prose      │ It checks the prose in every markdown.     │
   │ ⚙ │ bun run fmt:check       │ It checks formatting, so diffs show why.   │
   │ ▷ │ bun run test            │ It checks the behavior the suite claims.   │
   │ ⚙ │ bun run lint:secrets    │ It finds a secret before it ships.         │
   │ ⚙ │ bun run lint:workflows  │ It checks the pipeline files for defects.  │
   │ ▷ │ bun run test:mutation   │ It checks that the suite asserts anything. │
   ├───┴─────────────────────────┴────────────────────────────────────────────┤
   │ ⚙ the commit hook runs it   ▷ you run it when you want                   │
   ╰──────────────────────────────────────────────────────────────────────────╯
```

ket names the manifest after the directory, fills in what the preset needs, and
writes the preset's files. It commits them too, as `chore: scaffold with ket`,
so your first diff is your own work rather than ket's tangled with it.
Installing stays your call:

```sh
cd shop
bun install
bun run test
```

The first `bun run lint:prose` downloads the Vale style package it declares.
Every later run finds it on disk and stays offline.

The project arrives with a commit hook wired to the gates in that table. It also
brings a Vitest suite and a Stryker configuration whose threshold breaks the
build below a mutation score of 90. An example `hello` command ships with its
own unit and property tests.

It also gets `.github/workflows/ci.yml`, which runs the same gates GitHub side.
Every gate the preset declares appears there, and a test holds the two lists
together, so a gate can't pass on your machine and go missing in the pipeline.
Each integration you picked brings its own file: Codecov adds `coverage.yml`,
CodeQL adds `codeql.yml`, and CodeRabbit adds `.coderabbit.yaml`.

## Develop a feature

Open Claude Code in the project.

```sh
claude
```

### File the work

```text
/ket:feature lock the account after three failed logins
```

Triage reads the request, proposes a kind and a size, and stops for your answer
before it files anything. Confirm the proposal or name your own. The item then
lands at `.ket/items/SHOP-1/item.yaml`:

```yaml
title: lock the account after three failed logins
kind: feature
size: story
status: triaged
children: []
```

### Watch the gate refuse work that ran ahead

Ask for the implementation now, ahead of approval:

```text
Write src/lockout.ts with a lockedOut function
```

Nothing reaches the disk. The hook answers before the tool runs:

```text
SHOP-1 is triaged, not implementing. Approval comes before source.
```

The gate counts a test as source, so agents that write tests first stop at the
same line. Then watch what blocked agents try next. They reach for the item file
to approve themselves, and draw a second refusal:

```text
.ket/items/SHOP-1/item.yaml records a status, and only a gate writes one. Use /ket:approve.
```

Those two refusals carry the whole idea. Agents can't argue their way past a
gate, and they can't move the status that holds them. The gate runs outside the
conversation and reads only the path and the status on disk.

### Approve it

```text
/ket:approve SHOP-1
```

The status moves to `implementing`. Only a gate writes that word, so editing the
item file by hand draws its own refusal.

### Write it, test first

Ask again and the write goes through. The test-first gate still holds the order,
so a production file waits for a failing test that covers it. After each write,
ring one runs on that file alone and hands its result back: it formats it, lints
it, and runs the test that covers it. The project-wide checks sit in ring two,
which runs when a stage ends rather than after every keystroke.

Every decision lands in `.ket/events.jsonl`:

```json
{"gate":"write","outcome":"allowed","about":"src/lockout.test.ts","item":"SHOP-1"}
{"gate":"probe","outcome":"refused","about":"src/lockout.test.ts"}
{"gate":"write","outcome":"allowed","about":"src/lockout.ts","item":"SHOP-1"}
{"gate":"probe","outcome":"allowed","about":"src/lockout.ts"}
```

The refused probe is the red step. Ring one ran while the test still had nothing
to call.

### Review it

```text
/ket:review
```

Two seats read the change at once, on different models with different lenses:
one for correctness and regression, one for security and failure modes. Each
seat reproduces every defect it claims by running the commands that show the
break, then drops whatever failed to reproduce or scored under 80.

The two reports join on location and defect. Where both seats agree, the finding
stands or falls on the spot. Where they disagree, a single judge settles it on
the highest tier at maximum effort. The report closes with what got dropped and
why, because a dropped finding is evidence the review ran.

### Think before you file

An epic is work nobody can specify without breaking it apart, and it needs
thinking rather than filing. `/ket:explore` is a stance, not a
workflow: it reads, it reasons, and it writes nothing under a source path. It
captures what it learns only when you ask.

```text
/ket:explore how should a lockout interact with a password reset
```

### Ask where things stand

```text
/ket:status
```

It groups the items by status and names what each one waits on. `/ket:continue`
picks up the single item in flight and carries it to the next stage.

### Read the week back

```text
ket retro
```

It folds the event log into `docs/retro/<year>-W<week>.md`, and `--since` reads
from a moment you name instead of the week. The report says what entered, what
shipped and what still runs. Then it says what slowed the work: the refusals
grouped by gate and reason, the longest quiet on an item still in flight, and
the items that went backward. It splits the quiet between waiting on a person
and the machine working. It closes on one action, taken from the cluster that
fired most, because an action somebody takes beats ten suggestions nobody reads.
A window nothing landed in still writes its report, and the report says so.

## Every session, ket looks for a machine

A rule kept by discipline is a rule nobody keeps. When a session starts, ket
reads the project manifest, compares it against what it has already seen, and
names what arrived. Add Drizzle and it comes back with the migration linter that
exists for it. When nothing exists, it proposes writing the check, a custom
oxlint rule being the usual shape. It proposes and you decide, and it never adds
a dependency on its own. It stays quiet when nothing is new.

## What the gates refuse

| The attempt                                 | Why it stops                          |
| ------------------------------------------- | ------------------------------------- |
| Source under a target, before approval      | Approval comes before source          |
| An edit to an item file                     | Only a gate writes a status           |
| A `trivial` item touching an adapter        | It was never trivial                  |
| A `refactor` that changes a scenario        | A changed scenario makes it a feature |
| A write while a second item is in flight    | One job means one branch              |
| Production code no failing test covers      | The test comes first                  |
| A lockfile, a `.env` file, or key material  | A tool owns it, or you do             |
| `git commit --no-verify`                    | A gate you can skip isn't a gate      |
| A shell command writing what a tool may not | The rule reads the path, not the tool |

That last row matters more than it looks. A gate wired only to the editor is one
that agents step around with a heredoc. `ket gate shell` reads the paths a command
writes and asks the same rule, so a redirect, a heredoc, `tee`, `cp`, `mv` and
`sed -i` all meet the refusal the editor would have given. Reading is never
refused, and a command it can't read confidently gets refused by name rather
than waved through.

A repository with no `.ket` directory gets none of this. The gate stays quiet
there, so enabling the plugin at user scope leaves your other projects alone.

## What ket doesn't do yet

- The design stage writes its artifacts beside the item, and `ket gate citations`
  checks that what a design cites the repository can show. Nothing yet checks
  that a design is complete, only that its claims hold.
- Mutation runs as a script you invoke, and `/ket:review` runs when you ask for
  it. Neither one holds a status, so an item can ship without either.
- Nothing bounds the loop yet. A `Stop` hook that keeps agents working until a
  stage finishes comes in a later slice.
- `ket watch` renders sample data instead of the event log.
- Chromatic and the Mobbin design reference arrive with the presets that have a
  user interface. The `cli` preset offers neither, because neither has anything
  to say about a command line.
- One preset ships, `cli`. Web, API, Desktop, and Mobile are still to come.

## On the list for the first release

- **Monorepo.** One project, several packages, each with the preset that suits
  it. Today `create` writes a single target that covers the whole repository.
- **Set up ket in a repository that already exists.** Today `create` starts an
  empty directory.
- **Update a project ket already made.** A project keeps whatever `create` gave
  it, and nothing refreshes that.

Licensed under the MIT license.
