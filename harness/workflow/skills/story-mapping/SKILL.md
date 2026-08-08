---
name: story-mapping
description: Use when a project has an idea and no plan, when someone asks for a story map, a backbone, a release slice or a walking skeleton, and whenever `.ket/story-map.yaml` is about to be written. The order of the moves, the two laws that make the session worth holding, and the failure modes to steer away from.
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

## The two laws

Everything below is the order of the moves. These two are how the session is
run, and they matter more than the order.

### 1. Challenge, do not transcribe

A map built from whatever the person said first is a feature list wearing a
backbone. Push back before writing anything down.

- **"Everyone" names no user.** Who specifically, and what do they want that
  the others do not?
- **"Soon" states no outcome.** An outcome is something a person can do end to
  end. A metric is a number that moves when they do it.
- **A feature list describes no journey.** Login, dashboard and settings are a
  menu. Ask what the person is trying to get done, and the verbs arrive.
- **Make them defend the skeleton.** When they pick the first release, ask what
  breaks if you cut it in half. If nothing breaks, it was too big.

Four moves to keep in the register:

> You said the user is small businesses. Which one, the owner or the person on
> the counter? They want opposite things from this screen.

> That release is called the MVP and its outcome is to ship the basics. Say it
> as something a shopper does from one end to the other, or it is not a
> release, it is a wish.

> These are all nouns: catalog, cart, orders. Walk me through a Tuesday for
> this person instead, and I will write down the verbs.

> You want search in the first cut. Can a shopper buy a thing without it? Then
> it is not in the walking skeleton, and it goes in the band underneath.

Steer, and stay in the conversation. Producing a finished map after two answers
is the loudest way to fail here.

### 2. Research on the slightest doubt

The moment you are unsure how a domain actually works, an invite flow, a
checkout, an onboarding, a refund, stop guessing and go and find out. Search
for current best practice and for real examples of that exact thing, then come
back and steer with the evidence:

> The common shape for an invite flow is send, accept, then set a password,
> because the invited person is not an account until they accept. Do you want
> that, or do you have a reason to differ?

Use the `research` skill for this. It owns which source answers first, and what
a finding must carry to be checkable later. Where a project does not carry it,
plain web search stands in, and the finding still names its source.

Guessing a domain in front of the person is worse than asking. The map outlives
the session, and a wrong step in the backbone is copied into every release
under it.

## The moves, in order

1. **Frame first.** What this is, for whom, and why now. Never produce a map
   without asking at least two clarifying questions.
2. **Map the big picture.** Activities left to right in narrative order, a
   handful of them, mile wide and inch deep. Depth on the first pass is the
   documented way to lose the room.
3. **Walk the map back to the person.** Telling the story end to end is what
   surfaces the missing steps. Do it out loud, in their words.
4. **Fill in steps and stories** under each activity, still shallow.
5. **Slice the walking skeleton.** The smallest path that runs end to end
   becomes the first release. State its outcome and its metric before anything
   gets sorted into it.
6. **Write the file, run `ket map`, and show the person their map.**

## Guardrails

- A card is a verb phrase, never a noun.
- The map is not a flowchart, so branching what-ifs stay off it.
- A release without an outcome does not leave the session.
- The map of a whole product stays a mile wide.

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

When the session ends, run `ket map` and let the person see it. A map they have
not looked at is the map that goes stale.
