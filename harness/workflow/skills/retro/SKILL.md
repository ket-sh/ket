---
name: retro
description: Use when a session reads a weekly retro or its drafts. How to enrich the numbered draft sentences with session context, and the contract that keeps evidence, numbers, and filing untouched.
---

# Enriching the retro drafts

`ket retro --json` carries the week as one JSON document. Each entry under
`actions` holds a draft: a stable number, a deterministic sentence, and the
evidence behind it (gate, reason, moments, item keys). The CLI wrote that
sentence from the log alone, so it names the friction without knowing why the
week went that way. The session does know. Enrichment is the step where that
knowledge sharpens the prose.

## The step

1. Run `ket retro --json` and read the drafts under `actions`.
2. Rewrite each draft sentence into a sharper recommendation using what the
   session holds: which skill the refusals kept hitting, what the item was
   trying to do, what a rule change would cost, what the team already tried.
3. Present both to the human, under the draft's number: the deterministic
   sentence first, the enriched recommendation beside it.
4. Leave the decision to the human. `ket retro adopt <n>` files draft n, and
   a terminal `ket retro` run ends with the same choice as a tour.

## The contract: prose only

Enrichment changes prose and nothing else.

- Never change the evidence. The gate, the reason, the moments, and the item
  keys come from the log, and the log is the authority.
- Never change the numbers. `adopt 1` has to name what the report printed
  first, however the sentence around it was reworded.
- Never file anything. Presenting is this skill's whole job; adoption belongs
  to the human, through the adopt command or the tour.
- Never claim more than the log holds. A gate run at commit time or in CI
  leaves no line in the log, so an enriched sentence may say the log never
  recorded a gate, and may not say the gate never ran.

A sharper sentence that moved a number, dropped an item key, or invented a
moment is not enrichment. It is a different retro, and nothing downstream can
trust it.

## What a good enrichment adds

The deterministic sentence says what happened. The enriched one says what to
do about it, in this project, this week.

| The CLI drafted                                                                                             | The session sharpens it into                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `` `write` refused 3 times: no failing test covers this edit; run `ket gate write` where the work starts `` | The three refusals all landed while decomposing K-4, before any spec existed. Start decomposition from the stages skill's describe step, so the failing spec exists before the first edit. |
| ``the log has never recorded `lint:dup`; examine whether the rule still earns its place``                   | `lint:dup` runs in the commit chain, so the log cannot see it. The rule still fires there; this draft is about visibility, not about removal.                                              |

Both columns reach the human. The left one is what `adopt` files, so the
evidence chain stays deterministic wherever the enrichment goes.
