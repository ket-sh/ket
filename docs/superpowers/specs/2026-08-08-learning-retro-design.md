# Learning retro design

The event log becomes a feedback loop. Retro stops at naming friction today. This wave makes it draft the fix and makes adopting that fix one command. The project learns its own friction, and a human stays the gate.

## Rulings

The maintainer settled four questions before this spec:

1. Of the AI-native directions, the learning project comes first: the log the gates already write is the training signal, not a new surface.
2. The first deliverable is retro action drafts, built on the refusal clusters and dormant-gate arms retro already computes.
3. Authorship has two layers. ket writes a deterministic core draft from cluster evidence and a template sentence. The harness retro skill enriches that draft in session, where the session holds context ket lacks. The CLI is useful alone and sharper inside the harness.
4. Adoption is both a command and a tour: `ket retro adopt <n>` files a draft from any script or session, and a terminal run of `ket retro` ends with an interactive pass over the drafts, adopt or skip, built on the same filing path.

## Drafts

- Retro computes its actions today (refusal cluster, dormant gate). Each action now carries a draft: a stable number, a template sentence naming the evidence ("the write gate refused 3 edits in decompose for missing specs; examine the stages skill's describe step"), and the evidence itself (event moments, gate, reason, items).
- Drafts are deterministic: same log, same drafts, same numbers. Numbering follows the report's action order, so `adopt 1` names what the report printed first.
- The report prints drafts under their actions. `ket retro --json` carries them structured, which is what the harness skill and any session read.
- The harness retro skill gains an enrichment step: read the JSON drafts, rewrite each sentence with session context into a sharper recommendation, and present both to the human. Enrichment never changes the evidence or the numbers; it changes prose only.

## Adoption

- `ket retro adopt <n>` files draft n as an item through the normal pipeline: status `idea`, title from the draft sentence, description carrying the evidence chain (moments, gate, reason, item keys) so the item explains itself without the log. The filing appends the usual item events; nothing bypasses a gate.
- Adopting the same draft twice refuses, naming the item the first adoption filed. An unknown number refuses naming the range.
- A terminal `ket retro` run ends with the tour: each draft in order, adopt or skip, through the exact same filing path the command uses. A non-terminal run (piped, `--json`, CI) never prompts.
- The adoption itself lands in the event log, so a later retro can see which drafts became work and which stayed behind.

## Honest limits

- Drafts speak only from what the log holds. The dormant copy's scope sentence applies unchanged: a gate run at commit time or in CI leaves no line, so no draft can cite it.
- The deterministic sentence is a template, not judgement. The judgement layers are the harness skill's enrichment and the human's adopt or skip.

## Out of scope

- Skill-diff proposals (`ket learn` mapping refusal patterns to skill file sections): the boldest arm, its own wave after drafts prove the loop.
- Live pattern guards in watch ("third time this week"): visible-friction work, queued behind adoption data.
- Any model call from the ket CLI. The CLI stays deterministic; agents stay in the harness.

## Slices

1. Drafts in the fold and the report: deterministic template sentences with evidence, stable numbers, `--json` carriage.
2. `ket retro adopt <n>`: filing with the evidence chain, double-adopt and unknown-number refusals, adoption events in the log.
3. The interactive tour on terminal runs, on the same filing path.
4. The harness retro skill's enrichment step, prose-only by contract.
