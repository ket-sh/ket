---
category: explanation
---

# Architecture intent

The [skeleton](skeleton.md) draws the containers, the components, and the edges between them. This page says why the lines sit where they sit. Every claim links a skeleton node by anchor, and the docs gate fails the day a linked node disappears.

## Commands are islands

Each command under [packages/cli](skeleton.md#packagescli) owns its slice and never reaches a sibling command. Whatever two commands both need lives in [packages/cli shared](skeleton.md#packagescli-shared), and shared never reaches back up into a command. The entry in [packages/cli root](skeleton.md#packagescli-root) wires the commands together and sees nothing past each command's front door.

## The cli draws no terminal

Command logic stays out of component trees. Only the two watching commands, [packages/cli commands/watch](skeleton.md#packagescli-commandswatch) and [packages/cli commands/map](skeleton.md#packagescli-commandsmap), reach [packages/tui root](skeleton.md#packagestui-root), and they reach it through the package's published entry alone. The renderer never parses an argument.

## The preset definition knows no preset

[packages/preset root](skeleton.md#packagespreset-root) says what a preset is. It never reaches [presets/cli root](skeleton.md#presetscli-root) or [presets/web root](skeleton.md#presetsweb-root), because tying the definition to one instance would hand the next preset a dependency on the cli. The arrows run the other way: each preset depends down on the definition.

## The tui slices by feature

[packages/tui](skeleton.md#packagestui) follows Feature-Sliced Design. Pages such as [packages/tui pages/watch](skeleton.md#packagestui-pageswatch) compose widgets and shared segments, [packages/tui shared/theme](skeleton.md#packagestui-sharedtheme) owns every color, and lower layers never import upward. steiger enforces the layering on every commit.

## One package stands alone

[packages/oxlint-plugin-ket root](skeleton.md#packagesoxlint-plugin-ket-root) depends on nothing inside the workspace, so the linter can load it without dragging the product behind it.
