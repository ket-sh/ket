# Base UI and the announced commands

Date: 2026-08-03. Status: approved. Fifth wave on the hero branch, same pull
request.

## The primitive base becomes Base UI

The scaffold's shadcn components ride Radix today because the registry's
default did. The user's standing choice is Base UI, and shadcn supports it
as a first-class base. The swap:

- `radix-ui` leaves the dependencies; `@base-ui/react` enters, pinned.
- `button.tsx` trades the Radix `Slot` and its `asChild` prop for Base UI's
  `useRender` hook and a `render` prop. The badge carries no primitive and
  stays as it is.
- The home page's docs button becomes `render={<a ...>}`. Stories and
  browser tests follow the new prop.
- `components.json` records the Base UI choice wherever the shadcn config
  expresses it, so `shadcn add` pulls Base variants from here on.

## The create output names what arrived

`ket create` closes with three steps today: enter the directory, install,
start the dev loop. The scaffold now ships more than a dev loop, and the
closing steps say so: when the scripts carry `storybook`, a step offers the
component gallery. The step list stays curated rather than exhaustive. The
gate table already names every gate.

## Out of scope

- Migrating any component the scaffold doesn't ship.
- A Base UI variant catalog beyond the two shipped components.
