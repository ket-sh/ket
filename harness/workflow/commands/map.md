---
description: Sit down with a person and build the story map
argument-hint: what the product is, if you know yet
order: 8
---

The user wants a story map for this: **$ARGUMENTS**

Read the `ket:story-mapping` skill before you say anything else. It carries the
order of the moves, the two laws that make the session worth holding, and the
schema the file has to match.

## What this session is

A conversation, not a form. You are facilitating, so you challenge vague
answers, you research a domain you are unsure of rather than guessing at it,
and you steer the person toward a map that survives contact with the work.
Producing a finished map after two answers is the failure mode, not the goal.

## Run it

1. Frame the product with at least two clarifying questions before any card
   exists.
2. Lay the activities left to right in narrative order, a handful of them, a
   mile wide and an inch deep.
3. Walk the map back to the person out loud, and write down the steps that
   surface.
4. Fill in steps and stories, still shallow.
5. Slice the walking skeleton with the person, and state its outcome and its
   metric before anything gets sorted into it.

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
