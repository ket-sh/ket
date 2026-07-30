# ket

An opinionated TypeScript ecosystem of AI agents and guardrails, for Web, API,
Desktop, Mobile, and the terminal.

ket scaffolds a project where every quality rule runs as a machine gate. Then it
drives agents through a pipeline those gates hold to. A status moves only when a
gate moves it, and agents that run ahead of a stage hit a refusal at the write
itself rather than at review.

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

Next come the targets. A target pairs a directory with the preset that governs
it. A single-package project takes the defaults:

```text
Which directory does this target cover?   .
Which preset governs it?                  cli
What key should item IDs carry?           SHOP
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
   │ ▷ │ bun run test:mutation   │ It checks that the suite asserts anything. │
   ├───┴─────────────────────────┴────────────────────────────────────────────┤
   │ ⚙ the commit hook runs it   ▷ you run it when you want                   │
   ╰──────────────────────────────────────────────────────────────────────────╯
```

ket names the manifest after the directory, fills in what the preset needs, and
writes the preset's files. Installing stays your call:

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

Ask again and the write goes through. probity still holds the order, so a
production file waits for a failing test that covers it. After each write, ring
one runs and hands its result back. It lints the file that changed, then checks
types and import rules across the project.

Every decision lands in `.ket/events.jsonl`:

```json
{"gate":"write","outcome":"allowed","about":"src/lockout.test.ts","item":"SHOP-1"}
{"gate":"probe","outcome":"refused","about":"src/lockout.test.ts"}
{"gate":"write","outcome":"allowed","about":"src/lockout.ts","item":"SHOP-1"}
{"gate":"probe","outcome":"allowed","about":"src/lockout.ts"}
```

The refused probe is the red step. Ring one ran while the test still had nothing
to call.

### Ask where things stand

```text
/ket:status
```

It groups the items by status and names what each one waits on. `/ket:continue`
picks up the single item in flight and carries it to the next stage.

## What the write gate refuses

| The attempt                              | Why it stops                          |
| ---------------------------------------- | ------------------------------------- |
| Source under a target, before approval   | Approval comes before source          |
| An edit to an item file                  | Only a gate writes a status           |
| A `trivial` item touching an adapter     | It was never trivial                  |
| A `refactor` that changes a scenario     | A changed scenario makes it a feature |
| A write while a second item is in flight | One job means one branch              |

A repository with no `.ket` directory gets none of this. The gate stays quiet
there, so enabling the plugin at user scope leaves your other projects alone.

## What ket doesn't do yet

- The design stage ships as prompts for the design agents. No gate reads what
  they produce, and the four design artifacts have no home on disk.
- Mutation and review run as scripts you invoke, not as gates that hold a
  status.
- Nothing bounds the loop yet. A `Stop` hook that keeps agents working until a
  stage finishes comes in a later slice.
- `/ket:status` reads the item files. `create` writes `.ket/BOARD.md` once, and
  nothing rewrites it as an item moves.
- `ket watch` renders sample data instead of the event log.
- The optional integrations, among them Codecov, CodeQL, CodeRabbit, and
  Chromatic, have no question at create time yet.
- One preset ships, `cli`. Web, API, Desktop, and Mobile are still to come.

Licensed under the MIT license.
