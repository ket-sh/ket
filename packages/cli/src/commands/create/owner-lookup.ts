import { spawn } from 'node:child_process';

import { OWNER_ARGUMENTS, OWNER_BINARY, ownerIn, ownerSaid } from './owner.ts';

async function githubOwner(): Promise<string | undefined> {
  return new Promise((settle) => {
    const gh = spawn(OWNER_BINARY, OWNER_ARGUMENTS);
    let said = '';

    gh.stdout.on('data', (chunk: Buffer) => {
      said += chunk.toString();
    });

    // A child that cannot start emits `error` and then `close`, so `close`
    // answers for both. The listener stays because an unhandled `error` on an
    // emitter throws.
    gh.on('error', () => {});

    gh.on('close', (code) => {
      settle(ownerSaid(code, said));
    });
  });
}

export async function foundOwner(given: string | undefined): Promise<string | undefined> {
  return ownerIn(given ?? '') ?? githubOwner();
}
