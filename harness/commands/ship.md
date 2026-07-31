---
description: Close an item once its pull request has merged
argument-hint: the item key
order: 6
---

Ship **$ARGUMENTS**, which means recording that its pull request merged.

Read the item first and show the user what they are closing: the title, the
kind, the size, and the pull request it went out on. This is the last of the
four human gates, so it is worth a sentence rather than a silent transition.

Ask plainly whether the pull request has merged. A machine can read a green
pipeline, and only the person watching the repository knows the work landed.
If they say no, stop and leave the item where it stands.

Then run:

```
ket item ship $ARGUMENTS
```

If it refuses, say why in the user's words. An item still verifying owes the
mutation gate first, and an item still implementing has not reached
`ket item verify` yet.

After it succeeds the item is `shipped` and governs nothing. The next
`/ket:continue` picks up whatever is in flight behind it.
