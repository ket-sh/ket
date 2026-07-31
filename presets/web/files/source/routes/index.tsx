import { createFileRoute } from '@tanstack/react-router';

import { GreetingPanel } from '../../entities/greeting';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <main>
      <h1>ket</h1>
      <GreetingPanel who="world" />
    </main>
  );
}
