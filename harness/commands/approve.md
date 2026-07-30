---
description: Pass the human gate so implementation may begin
argument-hint: the item key
---

Approve **$ARGUMENTS** so work on it can start.

Read the item first and show the user what they are approving: the title, the
kind, the size, and any design artifacts written beside it. This is one of two
human gates in the whole pipeline, so it is worth a sentence rather than a
silent transition.

Then run:

```
ket item approve $ARGUMENTS
```

If it refuses, say why in the user's words. An item already implementing does
not need approving, and an idea has not been triaged yet.

After it succeeds, writes under a target's source path are allowed. probity
still requires a failing test before implementation code, and the gate still
refuses a trivial item touching an adapter.
