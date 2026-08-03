import { createFileRoute } from '@tanstack/react-router';

import { WelcomeHeading } from '../../entities/welcome';
import { Badge } from '../../shared/ui/badge.tsx';
import { Button } from '../../shared/ui/button.tsx';

export const Route = createFileRoute('/')({ component: Home });

const PROJECT = '__PROJECT_NAME__';

function Home() {
  return (
    <div className="bg-canvas text-paper relative flex min-h-svh flex-col overflow-hidden bg-[url(/ket-bg-poster.webp)] bg-cover bg-center">
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        poster="/ket-bg-poster.webp"
        className="absolute inset-0 size-full object-cover motion-reduce:hidden"
      >
        <source src="/ket-bg.mp4" type="video/mp4" />
      </video>
      <div className="from-scrim/55 via-scrim/10 to-scrim/40 absolute inset-0 bg-linear-to-b" />

      <header className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <a className="font-mono text-xl font-medium tracking-wide" href="https://ket.sh">
          ket
        </a>
        <Button
          render={<a href="https://ket.sh/docs/presets/web">Read the docs</a>}
          variant="secondary"
          className="bg-scrim/90 text-paper hover:bg-scrim rounded-full"
        />
      </header>

      <main className="relative flex flex-1 flex-col items-center gap-4 px-6 pt-2 text-center sm:pt-4">
        <Badge variant="outline" className="border-paper/45 text-paper font-mono backdrop-blur-xs">
          ket web preset
        </Badge>
        <WelcomeHeading
          project={PROJECT}
          className="text-shadow-artwork text-5xl font-semibold tracking-tight sm:text-7xl"
        />
        <p className="text-shadow-artwork max-w-xl text-lg leading-relaxed text-balance">
          Your project is scaffolded and every quality rule already runs as a machine gate. Agents
          build; the gates hold.
        </p>
      </main>

      <footer className="relative flex flex-col items-center px-6 pb-10">
        <p className="bg-scrim/35 rounded-lg px-4 py-2 font-mono text-sm backdrop-blur-sm">
          Start your first feature in Claude Code with{' '}
          <code className="text-glow">/ket:feature &quot;your prompt&quot;</code>
        </p>
      </footer>
    </div>
  );
}
