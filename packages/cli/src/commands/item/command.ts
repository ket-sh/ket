import type { PresetSemantics, RingCheck } from '@ket/preset';

import { defineCommand, showUsage } from 'citty';

import type { PlannedCheck } from '../../shared/checks.ts';
import type { Filing } from '../../shared/decompose.ts';
import type { Item, ItemKind, ItemSize } from '../../shared/item.ts';
import type { RingFailure } from '../../shared/ring.ts';
import type { Decision } from '../../shared/stage.ts';
import type { Transition } from '../../shared/transition.ts';

import { failuresAmong, localBinsOf } from '../../shared/checks.ts';
import { record } from '../../shared/event-log.ts';
import { semanticsOf } from '../../shared/governing.ts';
import { describing } from '../../shared/item-description.ts';
import { ITEM_KINDS, ITEM_SIZES, nextKey, promotedFrom, titleRefusal } from '../../shared/item.ts';
import { ketRootOrThrow } from '../../shared/locate.ts';
import { argvOf } from '../../shared/ring.ts';
import { byStatus, moveThrough, whileNothingElseWorks } from '../../shared/stage.ts';
import { promotionOf } from '../../shared/story-map/promotion.ts';
import { readMapIn } from '../../shared/story-map/reading.ts';
import {
  approvalOf,
  deliveryOf,
  designOf,
  reopeningOf,
  shipmentOf,
  submissionOf,
  verificationOf,
} from '../../shared/transition.ts';
import { awaitItem } from './await/command.ts';
import { blast } from './blast/command.ts';
import { describeItem } from './describe/command.ts';
import { note } from './note/command.ts';
import { drift, stamp } from './plain/command.ts';
import { fileAlone, fileUnder, itemsIn, keyOf } from './store.ts';
import { show } from './surface/command.ts';
import { closingSurface } from './surface/lifecycle.ts';

function oneOf<Known extends string>(known: readonly Known[], given: string): Known {
  const found = known.find((candidate) => candidate === given);

  if (found === undefined) {
    throw new Error(`${given} is not one of ${known.join(', ')}`);
  }

  return found;
}

async function storyPromotedIn(root: string, id: string | undefined): Promise<string | undefined> {
  if (id === undefined) {
    return undefined;
  }

  const promotion = promotionOf(await readMapIn(root), id);

  if ('refused' in promotion) {
    throw new Error(promotion.refused);
  }

  return promotion.story.id;
}

const file = defineCommand({
  meta: { name: 'file', description: 'File a triaged item' },
  args: {
    title: { type: 'string', required: true, description: 'What the work is' },
    kind: { type: 'string', required: true, description: 'feature, bug, refactor or chore' },
    size: { type: 'string', required: true, description: 'epic, story, subtask or trivial' },
    parent: { type: 'string', description: 'The epic or story this breaks out of' },
    story: { type: 'string', description: 'The story on the map this work comes from' },
    description: { type: 'string', description: 'The prose the issue-writing skill wrote' },
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

    const filing: Filing = {
      key: allocated,
      title: args.title,
      kind,
      size,
      ...promotedFrom(await storyPromotedIn(root, args.story)),
      ...describing(args.description),
    };

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

function stage(name: string, description: string, decide: Decision) {
  return defineCommand({
    meta: { name, description },
    args: {
      key: { type: 'positional', required: true, description: 'The item to move' },
    },
    async run({ args }) {
      const root = await ketRootOrThrow(process.cwd());
      const outcome = await moveThrough(root, args.key, name, decide);

      if ('refused' in outcome) {
        throw new Error(`${args.key} is ${outcome.refused}`);
      }

      process.stdout.write(`${args.key} ${outcome.moved}\n`);
    },
  });
}

function plannedOnProject(checks: RingCheck[], localBins: ReadonlySet<string>): PlannedCheck[] {
  return checks.map((check) => ({ runs: check.runs, argv: argvOf(check.runs, localBins) }));
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

    return move(
      item,
      await failuresAmong(root, plannedOnProject(checks(semantics), await localBinsOf(root))),
    );
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
    describe: describeItem,
    design,
    submit,
    approve,
    verify,
    deliver,
    reopen,
    ship,
    show,
    await: awaitItem,
    note,
    drift,
    stamp,
    blast,
  },
});

export async function usage(): Promise<void> {
  await showUsage(item);
}

export default item;
