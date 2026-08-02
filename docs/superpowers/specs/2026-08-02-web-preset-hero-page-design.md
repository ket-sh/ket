# Web preset hero page

Date: 2026-08-02. Status: approved.

## Why

The web preset scaffolds a home page, and that page is the first thing a person
sees after `ket create`. The page becomes a single viewport hero over the ket
torii artwork, built from the preset's own shadcn components. It keeps
standing as a running example of everything the preset provides: a sliced
entity, every test kind, tokens, and the gates.

## The page

`src/app/routes/index.tsx` renders the hero, and nothing else. Top to bottom:

- A header with the `ket` wordmark on the left, linking to
  [ket.sh](https://ket.sh), and a "Read the docs" button on the right, linking
  to [the web preset docs](https://ket.sh/docs/presets/web). The button is the
  shared shadcn `Button` rendered as an anchor through `asChild`.
- A centered main region: a "ket web preset" `Badge`, an `h1` that reads
  "Welcome to `__PROJECT_NAME__`." rendered through the welcome entity, and one
  intro sentence about the scaffold and its gates.
- A footer hint: start the first feature in Claude Code with
  `/ket:feature "your prompt"`, with the command as code.

The backdrop is the torii artwork: a short video loop (`autoplay`, `muted`,
`loop`, `playsinline`, hidden from assistive tech) over a poster image, with
the canvas token as the paint while media loads. A scrim gradient keeps the
text readable at the top and bottom edges. Reduced motion hides the video and
leaves the poster. The torii emoji rides `__root.tsx` as an SVG data URI
favicon.

The layers section and the `GreetingPanel` from the old page leave. The page
reads the same in light and dark, because the artwork does.

## The welcome entity

The `greeting` entity becomes the `welcome` entity, and the hero runs through
it, so the scaffold keeps a working slice on screen:

- `model/` holds the pure decision: a function that turns a project name into
  the headline, trims what it gets, and falls back when the name is blank.
  Unit tests carry the cases an author thinks of, a fast-check property
  carries the rest, and the mutation gate measures both.
- `api/` keeps the fetch-and-compose example: reach the network, hand the
  answer to the model, and return what it decides. Its integration test stubs
  the network alone.
- `ui/` renders the headline with a test id the scenario reads.

`features/welcome.feature` replaces `greeting.feature`: a visitor opens the
home page, the page welcomes them by the project's name, and the page stays
operable by anyone. The accessibility step keeps running axe.

## Tokens and fonts

Four art-anchored tokens join `src/app/styles.css`, re-expressed in oklch from
the mock's values:

| Token  | Decision it names                 | Mock value |
| ------ | --------------------------------- | ---------- |
| paper  | text over the artwork             | `#fff7ef`  |
| scrim  | the dark veil behind that text    | `#16130f`  |
| glow   | the code accent inside the hint   | `#ffd9a8`  |
| canvas | the paint while the artwork loads | `#e8794f`  |

The neutral token set and the shadcn bridge from the earlier work stay as they
are.

Fonts ship as dependencies rather than as a request to a font host:
`@fontsource-variable/google-sans-flex` for the sans and
`@fontsource-variable/google-sans-code` for the mono, imported in
`styles.css` and exposed as the `--font-sans` and `--font-mono` theme tokens.
Both fonts carry the Open Font License.

## Binary files ride the pipeline

The artwork lives in the repository as real files:
`presets/web/files/source/hero/ket-bg.mp4`, re-encoded to about 0.6 MB, and
`presets/web/files/source/hero/ket-bg-poster.webp`, recompressed to about
0.36 MB. The scaffold copies them to `public/ket-bg.mp4` and
`public/ket-bg-poster.webp`, where the page references them by path.

The CLI compiles to a single executable, so shipped bytes travel inside the
generated contents module rather than beside the binary. The pipeline learns
one new thing: a shipped file is either text or bytes.

- `@ket/preset` gains a second constructor beside `writes()` that marks a
  binary file. `shippedFilesOf` reads a binary file as base64, and the
  generated module keeps its `Record<string, string>` shape.
- `@ket/cli` carries the encoding on `ScaffoldFile`. Binary contents skip
  project-name substitution, and `writeFiles` decodes and writes bytes.
- A property test holds the invariant that bytes survive the round trip
  unchanged.

## Out of scope

- A shadcn harness skill. That idea is a separate job.
- Any change to the CLI preset or to the neutral tokens.

## Test surface

- Model: unit, property, and mutation.
- Adapter: integration with the network stubbed.
- Browser: the rewritten scenario plus the axe step.
- Pipeline: unit and property tests for the binary lane, hermetic under
  temporary directories.
