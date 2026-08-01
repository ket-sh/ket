import { greeting } from '../model/greeting.ts';

function nameIn(answered: unknown): string | undefined {
  if (typeof answered !== 'object' || answered === null || !('name' in answered)) {
    return undefined;
  }

  const named: unknown = answered.name;

  return typeof named === 'string' ? named : undefined;
}

// The adapter reaches the network and the model decides what to say. Mutation
// skips this file, so what is worth testing is the two of them together.
export async function welcome(from: string): Promise<string> {
  const answered = await fetch(from);

  if (!answered.ok) {
    return greeting(undefined);
  }

  const body: unknown = await answered.json();

  return greeting(nameIn(body));
}
