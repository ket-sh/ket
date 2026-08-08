# Docs discipline design

One wave gives ket's documentation the same treatment its code already gets. It brings a generated architecture picture that can't drift and a rot gate that names the page a change left behind. One vocabulary source feeds both prose gates, and a watch screen shows documentation health beside the board.

## Rulings

The maintainer settled four questions before this spec:

1. The architecture document is a generated skeleton with a human layer. A generator derives the skeleton from the code on every pull request. People write intent and rationale in a separate layer. Nobody edits the generated part by hand, and the gate turns red only when the skeleton and the code disagree with each other.
2. The watch docs screen carries both halves in one screen: a catalog with health on the left, a detail pane for the chosen page or architecture node on the right. If implementation shows the screen is too large for one slice, the plan splits it, not the design.
3. Rot detection uses source fingerprints, not dates. A page names its sources; the gate turns red when those sources changed and the stamp didn't.
4. The glossary is one committed file compiled into two outputs: Vale terminology rules and the cspell accept list. Manual synchronization between the two prose gates ends.

## The architecture document

- `docs/architecture/` holds the document. The generator writes `skeleton.md`: the workspace packages, their modules at the segment level, and the dependency edges between them, rendered as a C4-style container and component listing. The generator reads the dependency graph from dependency-cruiser, which the repository already runs for `lint:boundaries`; no second graph extractor enters the toolchain.
- `intent.md` is the human layer. It explains why the boundaries sit where they sit and links into the skeleton by anchor. The gate never judges its prose, only its anchors: an anchor pointing at a skeleton node that no longer exists turns the gate red.
- The generator runs in CI on every pull request and diffs its output against the committed `skeleton.md`. A difference means the code moved and the document didn't: the check fails and its message carries the diff. Refreshing the skeleton is one command, `bun run docs:architecture`.

## Rot fingerprints

- Every page under `docs/` except ADRs carries frontmatter: a `sources` list of globs naming what the page describes, and a `stamp` hash over the current content of those sources.
- The gate recomputes each page's hash on every pull request. When a pull request changes a page's sources without renewing the stamp, the check fails and names the page and the sources that moved. Renewing is deliberate: reread the page, update what the change made stale, run `bun run docs:stamp <page>`.
- A page with no `sources` list is exempt and the catalog shows it as unpinned, so exemption is visible rather than silent.
- ADRs are records of decisions at a point in time. They don't rot and carry no fingerprint.

## Glossary

- `docs/glossary.md` holds one entry per term: the approved form, forbidden variants, and a one-line definition.
- `bun run docs:glossary` compiles it into the Vale substitution and capitalization rules under `.vale/styles/` and into the project words file cspell reads. Both outputs live in the repository, and CI fails when a compile is stale, the same shape as the skeleton check.
- The existing hand-kept vocabulary migrates into the glossary in this wave, so the day it lands there is exactly one place a term lives.

## The watch docs screen

- A new top-level watch screen beside the board, reached the same way the other screens advertise themselves in the key bar.
- Left: the catalog. Pages grouped by Diátaxis category (tutorial, how-to, reference, explanation) read from required frontmatter, with ADRs as their own group. Each row shows the page's rot state: red when sources moved past the stamp, unpinned when exempt, quiet otherwise.
- Right: the detail pane for the chosen row. For a page: its category, sources, stamp state, and the pull request that last touched it, read the same way the journey pane reads provenance today. For an architecture node: its edges and the intent anchors that point at it.
- The screen proves itself the way the rest of watch does: state vocabulary and colors come from the shared theme, and everything that reaches the screen gets looked at through the browser in both schemes before it lands.

## Gates by moment

| Moment       | Check                | Red means                                             |
| ------------ | -------------------- | ----------------------------------------------------- |
| Pull request | skeleton diff        | the code moved, the architecture document didn't      |
| Pull request | intent anchors       | intent points at a node that no longer exists         |
| Pull request | rot stamps           | a changed source left its page behind                 |
| Pull request | glossary compile     | Vale or cspell outputs are stale against the glossary |
| Pull request | Diátaxis frontmatter | a docs page declares no category                      |

All five are hard gates. The standing gate rules apply: nobody weakens one, and fixing the document is the way through.

## Out of scope

- Generating prose from code. The generator draws structure only; every sentence stays human.
- Multi-repository documentation, parked with the story-map's multi-repo question.
- Publishing the docs outside the repository.

## Slices

1. Skeleton generator and its diff gate, plus the committed first `skeleton.md` and `intent.md`.
2. Rot fingerprints: frontmatter schema, stamp command, gate, and the migration that stamps the existing pages.
3. Glossary compile: file format, the two outputs, migration of the current vocabulary, gate.
4. The watch docs screen, catalog and detail pane together, browser-checked in both schemes.
