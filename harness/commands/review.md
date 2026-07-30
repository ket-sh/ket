---
description: Review with two seats and a judge, and report only what reproduced
argument-hint: what to review, or nothing for the working tree
---

Review **$ARGUMENTS**. With no argument, review the working tree against its
merge base.

A model reviewing its own work agrees with itself, and a single reviewer
returning a ranked list of maybes is the shape that failure takes. The two seats
below and the judge between them exist to stop it.

Read the `findings` skill before you dispatch anything. Every seat holds to it,
and so does the join you run afterwards.

## 1. The two seats

| Seat                   | Model | Lens                                                                                |
| ---------------------- | ----- | ----------------------------------------------------------------------------------- |
| correctness-regression | opus  | broken logic, unhandled edges, data loss, behavior that diverges from stated intent |
| security-failure-modes | fable | unsafe input, injection, races, resource exhaustion, error paths that fail open     |

**The seats must differ in model and in lens.** Before dispatching, check both.
If you are about to run two seats sharing either, stop and say so instead of
running the review. A pair that agrees by construction is a self-review counted
twice, and it reports safety it never checked.

## 2. Dispatch them together

Send both in one message so they run at once, each as the `ket:reviewer` agent,
each with the model and the lens its row names. Tell each seat what is under
review and nothing about what the other seat is doing.

Ask each seat for every finding it evaluated, with location, defect, failure
scenario, confidence, whether it reproduced, verdict and reason.

## 3. Join the two reports

Key every finding on its location and its defect, lowercased with runs of
whitespace collapsed. Findings sharing a key are one finding with two opinions.

| The seats that saw it   | What happens to it                           |
| ----------------------- | -------------------------------------------- |
| Every seat confirmed it | it survives, if it reproduced at 80 or above |
| Every seat dropped it   | it is dropped, and you carry their reasons   |
| They disagree           | it goes to the judge                         |

A finding one seat never raised is not a disagreement. Only the other seat
raising it and dropping it makes it one.

Drop any confirmation that did not reproduce, or scored below 80, whatever the
seat called it. Say which of the two it failed.

## 4. Judge only what they dispute

Dispatch one judge per disputed finding, as the `ket:reviewer` agent on **fable
at maximum effort**. Give it the location, the defect, and what each seat ruled
with the reason behind it.

The judge reproduces the claim itself and rules `confirmed` or `dropped`. Its
ruling settles the group. A judge ruling confirmed without reproducing the claim
has settled nothing: drop the finding and record that the judge did not
reproduce it.

If a judge returns nothing, say the dispute went unsettled. Never resolve it
yourself, and never fall back to a seat's verdict.

## 5. Report what survived

Rank the survivors by severity. For each one give the location, the defect, the
failure scenario, and the commands that showed the break.

Then list what was dropped, one line each with its reason. A dropped finding is
evidence the review ran, so it belongs in the report rather than in the bin.

Close with the seats you ran and every judge you called. If nothing survived,
say so in one line and stop.

Change nothing while reviewing. Fixing what you found is the next job, and it
re-enters through the item that owns it.
