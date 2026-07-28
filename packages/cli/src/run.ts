import { runCommand as runCittyCommand, showUsage } from 'citty';

import { commands, main } from './main.ts';
import { usageRequest } from './shared/usage.ts';

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

async function showCommandUsage(argv: string[]): Promise<boolean> {
  const [name] = argv;

  if (name === undefined || !isKnownCommand(name)) {
    return false;
  }

  await showUsage(await commands[name]());

  return true;
}

async function showRequestedUsage(argv: string[]): Promise<boolean> {
  const request = usageRequest(argv);

  if (request === 'top-level') {
    await showUsage(main);

    return true;
  }

  return request === 'command' && showCommandUsage(argv);
}

function describeFailure(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export async function runMain(argv: string[] = process.argv.slice(2)): Promise<void> {
  try {
    if (await showRequestedUsage(argv)) {
      return;
    }

    await runCittyCommand(main, { rawArgs: argv });
  } catch (cause) {
    console.error(`ket: ${describeFailure(cause)}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  await runMain();
}
