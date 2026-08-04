import { dependencyNamesOf } from '@ket/preset';
import { defineCommand } from 'citty';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ProposalEvent, ProposalReply } from './proposal.ts';

import { presetOf } from '../../shared/governing.ts';
import { ketRootFrom } from '../../shared/locate.ts';
import { arrivalsIn, declaredIn, recordToolchain, seenIn } from '../../shared/toolchain.ts';
import { KET_DIRECTORY, MANIFEST, readEnvelope, readJson, TOOLCHAIN } from './context.ts';
import { proposalEventFrom, proposalReply } from './proposal.ts';

// A dependency ket installed carries the checks ket already runs, so only what
// arrived after it is worth a proposal. The record is written when the gate
// answers, and never otherwise, so a name is put to a session once.
async function lookAtToolchain(event: ProposalEvent): Promise<ProposalReply | undefined> {
  const root = await ketRootFrom(process.cwd());

  if (root === undefined) {
    return undefined;
  }

  const governing = await presetOf(root);

  if (governing === undefined) {
    return undefined;
  }

  const record = join(root, KET_DIRECTORY, TOOLCHAIN);
  const seen = seenIn(await readJson(record));
  const arrivals = arrivalsIn({
    declared: declaredIn(await readJson(join(root, MANIFEST))),
    shipped: dependencyNamesOf(governing),
    seen,
  });
  const reply = proposalReply(arrivals, event);

  if (reply === undefined) {
    return undefined;
  }

  await writeFile(record, recordToolchain([...seen, ...arrivals]), 'utf8');

  return reply;
}

export const toolchain = defineCommand({
  meta: { name: 'toolchain', description: 'Name what arrived since ket last looked' },
  async run() {
    const reply = await lookAtToolchain(proposalEventFrom(await readEnvelope()));

    if (reply !== undefined) {
      process.stdout.write(JSON.stringify(reply));
    }
  },
});
