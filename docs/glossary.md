---
category: reference
---

# Glossary

One term lives in one place. Each entry names the approved forms, the variants nobody writes, and what the term means. `bun run docs:glossary` compiles this page into the Vale terminology rules and the cspell word list, and the docs gate fails when either output goes stale.

## Terms

Terms reach both prose gates. A row with a lowercase and a sentence-case form accepts both. A row with a lowercase and an uppercase form accepts any casing. A single form allows that casing alone.

| Term                         | Forbidden     | Definition                                                         |
| ---------------------------- | ------------- | ------------------------------------------------------------------ |
| `ACs`                        |               | Acceptance criteria on an item.                                    |
| `ADR`                        |               | An architecture decision record under `docs/adr/`.                 |
| `ADRs`                       |               | More than one architecture decision record.                        |
| `agentic`, `Agentic`         |               | Driven by AI agents.                                               |
| `allowlist`, `Allowlist`     |               | The list of what a gate lets through.                              |
| `api`, `API`                 |               | The surface one program offers another.                            |
| `autofix`, `Autofix`         |               | A fix a tool applies on its own.                                   |
| `AWS`                        |               | Amazon Web Services, a deployment target integrations name.        |
| `BDD`                        |               | Behavior-driven development.                                       |
| `brownfield`, `Brownfield`   |               | An existing project ket adopts.                                    |
| `Bun`                        |               | The runtime and package manager that runs everything here.         |
| `chai`, `Chai`               |               | The assertion library the acceptance steps use.                    |
| `CI`                         |               | The pipeline that runs the gates on every pull request.            |
| `citty`                      |               | The command line framework the cli builds on.                      |
| `clack`                      |               | The prompt library behind `ket create`.                            |
| `cli`, `CLI`                 |               | A command line interface, or the package that owns ket's commands. |
| `codebase`, `Codebase`       | `code base`   | The whole body of source under one roof.                           |
| `Codecov`                    |               | The coverage reporting service.                                    |
| `CodeRabbit`                 |               | The automated pull request reviewer.                               |
| `config`                     |               | A configuration, in file names and prose.                          |
| `configs`                    |               | More than one config.                                              |
| `cspell`, `Cspell`           |               | The spell gate over every file.                                    |
| `css`, `CSS`                 |               | The stylesheet language of the web preset.                         |
| `cucumber`, `Cucumber`       |               | The runner behind the acceptance features.                         |
| `dedup`, `Dedup`             |               | To remove duplicates.                                              |
| `deliverables`               |               | What a piece of work hands over.                                   |
| `depcruise`                  |               | The dependency-cruiser command behind the boundary gate.           |
| `disableable`                |               | Possible to switch off.                                            |
| `disambiguates`              |               | Removes an ambiguity.                                              |
| `dogfooding`                 |               | Using the product to build the product.                            |
| `enum`                       |               | An enumerated type.                                                |
| `failover`, `Failover`       | `fail-over`   | Shifting traffic to the next healthy target.                       |
| `fast-check`, `Fast-check`   |               | The property-based testing library.                                |
| `frontmatter`, `Frontmatter` |               | The metadata block a markdown page opens with.                     |
| `gherkin`, `Gherkin`         |               | The given, when, then language of feature files.                   |
| `gitleaks`, `Gitleaks`       |               | The secret scanner in the commit chain.                            |
| `glob`, `Glob`               |               | A path pattern with wildcards.                                     |
| `globs`                      |               | More than one glob.                                                |
| `greenfield`, `Greenfield`   |               | A project ket scaffolds from nothing.                              |
| `Grep`                       |               | The search tool the harness exposes.                               |
| `hardcode`                   |               | To fix a value in source instead of configuration.                 |
| `hotfixes`, `Hotfixes`       |               | Fixes that ship outside the normal train.                          |
| `jest`, `Jest`               |               | The test runner the presets leave behind.                          |
| `Jira`                       |               | The issue tracker an integration names.                            |
| `jscpd`, `Jscpd`             |               | The duplication gate at threshold zero.                            |
| `json`, `JSON`               |               | The data format the configuration files speak.                     |
| `ket`                        |               | The product itself, always lowercase.                              |
| `Keto`                       |               | The Ory permission service.                                        |
| `lefthook`, `Lefthook`       |               | The git hook runner behind every commit.                           |
| `linter`                     |               | A tool that flags rule violations in source.                       |
| `linting`                    |               | Running a linter.                                                  |
| `lockfile`                   |               | The file that pins dependency versions.                            |
| `lockfiles`, `Lockfiles`     |               | More than one lockfile.                                            |
| `misconfigured`              |               | Set up wrong.                                                      |
| `MIT`                        |               | The license this repository ships under.                           |
| `monorepo`, `Monorepo`       |               | One repository holding many packages.                              |
| `mutant`                     |               | One mutation the mutation gate injects.                            |
| `mutants`                    |               | More than one mutant.                                              |
| `namespace`                  |               | A named scope for identifiers.                                     |
| `npm`                        |               | The Node package registry.                                         |
| `OpenSSF`                    |               | The Open Source Security Foundation.                               |
| `OpenTUI`                    |               | The terminal rendering library under the tui package.              |
| `oplog`                      |               | The operation-log browser inside watch, fed by the event log.      |
| `Ory`                        |               | The identity stack an integration offers.                          |
| `oxfmt`                      |               | The formatter over every file kind here.                           |
| `oxfmtrc`                    |               | The oxfmt configuration file.                                      |
| `oxlint`                     |               | The linter with warnings denied.                                   |
| `oxlintrc`                   |               | The oxlint configuration file.                                     |
| `PGlite`                     |               | The embedded Postgres an integration offers.                       |
| `pnpm`                       |               | A package manager other ecosystems use.                            |
| `Postgres`                   |               | The relational database integrations name.                         |
| `PostToolUse`                |               | The harness hook moment after a tool call.                         |
| `pr`, `PR`                   |               | A pull request, the road every change takes into main.             |
| `pre-commit`, `Pre-commit`   | `pre commit`  | The hook moment before a commit lands.                             |
| `precompiled`                |               | Compiled ahead of use.                                             |
| `PreToolUse`                 |               | The harness hook moment before a tool call.                        |
| `probity`, `Probity`         |               | The gate that wants a failing test before a production edit.       |
| `qa`, `QA`                   |               | Quality assurance work and its artifacts.                          |
| `reachability`               |               | Whether analysis can reach a piece of code.                        |
| `rearchitecture`             |               | A rebuild of a system's structure.                                 |
| `reframes`                   |               | Presents something in a different frame.                           |
| `Renovate`                   |               | The dependency update service.                                     |
| `repo`                       |               | A repository.                                                      |
| `retunes`                    |               | Adjusts something to a different setting.                          |
| `round-robin`, `Round-robin` | `round robin` | Taking turns in a fixed cycle.                                     |
| `runtime`                    |               | The environment code runs in.                                      |
| `Scorecard`                  |               | The OpenSSF repository health check.                               |
| `stryker`, `Stryker`         |               | The mutation testing tool behind the central gate.                 |
| `subagent`, `Subagent`       | `sub-agent`   | A helper session the pipeline dispatches for one task.             |
| `subdirectory`               |               | A directory inside another.                                        |
| `subtask`                    |               | The item size below story.                                         |
| `subtasks`                   |               | More than one subtask.                                             |
| `TDD`                        |               | Test-driven development.                                           |
| `tdd-bdd`                    |               | The rules file naming the test discipline.                         |
| `tdd-implementer`            |               | The subagent that drives a failing test to green.                  |
| `testcontainers`             |               | The library that runs real services in tests.                      |
| `toolchain`                  |               | The set of tools a project builds with.                            |
| `tsarch`, `Tsarch`           |               | The architecture testing library for TypeScript.                   |
| `tsc`                        |               | The TypeScript compiler command.                                   |
| `tsconfig`                   |               | The TypeScript configuration file.                                 |
| `tsgolint`                   |               | The type-aware backend oxlint calls.                               |
| `tui`, `TUI`                 |               | The terminal user interface, or the package that draws it.         |
| `Turborepo`                  |               | The task runner over the workspace.                                |
| `typecheck`, `Typecheck`     | `type-check`  | A run of the compiler for types alone.                             |
| `ui`, `UI`                   |               | The user interface layer of an app.                                |
| `unfiled`, `Unfiled`         |               | Named by the story map, with no work item filed for it.            |
| `unscoped`                   |               | Without a declared scope.                                          |
| `usecase`                    |               | One way an actor uses the system.                                  |
| `vale`, `Vale`               |               | The prose gate over authored markdown.                             |
| `vitest`, `Vitest`           |               | The test runner every suite binds to.                              |
| `WASM`                       |               | The portable binary format browsers run.                           |
| `worktree`, `Worktree`       | `work-tree`   | One checked out branch beside the repository.                      |
| `worktrees`, `Worktrees`     |               | More than one worktree.                                            |
| `YAML`                       |               | The format the item and configuration files speak.                 |
| `Zed`                        |               | An editor with settings in this repository.                        |
| `zizmor`, `Zizmor`           |               | The workflow security linter.                                      |

