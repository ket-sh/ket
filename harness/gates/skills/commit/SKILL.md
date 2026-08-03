---
name: commit
description: Use when writing a commit message. Terse, exact, conventional commits, and why over what.
---

# Commit messages

Conventional Commits. No fluff. Why over what, because the diff already says
what.

## Subject

`<type>(<scope>): <imperative summary>`, where scope is optional.

Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`,
`style`, `revert`.

Imperative mood: add, fix, remove. Not added, adds, adding. Fifty characters when
you can, seventy two at the outside. No trailing period. Match the project's
capitalization after the colon.

## Body

Skip it entirely when the subject is self-explanatory. Add one for a non-obvious
**why**, a breaking change, a migration note, or a linked issue. Wrap at seventy
two. Bullets are `-`.

Always include a body for a breaking change, a security fix, a data migration, or
anything reverting an earlier commit. Those are what a future debugger will be
reading.

## Never

- A subject that narrates the commit, or the words I, we, now and currently. The diff says what.
- "As requested by" anyone. Use a trailer.
- AI attribution, unless the project's own rule asks for a trailer.
- Emoji, unless the project already uses them.
- Restating the filename when the scope already said it.

## Split by subject

One commit per subject, not one commit per session. A reader looking for why a
particular decision was made should find it in the message beside it, and a
sweep-everything commit hides every reason but one.
