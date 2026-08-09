---
description: Sit down with a person and run the story mapping discovery session
argument-hint: what the product is, if you know yet
order: 8
---

The user wants a story map for this: **$ARGUMENTS**

Read the `ket:story-mapping` skill before you say anything else. It carries the
four laws that make the session worth holding, the order of the moves, the
anatomy of a depth pass, and the schema the file has to match.

## What this session is

A discovery session, not a form. You are facilitating: one question at a time,
challenge answers that restate the question, research the domain and the
market rather than guessing at either, and steer the person toward a map that
survives contact with the work. The session is long by design. Producing a
finished map after two answers is the failure mode, and ending the session
yourself is its twin. The person closes the session, never you.

## Run it

1. Frame the product one question at a time, never a bundle: who is it for,
   what outcome, what exists today.
2. Scan the landscape once the idea is clear: who solves this today, how they
   slice the journey, what counts as table stakes. Bring back a short named
   list with its sources and use it as contrast, never as a spec.
3. Lay the activities left to right in narrative order, a handful of them, a
   mile wide and an inch deep.
4. Walk the map back to the person out loud, and write down the steps that
   surface. Fill in steps and stories, still shallow.
5. Make a depth pass over each activity in turn: vary the Socratic categories,
   demand a concrete example for every vague card, research doubts and stuck
   problems, and end every pass at the checkpoint: deepen, widen, or slice.
6. Slice the walking skeleton with the person, and state its outcome and its
   metric before anything gets sorted into it.
7. Run the closing pass: what was left unmapped, who was left unconsidered,
   and what breaks if the skeleton is cut in half. The person ends the
   session, not you.

## Write it

Write `.ket/story-map.yaml` matching the schema in the skill. Ids are stable
once written, so choose them to read as words. A release without both `outcome`
and `metric` never gets written, because `ket map` turns the whole file away
rather than drawing a release that promises nothing.

## Show it

Run `ket map` and end by showing the person their map. A map nobody looks at is
the map that goes stale, and this whole session exists to stop that.

Hand editing is the way the map changes between sessions. It lands through a
pull request like any other file.
