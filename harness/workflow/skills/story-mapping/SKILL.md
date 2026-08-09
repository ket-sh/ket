---
name: story-mapping
description: Use when a project has an idea and no plan, when someone asks for a story map, a backbone, a release slice or a walking skeleton, and whenever `.ket/story-map.yaml` is about to be written. The four laws that make the session a discovery rather than a form, the order of the moves, the anatomy of a depth pass, and the failure modes to steer away from.
---

# Building a story map with a person

Jeff Patton's method turns an idea into a walkable model: the journey across
the top, the work beneath it, releases as horizontal cuts. Every account of the
method failing tells the same story. The map got built in a workshop, it got
photographed, and nobody opened it again.

ket answers that with a file. The map lands in `.ket/story-map.yaml`, it
arrives through a pull request like any other change, and `ket map` draws it in
the terminal. That is the whole point of the session: the map that cannot go
stale.

The session is long by design. It runs the whole journey a mile wide first,
then returns for a deliberate depth pass over every activity, and it ends when
the person says it ends. A finished map after two answers is the loudest way
to fail here, and a session that closes itself is the second loudest.

## The four laws

Everything below is the order of the moves. These four are how the session is
run, and they matter more than the order.

### 1. One question at a time

A bundle of questions reads as a form, and a person hands a form back filled
with the first thing that fits. One question, then the answer, is what makes
the next question worth asking.

- **Never stack.** "Who is it for, what does success look like, and what
  exists today?" is three questions, and the person answers the easiest one.
  Ask them one at a time, in that order if you like, but one at a time.
- **Echo and sharpen.** Say the last answer back and cut it finer: "You said
  teams share the board. Does share mean edit together, or look at the same
  thing?"
- **A thin answer is not a finished answer.** Hold the question open rather
  than answering it yourself, offering candidate answers before the person has
  spoken, or moving on because the reply was short.
- **Cap the drilling.** Three probes into the same card, then offer the
  checkpoint. Depth that turns into interrogation loses the person as surely
  as shallowness loses the map.

### 2. Challenge, do not transcribe

A map built from whatever the person said first is a feature list wearing a
backbone. Push back before writing anything down.

- **"Everyone" names no user.** Who specifically, and what do they want that
  the others do not?
- **"Soon" states no outcome.** An outcome is something a person can do end to
  end. A metric is a number that moves when they do it.
- **A feature list describes no journey.** Login, dashboard and settings are a
  menu. Ask what the person is trying to get done, and the verbs arrive.
- **An answer that restates the question moved nothing.** "The checkout should
  be fast" answers "what does a good checkout look like" with the question's
  own words. Ask for the rule underneath and one concrete example of it going
  well.
- **Make them defend the skeleton.** When they pick the first release, ask what
  breaks if you cut it in half. If nothing breaks, it was too big.

Five moves to keep in the register:

> You said the user is small businesses. Which one, the owner or the person on
> the counter? They want opposite things from this screen.

> That release is called the MVP and its outcome is to ship the basics. Say it
> as something a shopper does from one end to the other, or it is not a
> release, it is a wish.

> These are all nouns: catalog, cart, orders. Walk me through a Tuesday for
> this person instead, and I will write down the verbs.

> A fast checkout is the checkout being fast, and we are where we started.
> Tell me about the one time a shopper got through in under a minute. What did
> they not have to do?

> You want search in the first cut. Can a shopper buy a thing without it? Then
> it is not in the walking skeleton, and it goes in the band underneath.

Steer, and stay in the conversation. Producing a finished map after two answers
is the loudest way to fail here.

### 3. Research, and take a position

Never guess in front of the person, and never stay a question machine while
the person is stuck. Research enters this session at three moments, and every
finding comes back with its source named out loud.

- **The landscape scan** runs once, the moment the idea is understood and
  before the backbone goes up. Move two carries it.
- **A domain doubt** stops the guessing. The moment you are unsure how a
  domain actually works, an invite flow, a checkout, an onboarding, a refund,
  go and find out. Bring back two or three named patterns and offer them as
  probes, not prescriptions:

  > The common shape for an invite flow is send, accept, then set a password,
  > because the invited person is not an account until they accept. Do you
  > want that, or do you have a reason to differ?

- **A stuck problem** deserves more than another question. When the session
  hits a problem the product has to solve and the person is searching for the
  answer, research candidate solutions and construct a position: two or three
  candidates with their trade-offs, then the one you would pick and why. Put
  it on the table for the person to accept, reshape, or reject. The proposal
  is an artifact to probe like any other answer, and the person's decision is
  what lands on the map.

Use the `research` skill for this. It owns which source answers first, and what
a finding must carry to be checkable later. Where a project does not carry it,
plain web search stands in, and the finding still names its source.

Guessing a domain in front of the person is worse than asking. The map outlives
the session, and a wrong step in the backbone is copied into every release
under it.

### 4. The person closes the session

A facilitator who declares the map finished has taken the one decision that
was never theirs. The session runs as long as the person wants it to run.

- After every depth pass, offer the checkpoint out loud: deepen this activity,
  widen the map, or slice releases. The checkpoint is the one place a menu
  belongs, because it steers the session rather than answering a discovery
  question.
- Ending goes through the closing pass, and the closing pass ends with the
  person saying done. "We could stop here, or go back in. Your call."
- When the person says deepen, go back in without complaint. The session has
  no clock the person did not set.

## The moves, in order

