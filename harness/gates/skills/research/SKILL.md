---
name: research
description: Use before answering any question about a library, a framework, an SDK, an API or a CLI. The order documentation arrives in, the two shapes context7 comes in, and what a finding has to carry to be checkable later.
---

# Where documentation comes from

## The order

1. **context7 first.** It reads the library's own sources and returns what
   they say today.
2. **The web second**, when context7 has no entry, returns too little, or the
   question is not a documentation question at all.
3. **Training data never, silently.** Memory is a starting hypothesis and not a
   finding. When both sources above are unreachable, say which one failed and
   answer with the claim marked unverified, so the next stage knows what it is
   holding.

The third line is the one that matters. A stale answer delivered confidently
costs more than no answer, because nothing downstream knows to check it.

## Ask even when you already know

Training data has a cutoff and libraries do not. The argument you remember was
renamed, the option you remember was removed, and the recommended shape moved
one release after the model stopped reading. "I know this library" is the
reason to check, not the reason to skip.

## Use the library's official name

`Next.js`, not the flattened lowercase form. Punctuation and capitalization are
how the index resolves a name, so a product whose name carries a dot or a domain
suffix keeps both. A wrong name returns a plausible neighbor rather than nothing,
and a neighbor's documentation reads exactly like an answer.

## Two shapes, and a shipped harness gets neither for free

Check your own tool list before you decide which one you are using.

### As an MCP server

The server exposes two tools, `resolve-library-id` and `get-library-docs`. The
prefix they appear under depends on how the server was registered, so match on
the tail of the name. Resolve first, then fetch. A subagent whose `tools` list
is written out sees them only when that list names them, so an agent under a
restricted list falls through to the CLI below.

### As a CLI

```
npx ctx7@latest library "<official name>" "<the whole question>"
npx ctx7@latest docs <libraryId> "<the whole question>"
```

- Run `library` first. Skip it only when the caller handed you an id already in
  `/org/project` form.
- Choose among the matches by exact name, then description relevance, then
  snippet count, then source reputation, then benchmark score. When none of them
  look right, the name or the question is wrong, so rephrase rather than
  settling for the closest row.
- Pass the whole question, not a keyword. A specific question retrieves a
  specific answer.
- Pin a version with `/org/project/version` when the project depends on one.
- Add `--research` to the `docs` call when the first answer was thin. It reads
  the source repositories and searches the web, and it costs more, which is why
  it is the second attempt rather than the first.
- Three commands per question is the ceiling. Past that the question is the
  problem.
- Never put a key, a token or a password in a query.

### When neither exists

Say so in one line and go to the web. **Do not install anything.** ket's harness
depends on no plugin and no CLI it did not ship, so context7 is reachable or it
is not, and the answer still has to arrive.

## A quota error is a message for the user

Quota exhaustion is not permission to fall back to memory. Report it, name
`npx ctx7@latest login` or the `CONTEXT7_API_KEY` variable as the fix, and let
the user decide whether to authenticate or to accept a web answer instead.

## What context7 is not for

It answers how this library does something. It does not answer which library to
choose, what the standard says, what the failure reports say, or anything about
this codebase. Those go to the web, and the codebase questions go to a reader
rather than a search.

Refactoring, business logic, a review and general programming have no
documentation to fetch. Do not spend a lookup on them.

## The installed source is the last resort

When the documentation is silent on a knob that matters, read the library's own
source under `node_modules`. It is the last stop and not the first: it answers
what this version does rather than what the project intends, so an answer found
there is pinned to a version and says so.

## When you build it yourself instead

A need that a maintained tool already owns gets the tool. When the research says
no tool fits, the finding is the evidence: which tool you evaluated and the
specific constraint that disqualified it. "It was quicker to write" is not a
finding.

ket forbids comments, so the evidence does not live beside the code. It goes in
`adr.md`, under the alternatives you rejected, where the next person deciding
whether to delete the bespoke version can read why it exists.

## Every finding carries its source

A claim leaving the agent that found it carries the source, or it is a guess
wearing a finding's clothes.

- From context7: the library id, plus the version when the lookup was pinned.
- From the web: the link and the publication date. Prefer official documentation
  over a blog post, and when only a blog post says it, say that in the same
  sentence.
- From memory: say so, and the reader decides what to do about it.

When sources disagree, report the disagreement. Picking one quietly hides the
part a reviewer needed.

## Record it so a later stage can check it

A citation nobody can re-run is decoration. Write the finding into the design
artifact that consumes it, beside the item in `.ket/items/<key>/`:

- A library or strategy choice goes in `adr.md`, under considered alternatives.
  Each alternative names what it costs and where that came from.
- A documented constraint that shapes a seam goes in `solution-design.md`,
  beside the module it constrains.

Record what makes the lookup repeatable, not only its conclusion: the library id
and the question for context7, the link and the date for the web. `qa` and
`reviewer` read those artifacts against the work, and a source they can fetch
again is the difference between checking a claim and believing it.
