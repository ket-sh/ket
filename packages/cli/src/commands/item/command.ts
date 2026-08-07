import type { PresetSemantics, RingCheck } from '@ket/preset';

import { defineCommand, showUsage } from 'citty';

import type { PlannedCheck } from '../../shared/checks.ts';
import type { Filing } from '../../shared/decompose.ts';
import type { Item, ItemKind, ItemSize } from '../../shared/item.ts';
import type { RingFailure } from '../../shared/ring.ts';
import type { Transition } from '../../shared/transition.ts';

import { failuresAmong } from '../../shared/checks.ts';
import { record } from '../../shared/event-log.ts';
import { semanticsOf } from '../../shared/governing.ts';
import { readStored } from '../../shared/item-store.ts';
import { ITEM_KINDS, ITEM_SIZES, nextKey, titleRefusal } from '../../shared/item.ts';
import { ketRootOrThrow } from '../../shared/locate.ts';
import { inFlightFrom } from '../../shared/read-item.ts';
import { argvOf } from '../../shared/ring.ts';
import {
  approvalOf,
  deliveryOf,
  designOf,
  reopeningOf,
  shipmentOf,
  submissionOf,
  verificationOf,
} from '../../shared/transition.ts';
import { secondJobAmong } from '../../shared/write-gate.ts';
import { blast } from './blast/command.ts';
import { drift, stamp } from './plain/command.ts';
import { fileAlone, fileUnder, itemsIn, keyOf, read, write } from './store.ts';
import { show } from './surface/command.ts';
import { closingSurface } from './surface/lifecycle.ts';

function oneOf<Known extends string>(known: readonly Known[], given: string): Known {
  const found = known.find((candidate) => candidate === given);

  if (found === undefined) {
    throw new Error(`${given} is not one of ${known.join(', ')}`);
  }

  return found;
}

const file = defineCommand({
  meta: { name: 'file', description: 'File a triaged item' },
  args: {
    title: { type: 'string', required: true, description: 'What the work is' },
    kind: { type: 'string', required: true, description: 'feature, bug, refactor or chore' },
    size: { type: 'string', required: true, description: 'epic, story, subtask or trivial' },
    parent: { type: 'string', description: 'The epic or story this breaks out of' },
  },
  async run({ args }) {
    const root = await ketRootOrThrow(process.cwd());
    const allocated = nextKey(await keyOf(root), await itemsIn(root));

    const kind: ItemKind = oneOf(ITEM_KINDS, args.kind);
    const size: ItemSize = oneOf(ITEM_SIZES, args.size);
    const refused = titleRefusal(args.title);

    if (refused !== undefined) {
      throw new Error(`${args.title.split('\n')[0] ?? ''} is not a title: ${refused}`);
    }

    const filing: Filing = { key: allocated, title: args.title, kind, size };

    if (args.parent === undefined) {
      await fileAlone(root, filing);
    } else {
      await fileUnder(root, filing, args.parent);
    }

    await record(root, {
      gate: 'transition',
      outcome: 'allowed',
      about: 'triaged',
      item: allocated,
    });
    process.stdout.write(`${allocated}\n`);
  },
});

type Decision = (item: Item, root: string, key: string) => Promise<Transition>;

function stage(name: string, description: string, decide: Decision) {
  return defineCommand({
    meta: { name, description },
    args: {
      key: { type: 'positional', required: true, description: 'The item to move' },
    },
    async run({ args }) {
      const root = await ketRootOrThrow(process.cwd());
      const outcome = await decide(await read(root, args.key), root, args.key);

      if ('refused' in outcome) {
        await record(root, {
          gate: 'transition',
          outcome: 'refused',
          about: name,
          item: args.key,
          reason: outcome.refused,
        });

        throw new Error(`${args.key} is ${outcome.refused}`);
      }

      await write(root, args.key, outcome.moved);
      await record(root, {
        gate: 'transition',
        outcome: 'allowed',
        about: outcome.moved.status,
        item: args.key,
      });
      process.stdout.write(`${args.key} ${outcome.moved.status}\n`);
    },
  });
}

function byStatus(move: (item: Item) => Transition): Decision {
  return async (item) => Promise.resolve(move(item));
}

// Refusing here beats hearing it from the write gate one edit into the job.
function whileNothingElseWorks(move: (item: Item) => Transition): Decision {
  return async (item, root, key) => {
    const opened = move(item);

    if ('refused' in opened) {
      return opened;
    }

    const held = secondJobAmong(inFlightFrom(await readStored(root)), key);

    if (held !== undefined) {
      return {
        refused: `waiting its turn: ${held.key} is the job in hand, and one job means one branch`,
      };
    }

    return opened;
  };
}

function plannedOnProject(checks: RingCheck[]): PlannedCheck[] {
  return checks.map((check) => ({ runs: check.runs, argv: argvOf(check.runs) }));
}

// The checks a stage ends on belong to the preset that governs the project, so
// they are read where the project is known rather than where the stage is
// declared.
function afterRunning(
  checks: (semantics: PresetSemantics) => RingCheck[],
  move: (item: Item, failures: RingFailure[]) => Transition,
): Decision {
  return async (item, root) => {
    const semantics = await semanticsOf(root);

    if (semantics === undefined) {
      throw new Error(`no preset ket writes governs ${root}, so nothing says what to run`);
    }

    return move(item, await failuresAmong(root, plannedOnProject(checks(semantics))));
  };
}

const MUTATION_SCRIPT = 'test:mutation';

function mutationChecks(semantics: PresetSemantics): RingCheck[] {
  const runs = semantics.scripts[MUTATION_SCRIPT];

  if (runs === undefined) {
    throw new Error(
      `the preset declares no ${MUTATION_SCRIPT} script, so nothing measures the suite`,
    );
  }

  return [{ runs, scope: 'project' }];
}

const design = stage(
  'design',
  'Open the design stage on a triaged item',
  whileNothingElseWorks(designOf),
);

const submit = stage(
  'submit',
  'Hand a finished design to the person who approves it',
  byStatus(submissionOf),
);

const approve = stage(
  'approve',
  'Move an approved item to implementing',
  closingSurface(whileNothingElseWorks(approvalOf)),
);

const verify = stage(
  'verify',
  'Open verification once the project checks pass',
  afterRunning((semantics) => semantics.rings.two, verificationOf),
);

const deliver = stage(
  'deliver',
  'Hand verified work to the person who merges it',
  closingSurface(afterRunning(mutationChecks, deliveryOf)),
);

const ship = stage(
  'ship',
  'Record that the pull request merged',
  closingSurface(byStatus(shipmentOf)),
);

const reopen = stage('reopen', 'Send reviewed work back to implementing', byStatus(reopeningOf));

const item = defineCommand({
  meta: { name: 'item', description: 'Write the state a gate reads' },
  subCommands: {
    file,
    design,
    submit,
    approve,
    verify,
    deliver,
    reopen,
    ship,
    show,
    drift,
    stamp,
    blast,
  },
});

export async function usage(): Promise<void> {
  await showUsage(item);
}

export default item;
