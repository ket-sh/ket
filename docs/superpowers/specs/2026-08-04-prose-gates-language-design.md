# Prose gates for any language

Date: 2026-08-04. Status: approved. Own branch, own pull request.

## Why

Every scaffold ships Vale and cspell, and both arrive locked to English:
the Microsoft base style encodes English grammar and terminology, and the
default cspell dictionary is English. Whoever writes documentation in
another language meets noise on every sentence, and Turkish raised the
case. A gate that's pure noise ends up off, which collides with the
suppression principle every scaffold inherits: never switch a gate off.
Deleting both from the presets fails the other way, because whoever
writes English keeps a gate that works. So the documentation language
becomes a create-time choice, and the prose gates follow it in three
layers.

## The scope split

- What ket writes into a scaffold and authors in English stays fully
  gated in every scaffold, whatever the language: the scaffold
  `CLAUDE.md` keeps the whole Microsoft package. The installed skills
  already sit outside both gates as prompts a model reads, and they stay
  there.
- The project's own prose follows the language choice: the documentation
  beside its code and the item artifacts under `.ket/items/`. Vale
  config scoping and cspell overrides carry the split.
- Today's baseline, for the record: the shipped `.vale.ini` already
  exempts `.ket/**`, `.agents/**`, and `.claude/skills/**`, while cspell
  reads everything outside its ignore list, item artifacts included. The
  split lands in two files: the Vale config decides which style set
  governs which markdown, and the cspell config decides which dictionary
  answers where.

## Create learns the language

- The wizard gains one question after the integrations: the language the
  project writes its documentation in, as a language tag, and the
  default stays `en`. Headless runs pass `--language`, and the default
  stays English there too.
- English keeps today's full package, byte for byte.
- Any other language lands the core Vale config instead: the Microsoft
  style keeps governing `CLAUDE.md` and stops governing everything else.
- cspell stays on the project's prose only when a usable dictionary for
  the chosen language exists. The scaffold then imports it, checks
  markdown against English plus the chosen language, and pins the
  dictionary package in the manifest. Without a dictionary, cspell skips
  the project's markdown and keeps checking `CLAUDE.md` and the code.
- The choice lands in `.ket/config.ts` beside the workflow choice, so
  the gates and any later tool can read it.

## The dictionary answer for the motivating case

- A community Turkish dictionary exists, and it holds up:
  `@cspell/dict-tr-tr`, published by the streetsidesoftware
  `cspell-dicts` repository, at 3.0.6 under an MIT license today.
- It loads through an import of `@cspell/dict-tr-tr/cspell-ext.json` and
  a `language` setting naming `tr`. It needs cspell 8 or later, and
  scaffolds pin `cspell@10.0.1`.
- A local probe against cspell 10 on 2026-08-04 confirmed the gate
  bites: correct Turkish with its diacritics passes, a word stripped of
  them fails, and an English `CLAUDE.md` beside it stays gated.
- Sources: the
  [dictionary catalog](https://github.com/streetsidesoftware/cspell-dicts/blob/main/dictionaries.md),
  the
  [Turkish package README](https://github.com/streetsidesoftware/cspell-dicts/blob/main/dictionaries/tr_TR/README.md),
  and the
  [npm registry entry](https://www.npmjs.com/package/@cspell/dict-tr-tr).

## The core that survives

- The ket house rules stay on the project's prose in every language. The
  Microsoft layer is what a non-English choice turns off, never Vale
  itself.
- `NoEmDash` matches a character, not a language. `Terminology` guards
  technical vocabulary that keeps its Latin script in any language's
  prose. Both stay on everywhere.
- `Intensifiers` and `WeakOpeners` match English words, so they turn off
  with the Microsoft layer and return wherever English governs.
- Vale applies a later matching section as an override, so one config
  carries both scopes: `[*.md]` holds the core, and `[CLAUDE.md]`
  restores the full English package. A probe confirmed both directions.

## Out of scope

- Migrating existing scaffolds. Adopting the language choice there is a
  hand edit to `.vale.ini` and `cspell.json`.
- ket's own repository. It writes English and keeps the full package.
- Translating anything ket authors. `CLAUDE.md` and the installed skills
  stay English in every scaffold.
- Changing the language after create. That's the same hand edit, and
  the wizard isn't a migration tool.
- A second documentation language in one project. One project, one
  documentation language.
