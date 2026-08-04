import type { PresetItem } from '@ket/preset';

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
interface Sections {
  dependencies: string[];
  decisions: string[];
  kinds: string[];
}

interface Advised {
  seen: Sections;
  arrivals: Sections;
}

async function advisedArrivals(
  root: string,
  governing: PresetItem,
  envelope: unknown,
): Promise<Advised> {
  const held = await readJson(join(root, KET_DIRECTORY, TOOLCHAIN));
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

  return { seen, arrivals };
}

function withArrivalsRecorded(advised: Advised): Sections {
  return {
    dependencies: [...advised.seen.dependencies, ...advised.arrivals.dependencies],
    decisions: [...advised.seen.decisions, ...advised.arrivals.decisions],
    kinds: [...advised.seen.kinds, ...advised.arrivals.kinds],
  };
}

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

  const advised = await advisedArrivals(root, governing, envelope);
  const reply = proposalReply(advised.arrivals, event);

  if (reply === undefined) {
    return undefined;
  }

  await writeFile(
    join(root, KET_DIRECTORY, TOOLCHAIN),
    recordAdvised(withArrivalsRecorded(advised)),
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