1. **Frame first.** What this is, for whom, what outcome, and what exists
   today. One question at a time, and no card exists until the frame holds.
   Sort what the person knows firsthand from what they are guessing at: a
   guess marks a place to research, never a fact to map.
2. **Scan the landscape.** The moment the idea is understood, search the web
   for who solves this today. How do they slice the journey, what has become
   table stakes, what would set this product apart, and which words has the
   domain already settled on? Bring back a short named landscape, three to
   five rivals or patterns with one line each and their sources, and use it as
   contrast: "X does this with one shared link. Is that your first release or
   your third?" The scan sharpens the backbone and later the slices. It never
   dictates either.
3. **Map the big picture.** Activities left to right in narrative order, a
   handful of them, mile wide and inch deep. Depth on the first pass is the
   documented way to lose the room, so park every detail that surfaces here
   for the depth passes.
4. **Walk the map back to the person.** Telling the story end to end is what
   surfaces the missing steps. Do it out loud, in their words.
5. **Fill in steps and stories** under each activity, still shallow. The wide
   pass ends when the person agrees the journey reads whole from end to end.
6. **Go deep, one activity at a time.** The longest part of the session, and
   the part the map is held to. The next section carries the anatomy of a
   pass. Every activity gets one, and every pass ends at the checkpoint.
7. **Slice the walking skeleton.** The smallest path that runs end to end
   becomes the first release. State its outcome and its metric before anything
   gets sorted into it, and hold the cut against the scan: a step every rival
   treats as table stakes either lands early or gets a stated reason to wait.
8. **Run the closing pass.** Three questions, out loud. What did we not map,
   and the open questions from the depth passes get read back here. Who was
   left unconsidered, the user the map never names. Which slice is the walking
   skeleton, and what breaks if it is cut in half? Then hand the session over:
   done, or back in. Only the person closes it.
9. **Write the file, run `ket map`, and show the person their map.**

## The depth pass

The wide pass bought coverage, and this is the inch of depth coming due. Take
the activities one at a time, name the one under the glass so the person knows
where the session stands, and work it with the moves below until the
checkpoint.

**Vary the Socratic categories.** Six of them, named so they get rotated. A
pass that leans on one category reads as a script, so vary them, and never
fire two at once.

- _Clarification_: "You said approve. Who clicks it, and what do they see
  after?"
- _Assumptions_: "This step assumes the guest already has an account. What
  happens when they do not?"
- _Evidence_: "What have you seen that says people abandon at this point?"
- _Viewpoints_: "The admin loves this step. What does the person on the
  receiving end of it feel?"
- _Implications_: "If refunds stay manual, what does the first busy weekend
  look like?"
- _The question itself_: "We keep asking how to notify people. Should we be
  asking whether anyone wants this notification at all?"

**Example-map the vague cards.** A card everyone nods at and nobody can
describe is hiding its rules. Ask for the rule behind the card, then one
concrete example of the rule in action, told like an anecdote: "the one where
the customer pays twice and support refunds one." What nobody in the session
can answer becomes an open question, written down rather than debated. A card
that cannot produce a single concrete example is not a story yet. It is a
question wearing a story's clothes, and it goes on the list the closing pass
reads back.

**Research when the pass outruns the room.** A domain doubt calls for named
patterns offered as probes. A problem the person is searching an answer for
calls for candidates and a position. Law three carries both shapes, and both
come back with their sources named.

**Close every pass at the checkpoint.** Deepen, widen, or slice: this activity
has more in it, or a missing activity surfaced and the backbone wants it, or
the depth is enough and releases are next. The person picks. Picking for them
is how a session finishes too fast.

## Guardrails

- A card is a verb phrase, never a noun.
- The map is not a flowchart, so branching what-ifs stay off it.
- A release without an outcome does not leave the session.
- The map of a whole product stays a mile wide. Depth lives in the passes, not
  in extra rows.
- Rivals from the scan are contrast, never a spec to copy.
- An open question gets written down, never settled by the facilitator on the
  person's behalf.

## The file

One product, one map, one home: `.ket/story-map.yaml`.

```yaml
version: 1
product:
  name: shop
  idea: one sentence saying what this is and for whom
users:
  - id: u-shopper
    name: shopper
releases:
  - id: r-skeleton
    name: walking skeleton
    outcome: a shopper completes one real purchase end to end
    metric: one paid order lands in the ledger
activities:
  - id: a-buy
    name: buy a thing
    steps:
      - id: s-browse
        name: browse the catalog
        stories:
          - id: st-see-products
            name: see what is for sale
            user: u-shopper
            release: r-skeleton
```

- `activities`, `steps` and `stories` are the backbone and its ribs. An
  activity and a step are verb phrases, because nouns turn the map into a
  feature list.
- `releases` is an ordered list, and a story points at one through a scalar
  `release`. A story with no `release` sits in the unassigned bucket, which is
  a normal place to be and not an error.
- A release carries `outcome` and `metric`, always.
- Every node carries a stable id. Ids never change once written, because the
  event log and later work point at them.
- Array order is the order. No rank fields, so a reorder reads as a coherent
  diff.
- `users` is optional, and so is a story's `user`.

## The refusal contract

`ket map` reads the file and refuses rather than guessing, and each refusal
names the node: a release with no `outcome` or no `metric`, an id that appears
twice, a `release` or `user` reference that resolves to nothing. Write a
release without an outcome and the reader turns the whole map away, so do not
write one. That is the schema enforcing the method's best documented failure
mode instead of warning about it.

When the person has closed the session, run `ket map` and let them see it. A
map they have not looked at is the map that goes stale.
