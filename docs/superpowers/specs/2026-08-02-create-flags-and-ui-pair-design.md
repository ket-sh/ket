# Create flags and the ui pair

Date: 2026-08-02. Status: approved. Extends the hero page spec, and lands on
the same branch and pull request.

## The create command obeys its flags

`ket create` opens the wizard whenever it finds a terminal, even when
`--preset` already answers the wizard's question. The rule becomes: a flag
that answers the question closes the wizard.

- A terminal with `--preset web` and a directory scaffolds without opening
  the wizard, exactly like a run without a terminal.
- A terminal with `--preset web` and no directory fails with the same error
  a run without a terminal gives: `ket create needs a directory`.
- A terminal without `--preset` keeps today's wizard.

The decision lives in one pure function, so the mutation gate can measure it.

## Every ui component ships its pair

Every ui component in a scaffolded project carries two siblings: a story and
a component test. The rule covers `src/shared/ui/` and every slice `ui/`
segment, and it reaches a component the shadcn registry wrote like any other.

The reference is `~/Projects/recompose`, with two deltas: the check is
absolute rather than diff-based, and it demands the pair rather than the
story alone.

- Storybook arrives in the web preset: `@storybook/tanstack-react` with the
  accessibility addon, a `.storybook/` pair of config files that load
  `src/app/styles.css`, and the `storybook` and `storybook:build` scripts.
  The first plan named `@storybook/react-vite`; verification against a real
  scaffold moved the design to the first-party TanStack framework, because
  the Start manifest plugin claims the client build under the generic one.
- Component tests run in the browser: a `component` Vitest project drives
  `src/**/*.browser.test.tsx` through the Playwright provider the scaffold
  already carries. The `test:component` script runs it, and the mutation
  scope stays as it is.
- The three shipped components, `button`, `badge`, and `welcome-heading`,
  gain their stories and their browser tests.
- A `lint:ui` gate holds the rule: a `.tsx` file under a `ui/` segment
  without both siblings fails the gate. The gate runs at commit and in CI,
  and it ships with no escape label. The suppression skill governs any
  exception.

## Out of scope

- Chromatic reading the Storybook build. The existing Playwright-based
  integration stays as it is.
- The torii banner in the CLI. That wish holds its own place in the queue.
- The recompose and reyz-web comparison list. That deliverable follows this
  work.
