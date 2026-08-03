# The scaffold reviewer pair

Date: 2026-08-03. Status: approved. Own branch, own pull request.

## Why

The repository reviews its own turns twice: a rules reviewer reads changed
code against the project rules, and a security reviewer reads only for
danger. A scaffolded project gets neither, because the ket plugin's Stop
hook carries only the turn gate. The pair moves into the plugin, so every
scaffold inherits it.

## The shape

- Two reviewer definitions join the plugin's `agents/` directory, mirroring
  the repository's own pair, re-aimed at a scaffold: the rules reviewer
  reads the scaffold's `CLAUDE.md` and its skills for the rules it holds;
  the security reviewer reads only for secret handling, trust boundaries,
  injection surfaces, and unsafe patterns, and says it leaves the rules
  beat alone. Both report and never edit.
- Two entries of type `agent` join the plugin's Stop hooks beside the turn gate,
  each with its own tracking marker so neither eats the other's state.
- The response contract stands verified against the current hooks
  reference: a hook of type `agent` answers a yes-or-no decision as JSON, and the
  runtime maps that answer onto the decision schema. The `ok` and `reason`
  shape the repository already uses is that answer, so both the existing
  hooks and the new pair keep it. The earlier concern that the shape might
  not block closes here: the docs name the mapping, and the repository's own
  hook demonstrably blocked a turn this week.

## Out of scope

- Changing the repository's own reviewer pair.
- The turn gate and every other plugin hook.
