---
category: reference
---

# Architecture skeleton

`bun run docs:architecture` writes this page from the dependency graph `lint:boundaries` already reads. Never edit it by hand: run the command and commit the result.

## packages/cli

### packages/cli commands/create

Depends on:

- [packages/cli shared](#packagescli-shared)
- [packages/cli shared/scaffold](#packagescli-sharedscaffold)
- [packages/preset root](#packagespreset-root)

### packages/cli commands/gate

Depends on:

- [packages/cli shared](#packagescli-shared)
- [packages/preset root](#packagespreset-root)

### packages/cli commands/item

Depends on:

- [packages/cli shared](#packagescli-shared)
- [packages/preset root](#packagespreset-root)

### packages/cli commands/map

Depends on:

- [packages/cli shared](#packagescli-shared)
- [packages/cli shared/story-map](#packagescli-sharedstory-map)
- [packages/tui root](#packagestui-root)

### packages/cli commands/retro

Depends on:

- [packages/cli shared](#packagescli-shared)
- [packages/preset root](#packagespreset-root)

### packages/cli commands/review

Depends on:

- [packages/cli shared](#packagescli-shared)

### packages/cli commands/turn

Depends on:

- [packages/cli shared](#packagescli-shared)

### packages/cli commands/update

Depends on:

- [packages/cli shared](#packagescli-shared)
- [packages/cli shared/scaffold](#packagescli-sharedscaffold)

### packages/cli commands/watch

Depends on:

- [packages/cli shared](#packagescli-shared)
- [packages/cli shared/story-map](#packagescli-sharedstory-map)
- [packages/tui root](#packagestui-root)

### packages/cli root

Depends on:

- [packages/cli commands/create](#packagescli-commandscreate)
- [packages/cli commands/gate](#packagescli-commandsgate)
- [packages/cli commands/item](#packagescli-commandsitem)
- [packages/cli commands/map](#packagescli-commandsmap)
- [packages/cli commands/retro](#packagescli-commandsretro)
- [packages/cli commands/review](#packagescli-commandsreview)
- [packages/cli commands/turn](#packagescli-commandsturn)
- [packages/cli commands/update](#packagescli-commandsupdate)
- [packages/cli commands/watch](#packagescli-commandswatch)
- [packages/cli shared](#packagescli-shared)

### packages/cli shared

Depends on:

- [packages/cli shared/scaffold](#packagescli-sharedscaffold)
- [packages/preset root](#packagespreset-root)
- [presets/cli root](#presetscli-root)
- [presets/web root](#presetsweb-root)

### packages/cli shared/scaffold

Depends on:

- [packages/cli shared](#packagescli-shared)
- [packages/preset root](#packagespreset-root)

### packages/cli shared/story-map

Depends on:

- [packages/cli shared](#packagescli-shared)

## packages/oxlint-plugin-ket

### packages/oxlint-plugin-ket root

Depends on nothing inside the workspace.

## packages/preset

### packages/preset root

Depends on nothing inside the workspace.

## packages/tui

### packages/tui app

Depends on:

- [packages/tui pages/map](#packagestui-pagesmap)
- [packages/tui pages/watch](#packagestui-pageswatch)
- [packages/tui shared/model](#packagestui-sharedmodel)

### packages/tui pages/map

Depends on:

- [packages/tui shared/model](#packagestui-sharedmodel)
- [packages/tui shared/theme](#packagestui-sharedtheme)
- [packages/tui widgets/story-map](#packagestui-widgetsstory-map)

### packages/tui pages/watch

Depends on:

- [packages/tui shared/lib](#packagestui-sharedlib)
- [packages/tui shared/model](#packagestui-sharedmodel)
- [packages/tui shared/theme](#packagestui-sharedtheme)
- [packages/tui shared/ui](#packagestui-sharedui)
- [packages/tui widgets/story-map](#packagestui-widgetsstory-map)

### packages/tui root

Depends on:

- [packages/tui app](#packagestui-app)
- [packages/tui pages/watch](#packagestui-pageswatch)
- [packages/tui shared/model](#packagestui-sharedmodel)

### packages/tui shared/lib

Depends on:

- [packages/tui shared/theme](#packagestui-sharedtheme)

### packages/tui shared/model

Depends on nothing inside the workspace.

### packages/tui shared/theme

Depends on nothing inside the workspace.

### packages/tui shared/ui

Depends on:

- [packages/tui shared/lib](#packagestui-sharedlib)
- [packages/tui shared/theme](#packagestui-sharedtheme)

### packages/tui widgets/story-map

Depends on:

- [packages/tui shared/lib](#packagestui-sharedlib)
- [packages/tui shared/model](#packagestui-sharedmodel)
- [packages/tui shared/theme](#packagestui-sharedtheme)

## presets/cli

### presets/cli root

Depends on:

- [packages/preset root](#packagespreset-root)

## presets/web

### presets/web root

Depends on:

- [packages/preset root](#packagespreset-root)
