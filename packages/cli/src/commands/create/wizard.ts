import type { PresetIntegration } from '@ket/preset-cli';

import { cancel, isCancel, multiselect, select, text } from '@clack/prompts';
import { homedir } from 'node:os';
import color from 'picocolors';

import type { Configuration, PresetName } from '../../shared/configuration.ts';

import { PRESET_NAMES } from '../../shared/configuration.ts';
import { directoryLabel } from './directory-label.ts';
import { integrationsOffered } from './integrations.ts';
import { refuseKey } from './key.ts';
import { refuseName } from './name.ts';

export type WizardOutcome = { configured: Configuration } | { cancelled: true };

const CANCELLED = { cancelled: true } as const;

// One project, one target, and it covers the whole repository. A monorepo asks
// for several, and that is its own slice.
const WHOLE_REPOSITORY = '.';

export async function askName(under: string): Promise<string | symbol> {
  const shown = directoryLabel(under, homedir());

  return text({
    message: `What will your project be called?\n${color.gray('│')}  ${color.dim(shown)}`,
    placeholder: 'my-app',
    validate: (given) => refuseName(given ?? ''),
  });
}

async function askPreset(): Promise<PresetName | symbol> {
  return select({
    message: 'Which preset governs this project?',
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

async function askIntegrations(offered: PresetIntegration[]): Promise<string[] | symbol> {
  if (offered.length === 0) {
    return [];
  }

  return multiselect({
    message: 'Which of these should this project use? Space to pick, Enter for none.',
    options: offered.map((integration) => ({
      value: integration.name,
      label: integration.name,
      hint: integration.asks,
    })),
    required: false,
    initialValues: [],
  });
}

export async function runWizard(suggestedKey: string | undefined): Promise<WizardOutcome> {
  const preset = await askPreset();

  if (isCancel(preset)) {
    cancel('Nothing was written.');

    return CANCELLED;
  }

  const integrations = await askIntegrations(integrationsOffered(preset));

  if (isCancel(integrations)) {
    cancel('Nothing was written.');

    return CANCELLED;
  }

  const key = await askKey(suggestedKey);

  if (isCancel(key)) {
    cancel('Nothing was written.');

    return CANCELLED;
  }

  return { configured: { key, targets: { [WHOLE_REPOSITORY]: preset }, integrations } };
}
