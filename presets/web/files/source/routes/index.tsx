import { createFileRoute } from '@tanstack/react-router';

import { GreetingPanel } from '../../entities/greeting';
import { Badge } from '../../shared/ui/badge.tsx';
import { Button } from '../../shared/ui/button.tsx';

export const Route = createFileRoute('/')({ component: Home });

const PROJECT = '__PROJECT_NAME__';

const LAYERS = [
  {
    segment: 'model',
    answers: 'What the slice decides',
    guarded: 'unit, property and mutation',
    detail:
      'Pure, and the only part the mutation gate measures. A decision that drifts out of here drifts out of reach of the gate that checks it.',
  },
  {
    segment: 'api',
    answers: 'What it says to the outside',
    guarded: 'integration',
    detail:
      'The one place a boundary is crossed. Its tests compose the real slice and stub only the network, which is the single double the rules allow.',
  },
  {
    segment: 'ui',
    answers: 'What a person sees',
    guarded: 'scenario and accessibility',
    detail:
      'Answered for by a browser rather than a runner. Every scenario also asks axe whether a person could operate what it just rendered.',
  },
];

function Home() {
  return (
    <main className="bg-surface text-ink min-h-dvh">
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-16">
        <Badge variant="outline">A project under ket</Badge>

        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-balance">{PROJECT}</h1>

        <p className="text-ink-muted mt-5 max-w-prose text-lg leading-relaxed">
          Every layer below has one job and a gate that answers for it. Nothing here is switched off
          to reach green.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button>Start a feature</Button>
          <Button variant="outline">Read the standing law</Button>
        </div>
      </section>

      <section aria-labelledby="running" className="mx-auto max-w-3xl px-6 pb-16">
        <h2 id="running" className="text-ink-muted text-sm font-medium tracking-wide uppercase">
          A slice, running
        </h2>

        <div className="border-edge bg-surface-sunken mt-4 rounded-(--radius-panel) border p-6">
          <GreetingPanel who="world" className="text-2xl font-medium" />
          <p className="text-ink-muted mt-2 text-sm">
            Rendered by the greeting entity, decided by its model, and checked by every gate in the
            chain.
          </p>
        </div>
      </section>

      <section aria-labelledby="layers" className="mx-auto max-w-3xl px-6 pb-24">
        <h2 id="layers" className="text-ink-muted text-sm font-medium tracking-wide uppercase">
          Where a thing goes
        </h2>

        <ul className="mt-6 grid gap-8 sm:grid-cols-3">
          {LAYERS.map((layer) => (
            <li className="border-edge flex flex-col border-t pt-4" key={layer.segment}>
              <h3 className="font-mono text-sm font-semibold">{layer.segment}/</h3>
              <p className="mt-2 font-medium">{layer.answers}</p>
              <p className="text-ink-muted mt-2 grow text-sm leading-relaxed">{layer.detail}</p>
              <p className="text-ink-muted mt-3 pt-3 text-xs">Guarded by {layer.guarded}.</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
