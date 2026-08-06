# Turn-end reviewers read the dirty tree, not the branch history

Status: accepted
Date: 2026-08-06

> **TL;DR** Scopes both Stop-hook reviewers to uncommitted work only, deleting
> the marker state they could never write. Maintainer-authorized gate change.

## Context

Two reviewer hooks close every session turn: rules compliance and security.
Each kept a marker file holding the last cleanly reviewed commit, and reviewed
the whole branch diff whenever the marker was missing. A hook of the `agent` type holds read-only tools, so the reviewer could
never write its own marker. Every turn end reviewed the full branch, and one
review ran 42 minutes past its four minute ceiling. The ceiling itself fails open, so tightening it would starve
the review instead of bounding it. The maintainer authorized this change in
session on 2026-08-06.

## Decision drivers

- A turn end costs seconds, not minutes
- Committed work stays reviewed somewhere
- No state the reviewer can't maintain
- Ships identically to every scaffold

## Decision

Option: Review the dirty tree only
Verdicts: ++ | + | ++ | ++

Both reviewers now read staged, unstaged, and untracked work against `HEAD`,
and nothing else. Committed history leaves their scope: the pre-commit chain
and the pull request pipeline answer for it, which is why the second driver
reads a plus and not a double. The change deletes the marker files, the
merge-base fallback, and the marker-write step from `.claude/settings.json`
and from the harness twins every scaffold inherits.

## Alternatives

### Keep the marker, write it elsewhere

Verdicts: + | ++ | -- | ++

Incremental review over commit history, with a separate step writing the
marker the reviewer can't. The pass-or-fail verdict doesn't travel between hooks,
so the marker could advance over a failed review.

Cost: state that can disagree with the verdict it stands for.

### Review the whole branch every turn

Verdicts: -- | ++ | ++ | ++

The accidental status quo. Correct and stateless, and the reason one turn end
took 42 minutes.

Cost: minutes of opus per turn end, growing with the branch.

### Rework the reviewers as command hooks

Verdicts: + | ++ | + | +

A shell step calling the CLI headless could write markers and gets an
enforced timeout. The maintainer weighed it and chose the smaller cut: scope
over machinery.

Cost: a nested CLI invocation as a new moving part in every scaffold.

## Consequences

**Good**: a turn end costs what the dirty diff costs, usually seconds. No
dead state, nothing to seed in fresh worktrees, and the same shape ships to
scaffolds through the harness hooks.

**Bad**: work committed mid-turn leaves this hook's view, so the pre-commit
chain and the pull request pipeline carry that weight alone. The upstream
defect stands regardless: a hook of the `agent` type ran 42 minutes past `timeout: 240` on
CLI 2.1.223, and timeouts fail open. That report belongs upstream and this record isn't a workaround for it.
