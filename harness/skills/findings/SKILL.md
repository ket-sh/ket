---
name: findings
description: Use when reporting a review finding, or when judging one two seats disagree about. What a finding has to prove before it counts, and how two reports join into one.
---

# A finding proves itself or it goes

A review that lists what might be wrong is a review nobody acts on. Every rule
here exists to make a finding carry its own evidence, so the person reading it
can act without repeating the work.

## Reproduce or drop

Run the commands that show the break. Put what they printed in the finding.

A claim you did not reproduce is dropped, however convincing it reads. This is
the whole rule, and it is the one that gets rationalized away first: a defect you
can describe but cannot demonstrate is a hypothesis about the code, and shipping
hypotheses as findings is how review output becomes noise.

Reproduction is a command and its output. Reading the code again is not
reproduction.

## Score it, then hold the bar

Score every finding for confidence from 0 to 100 and drop anything below 80.

Confidence is about the defect, not about your prose. A clearly written guess
scores low.

## What a finding carries

| Field            | What goes in it                                                       |
| ---------------- | --------------------------------------------------------------------- |
| location         | file and line, stable enough that another seat lands on the same spot |
| defect           | one sentence naming what is wrong                                     |
| failure scenario | the inputs, then the wrong output                                     |
| confidence       | 0 to 100                                                              |
| reproduced       | whether you ran it and watched it break                               |
| verdict          | `confirmed` or `dropped`                                              |
| reason           | why it survived, or why it did not                                    |
| severity         | `critical`, `high`, `medium` or `low`                                 |

Report every finding you evaluated, dropped ones included. A report holding only
survivors hides the disagreement the join exists to find.

## The key two reports join on

Two seats find the same defect and describe it differently. Key a finding on its
location and its defect, lowercased, with runs of whitespace collapsed to one
space. Findings sharing a key are one finding with two opinions.

Write the location the way the tools print it, so the keys land on each other.

## What is not a finding

Style the formatter owns. Duplication jscpd already counts. A preference about
how you would have written it. Those have gates or they have no claim behind
them.

## One seat never decides

A single reviewer agreeing with itself is not a second opinion. A finding counts
when a seat confirmed it and the other seat did not contradict it, or when the
judge settled the contradiction. Nothing else clears it.
