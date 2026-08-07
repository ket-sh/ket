# Review rules

`CLAUDE.md` at the repository root holds the law of this project, and greptile
indexes it already. Nothing here repeats it.

Read `CLAUDE.md` first, then the rule files it points at. A pull request that
breaks one of them is a finding, whatever else the diff gets right.

`config.json` beside this file carries the rules a reviewer can scope to a path
or switch off. Keep those there. Keep here only the prose a reviewer reads for
context, and add a rule only when review is the sole place it can land.
