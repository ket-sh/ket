---
name: design-tokens
description: Use before writing a color, a spacing or a radius into a component, and before adding a token. What a token is for here, and the three questions a new one has to answer.
---

# Tokens, as this project means them

A token names a decision. A hex value names nothing, so a screen built from hex
values has no decisions in it, only outcomes. When the decision changes, every
outcome has to be found by hand.

`src/app/styles.css` holds them, under `@theme`, and Tailwind reads them there.
`bg-surface` is a token. `bg-[#fafafa]` is an outcome that escaped.

## The three layers

**Primitive.** A raw value with no opinion: `oklch(0.55 0.18 265)`. It belongs
in the token file and nowhere else. A component never names one.

**Semantic.** What the value is for: `--color-surface`, `--color-ink`,
`--color-edge`. This is the layer a component reaches for. A reader of
`text-ink-muted` knows what it means without opening the palette.

**Component.** What one thing needs and nothing else does: `--color-button-bg`.
Add one only when a component genuinely diverges. Two components sharing a
component token means the token was semantic all along.

## Before adding a token

**Does an existing one already mean this?** `--color-edge` and
`--color-border-subtle` are one decision written twice. Reach for the one that
exists, or rename it so both readings fit.

**Is it a decision or a measurement?** `--color-accent` is a decision. A
one-off `--space-13` is a measurement, and it belongs in the component that
measured it.

**Does it survive the other theme?** Every semantic token is declared again
under `prefers-color-scheme: dark`. A token with no answer there is a token that
only works in the light, and the page it builds breaks for half its readers.

## Where a value may still appear

Inside the token file, and inside a component that genuinely computes one: a
transform, a gradient stop, an animation offset. Anywhere else, a raw value is
a token nobody wrote down.

## Contrast is not a preference

A color pair that fails WCAG contrast fails the browser gate, because axe reads
the rendered page. Pick the token that passes rather than the one that looks
right on your monitor. The gate is the arbiter.

## The component library

`shadcn add` writes into `src/shared/ui/`, and those components are yours the
moment they land. They arrive on their own defaults, so the first job after
adding one is to point it at the tokens above. A component still carrying
`bg-primary` from the registry is a component the design system does not reach.
