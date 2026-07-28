import { runCommand as runCittyCommand, runMain as runCittyMain } from 'citty';

import { commands, main } from './main.ts';

function isKnownCommand(name: string): name is keyof typeof commands {
  return Object.hasOwn(commands, name);
}

export async function runCommand(name: string, argv: string[] = []): Promise<unknown> {
  if (!isKnownCommand(name)) {
    const known = Object.keys(commands).join(', ');

    throw new Error(`unknown command ${name}. ket runs ${known}`);
  }

  const { result } = await runCittyCommand(main, { rawArgs: [name, ...argv] });

  return result;
}

export async function runMain(): Promise<void> {
  await runCittyMain(main);
}

if (import.meta.main) {
  await runMain();
}