## Words

Words reach the spell list alone. Vale has no opinion on them.

| Word              | Definition                                                                 |
| ----------------- | -------------------------------------------------------------------------- |
| `aaabbccccd`      | A duplication test fixture string.                                         |
| `actionlint`      | The GitHub Actions workflow linter.                                        |
| `anscribe`        | The package scope of the patched OpenTUI build.                            |
| `arrayify`        | Vocabulary the preset spell lists ship.                                    |
| `artipacked`      | A zizmor finding name the preset spell lists ship.                         |
| `autohide`        | A surface widget option name.                                              |
| `backoff`         | Waiting longer after each failed retry.                                    |
| `basenames`       | File names without their directories.                                      |
| `bchpt`           | Letters inside a gitleaks token pattern.                                   |
| `bddgen`          | The generator that binds feature files to the runner.                      |
| `bunfig`          | Bun's configuration file name.                                             |
| `bunx`            | Bun's package runner command.                                              |
| `capitalises`     | Writes with a capital first letter.                                        |
| `carriable`       | The pattern name for characters a project name may carry.                  |
| `catchable`       | A signal a process handler can intercept.                                  |
| `catppuccin`      | A terminal color theme.                                                    |
| `chpt`            | Letters inside a gitleaks token pattern.                                   |
| `chromatic`       | The visual review service the web preset wires.                            |
| `chromaui`        | The GitHub organization behind Chromatic.                                  |
| `codegen`         | Generating code from a source of truth.                                    |
| `COLORTERM`       | The environment variable naming terminal color support.                    |
| `conftest`        | The policy checker for configuration files.                                |
| `consola`         | The console logging library.                                               |
| `cucumberjs`      | The Cucumber runner for JavaScript.                                        |
| `cva`             | Vocabulary the preset spell lists ship.                                    |
| `Datree`          | A Kubernetes manifest checker.                                             |
| `diátaxis`        | The four-quadrant documentation framework behind the category frontmatter. |
| `diffview`        | An OpenTUI diff component name.                                            |
| `difit`           | The local diff viewer the surface embeds.                                  |
| `dmno`            | An env schema tool weighed beside varlock.                                 |
| `dogfood`         | To use your own product.                                                   |
| `dorny`           | The GitHub owner of the paths-filter action.                               |
| `dragstop`        | A surface drag event name.                                                 |
| `electricsql`     | A sync engine the preset spell lists ship.                                 |
| `esac`            | The shell keyword closing a case block.                                    |
| `everforest`      | A terminal color theme.                                                    |
| `faststart`       | A video flag in the hero page recipe.                                      |
| `fulfilment`      | A British spelling in a project key test fixture.                          |
| `ghostty`         | A terminal emulator.                                                       |
| `gitdir`          | The pointer line inside a worktree's git file.                             |
| `gpgsign`         | The git setting for signed commits.                                        |
| `greptile`        | An automated code review service.                                          |
| `gridstack`       | The grid layout library behind the surface.                                |
| `gsub`            | Letters inside a generated asset string.                                   |
| `kanagawa`        | A terminal color theme.                                                    |
| `Karpathy`        | The author of the coding guidelines skill.                                 |
| `keycap`          | One key label in the watch key bar.                                        |
| `knip`            | The dead export gate.                                                      |
| `kubeconform`     | The Kubernetes manifest validator.                                         |
| `labelledby`      | An accessibility attribute fragment.                                       |
| `lerp`            | Linear interpolation between two values.                                   |
| `libx`            | Letters of the video encoder in the hero recipe.                           |
| `Lingui`          | An internationalization library.                                           |
| `magick`          | The image conversion command name.                                         |
| `Menlo`           | A monospace font.                                                          |
| `Mobbin`          | The design reference library.                                              |
| `movflags`        | A video container flag in the hero recipe.                                 |
| `msw`             | The request mocking library for tests.                                     |
| `nizos`           | The npm scope probity ships under.                                         |
| `nofilter`        | A reporter mode in the Vale action.                                        |
| `nolint`          | The inline disable marker other linters use.                               |
| `nonword`         | A Vale rule token setting.                                                 |
| `nord`            | A terminal color theme.                                                    |
| `NOSYSTEM`        | Part of the git variable that ignores system configuration.                |
| `nsegmentless`    | An artifact of a generated word list string.                               |
| `nunasserted`     | An artifact of a generated word list string.                               |
| `oklch`           | The perceptual color space in the web preset's styles.                     |
| `openspec`        | A spec-driven change workflow tool.                                        |
| `opentui-spinner` | The spinner component's package name.                                      |
| `OSSF`            | Short for the Open Source Security Foundation.                             |
| `pilotty`         | The terminal automation harness the acceptance suite drives.               |
| `pipx`            | The Python application runner.                                             |
| `playwright`      | The browser automation library.                                            |
| `profoundlogic`   | An npm scope in the dependency tree.                                       |
| `qlty`            | A code quality service offered at create time.                             |
| `qltysh`          | The qlty service's domain name.                                            |
| `redescription`   | The result type of rewriting an item's description.                        |
| `renderable`      | Something OpenTUI can draw.                                                |
| `resizestart`     | A surface resize event name.                                               |
| `resizestop`      | A surface resize event name.                                               |
| `rhysd`           | The GitHub owner of actionlint.                                            |
| `sarif`           | The static analysis results format.                                        |
| `scrollbox`       | The OpenTUI scrolling container.                                           |
| `segmentless`     | Without a segment directory in a slice.                                    |
| `semgrep`         | The pattern-based static analysis scanner.                                 |
| `shadcn`          | A component library the web preset names.                                  |
| `shellcheck`      | The shell script linter.                                                   |
| `steiger`         | The Feature-Sliced Design linter.                                          |
| `subshell`        | A shell started inside another shell.                                      |
| `tanstack`        | The TanStack library family.                                               |
| `testid`          | The test id attribute fragment.                                            |
| `tflint`          | The Terraform linter.                                                      |
| `titleAlignment`  | An OpenTUI box option.                                                     |
| `Tricorder`       | Google's criteria for automated code checks.                               |
| `truecolor`       | Full 24-bit terminal color.                                                |
| `tsconfigs`       | More than one tsconfig.                                                    |
| `tuiparts`        | Vocabulary the preset spell lists ship.                                    |
| `unasserted`      | Executed by a test without a check on the outcome.                         |
| `uncollapsed`     | Not folded away.                                                           |
| `unlinted`        | Never run through the linter.                                              |
| `unlocks`         | Opens what a gate held.                                                    |
| `unrepresentable` | Impossible to express in the shape at hand.                                |
| `unreviewed`      | Never looked at by a reviewer.                                             |
| `unstub`          | To remove a test stub.                                                     |
| `urandom`         | The kernel's random byte source.                                           |
| `usecases`        | More than one usecase.                                                     |
| `varlock`         | The env schema tool the web preset wires.                                  |
| `veryslow`        | A video encoder preset name in the hero recipe.                            |
| `vtsls`           | A TypeScript language server name.                                         |
| `WCAG`            | The web accessibility guidelines.                                          |
| `webp`            | An image format.                                                           |
| `wordmark`        | The logo drawn as a word.                                                  |
| `xlink`           | A legacy link attribute namespace in vector images.                        |
