import { dependencyNamesOf, fileKindsOf } from '@ket/preset';
import { defineCommand } from 'citty';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ProposalEvent, ProposalReply } from './proposal.ts';

import { presetOf } from '../../shared/governing.ts';
import { ketRootFrom } from '../../shared/locate.ts';
import {
  arrivalsIn,
  decisionArrivalsIn,
  declaredIn,
  kindArrivalsIn,
  recordAdvised,
  seenUnder,
} from '../../shared/toolchain.ts';
import {
  adrTitlesUnder,
  KET_DIRECTORY,
  MANIFEST,
  readEnvelope,
  readJson,
  TOOLCHAIN,
} from './context.ts';
import { pathFrom } from './envelope.ts';
import { proposalEventFrom, proposalReply } from './proposal.ts';

// Each source carries rules and craft a project would otherwise keep by hand,
// and only what arrived since ket last looked is worth a proposal. The record
// is written when the gate answers, and never otherwise, so an arrival is put
// to a session once.
async function lookAtToolchain(
  envelope: unknown,
  event: ProposalEvent,
): Promise<ProposalReply | undefined> {
  const root = await ketRootFrom(process.cwd());

  if (root === undefined) {
    return undefined;
  }

  const governing = await presetOf(root);

  if (governing === undefined) {
    return undefined;
  }

  const record = join(root, KET_DIRECTORY, TOOLCHAIN);
  const held = await readJson(record);
  const seen = {
    dependencies: seenUnder(held, 'dependencies'),
    decisions: seenUnder(held, 'decisions'),
    kinds: seenUnder(held, 'kinds'),
  };
  const arrivals = {
    dependencies: arrivalsIn({
      declared: declaredIn(await readJson(join(root, MANIFEST))),
      shipped: dependencyNamesOf(governing),
      seen: seen.dependencies,
    }),
    decisions: decisionArrivalsIn({ titles: await adrTitlesUnder(root), seen: seen.decisions }),
    kinds: kindArrivalsIn({
      written: pathFrom(envelope),
      shipped: fileKindsOf(governing),
      seen: seen.kinds,
    }),
  };
  const reply = proposalReply(arrivals, event);

  if (reply === undefined) {
    return undefined;
  }

  await writeFile(
    record,
    recordAdvised({
      dependencies: [...seen.dependencies, ...arrivals.dependencies],
      decisions: [...seen.decisions, ...arrivals.decisions],
      kinds: [...seen.kinds, ...arrivals.kinds],
    }),
    'utf8',
  );

  return reply;
}

export const toolchain = defineCommand({
  meta: { name: 'toolchain', description: 'Name what arrived since ket last looked' },
  async run() {
    const envelope = await readEnvelope();
    const reply = await lookAtToolchain(envelope, proposalEventFrom(envelope));

    if (reply !== undefined) {
      process.stdout.write(JSON.stringify(reply));
    }
  },
});
