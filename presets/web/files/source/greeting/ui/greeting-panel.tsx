import { greeting } from '../model/greeting.ts';

export function GreetingPanel({ who }: { who?: string }) {
  return <p data-testid="greeting">{greeting(who)}</p>;
}
