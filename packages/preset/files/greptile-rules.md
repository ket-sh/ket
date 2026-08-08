# Review rules

`CLAUDE.md` at the repository root holds the law of this project, and greptile
indexes it already. Nothing here repeats it.

Read `CLAUDE.md` first, then the rule files it points at. A pull request that
breaks one of them is a finding, whatever else the diff gets right.

`config.json` beside this file sets how strict the review runs and which kinds
of comment it posts. A rule belongs there only when a reviewer has to scope it
to a path or switch it off. A rule belongs here only when review is the sole
place it can land. Everything else stays in `CLAUDE.md`, where every reader
finds it.
