import { cancel, confirm, isCancel, select, text } from '@clack/prompts';
import { homedir } from 'node:os';
import color from 'picocolors';

import type { Configuration, PresetName } from '../../shared/configuration.ts';

import { PRESET_NAMES } from '../../shared/configuration.ts';
import { directoryLabel } from './directory-label.ts';
import { refuseKey } from './key.ts';
import { refuseName } from './name.ts';
import { addTarget, refuseDirectory } from './targets.ts';

export type WizardOutcome = { configured: Configuration } | { cancelled: true };

const CANCELLED = { cancelled: true } as const;

export async function askName(under: string): Promise<string | symbol> {
  const shown = directoryLabel(under, homedir());

  return text({
    message: `What will your project be called?\n${color.gray('│')}  ${color.dim(shown)}`,
    placeholder: 'my-app',
    validate: (given) => refuseName(given ?? ''),
  });
}

async function askDirectory(gathered: Record<string, PresetName>): Promise<string | symbol> {
  return text({
    message: 'Which directory does this target cover?',
    placeholder: '.',
    defaultValue: '.',
    validate: (given) =>
      refuseDirectory(gathered, given === undefined || given === '' ? '.' : given),
  });
}

async function askPreset(): Promise<PresetName | symbol> {
  return select({
    message: 'Which preset governs it?',
    options: PRESET_NAMES.map((preset) => ({ value: preset, label: preset })),
  });
}

async function askKey(suggested: string | undefined): Promise<string | symbol> {
  return text({
    message: 'What key should item IDs carry?',
    placeholder: suggested ?? 'AUTH',
    ...(suggested === undefined ? {} : { defaultValue: suggested }),
    validate: (given) => refuseKey(given ?? '', suggested ?? ''),
  });
}

async function askOneTarget(
  gathered: Record<string, PresetName>,
): Promise<Record<string, PresetName> | symbol> {
  const directory = Object.keys(gathered).length === 0 ? '.' : await askDirectory(gathered);

  if (isCancel(directory)) {
    return directory;
  }

  const preset = await askPreset();

  if (isCancel(preset)) {
    return preset;
  }

  const outcome = addTarget(gathered, directory, preset);

  return 'added' in outcome ? outcome.added : gathered;
}

async function gatherTargets(): Promise<Record<string, PresetName> | symbol> {
  let gathered: Record<string, PresetName> = {};

  for (;;) {
    const withOneMore = await askOneTarget(gathered);

    if (isCancel(withOneMore)) {
      return withOneMore;
    }

    gathered = withOneMore;

    const another = await confirm({ message: 'Add another target?', initialValue: false });

    if (isCancel(another)) {
      return another;
    }

    if (!another) {
      return gathered;
    }
  }
}

export async function runWizard(suggestedKey: string | undefined): Promise<WizardOutcome> {
  const targets = await gatherTargets();

  if (isCancel(targets)) {
    cancel('Nothing was written.');

    return CANCELLED;
  }

  const key = await askKey(suggestedKey);

  if (isCancel(key)) {
    cancel('Nothing was written.');

    return CANCELLED;
  }

  return { configured: { key, targets } };
}
