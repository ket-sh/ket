import type { AdoptionEvent } from '../../shared/event.ts';
import type { DraftEvidence } from './draft.ts';
import type { RetroAction } from './fold.ts';

import { record } from '../../shared/event-log.ts';
import { itemsIn, keyOf, write } from '../../shared/item-store.ts';
import { nextKey } from '../../shared/item.ts';
import { readEvents } from '../../shared/log-lines.ts';
import { LOG_SCOPE } from './draft.ts';

export type ChosenDraft = { action: RetroAction } | { refused: string };

interface RecordedAdoption {
  gate: string;
  reason: string | undefined;
  item: string;
}

function adoptionsIn(log: string): RecordedAdoption[] {
  return readEvents(log).flatMap((event) =>
    event.adopted === undefined || event.item === undefined
      ? []
      : [{ gate: event.adopted, reason: event.reason, item: event.item }],
  );
}

function alreadyFiled(log: string, evidence: DraftEvidence): string | undefined {
  return adoptionsIn(log).find(
    (adoption) => adoption.gate === evidence.gate && adoption.reason === evidence.reason,
  )?.item;
}

function numberedAmong(actions: RetroAction[], asked: string): RetroAction | undefined {
  const number = Number(asked);

  return Number.isInteger(number) ? actions[number - 1] : undefined;
}

export function chosenDraft(log: string, actions: RetroAction[], asked: string): ChosenDraft {
  if (actions.length === 0) {
    return { refused: 'this window drafted nothing, so there is nothing to adopt' };
  }

  const action = numberedAmong(actions, asked);

  if (action === undefined) {
    const range = `1 to ${String(actions.length)}`;

    return { refused: `draft ${asked} is not one this retro drafted, and the drafts run ${range}` };
  }

  const filed = alreadyFiled(log, action.draft.evidence);

  if (filed === undefined) {
    return { action };
  }

  return {
    refused: `draft ${asked} already became ${filed}, so adopting it again would file the same work twice`,
  };
}

function momentsLineOf(evidence: DraftEvidence): string {
  return evidence.moments.length === 0
    ? 'moments: none the log holds'
    : `moments: ${evidence.moments.join(', ')}`;
}

function evidenceLinesOf(evidence: DraftEvidence): string[] {
  return [
    `gate: ${evidence.gate}`,
    ...(evidence.reason === undefined ? [] : [`reason: ${evidence.reason}`]),
    momentsLineOf(evidence),
    ...(evidence.items.length === 0 ? [] : [`items: ${evidence.items.join(', ')}`]),
  ];
}

function descriptionOf(action: RetroAction): string {
  const scoped = 'dormant' in action ? ['', LOG_SCOPE] : [];
  const lines = evidenceLinesOf(action.draft.evidence);

  return ['Adopted from a retro draft.', '', ...lines, ...scoped].join('\n');
}

function adoptionEventOf(action: RetroAction, key: string): AdoptionEvent {
  const { gate, reason } = action.draft.evidence;

  return { adopted: gate, ...(reason === undefined ? {} : { reason }), item: key };
}

export async function fileAdoption(root: string, action: RetroAction): Promise<string> {
  const key = nextKey(await keyOf(root), await itemsIn(root));

  await write(root, key, {
    title: action.draft.sentence,
    kind: 'chore',
    size: 'story',
    status: 'idea',
    parent: undefined,
    children: [],
    description: descriptionOf(action),
  });
  await record(root, { gate: 'transition', outcome: 'allowed', about: 'idea', item: key });
  await record(root, adoptionEventOf(action, key));

  return key;
}
