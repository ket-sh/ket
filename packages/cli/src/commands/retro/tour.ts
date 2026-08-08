import { cancel, confirm, isCancel } from '@clack/prompts';

import type { RetroAction } from './fold.ts';

import { adoptNumbered } from './adopt.ts';

export function isTerminal(): boolean {
  return process.stdout.isTTY && process.stdin.isTTY;
}

function adoptionLineOf(outcome: { filed: string } | { refused: string }, number: string): string {
  return 'filed' in outcome
    ? `${outcome.filed} filed from draft ${number}\n`
    : `${outcome.refused}\n`;
}

export async function runTour(root: string, actions: RetroAction[]): Promise<void> {
  for (const action of actions) {
    const number = String(action.draft.number);
    const wanted = await confirm({
      message: `Draft ${number}: ${action.draft.sentence}. Adopt it?`,
      initialValue: false,
    });

    if (isCancel(wanted)) {
      cancel('The remaining drafts stay behind.');

      return;
    }

    if (wanted) {
      process.stdout.write(adoptionLineOf(await adoptNumbered(root, actions, number), number));
    }
  }
}
