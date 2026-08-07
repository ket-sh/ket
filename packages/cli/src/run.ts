import { runCommand as runCittyCommand, showUsage } from 'citty';

import { commands, hidden, main, showUsageOf } from './main.ts';
import { homeArgv, usageRequest } from './shared/usage.ts';

function isKnownCommand(name: string): name is keyof typeof commands {
  return Object.hasOwn(commands, name);
}

function isHiddenCommand(name: string): name is keyof typeof hidden {
  return Object.hasOwn(hidden, name);
}

async function runHidden(argv: string[]): Promise<boolean> {
  const [name, ...rest] = argv;

  if (name === undefined || !isHiddenCommand(name)) {
    return false;
  }

  await runCittyCommand(await hidden[name](), { rawArgs: rest });

  return true;
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

  await showUsageOf(name);

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

export async function runMain(raw: string[] = process.argv.slice(2)): Promise<void> {
  const argv = homeArgv(raw, process.stdout.isTTY);

  try {
    if (await runHidden(argv)) {
      return;
    }

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
