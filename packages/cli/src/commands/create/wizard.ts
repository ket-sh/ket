import type { OfferedCategory, PresetIntegration } from '@ket/preset';

import { cancel, confirm, isCancel, multiselect, select, text } from '@clack/prompts';
import { categoriesOffering } from '@ket/preset';
import { homedir } from 'node:os';
import color from 'picocolors';

import type { Configuration, PresetName } from '../../shared/configuration.ts';

import { registeredPresets } from '../../shared/registry.ts';
import { integrationsOffered } from '../../shared/scaffold/integrations.ts';
import { DEFAULT_LANGUAGE, refuseLanguage } from '../../shared/scaffold/language.ts';
import { drawWorkflow } from './announce.ts';
import { directoryLabel } from './directory-label.ts';
import { choicesFor, pickedNames, promptFor } from './integration-prompt.ts';
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
    message: 'Please select your project type',
    options: registeredPresets().map(({ name }) => ({ value: name, label: name })),
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

async function askLanguage(): Promise<string | symbol> {
  return text({
    message: 'Which language will your documentation speak?',
    placeholder: DEFAULT_LANGUAGE,
    defaultValue: DEFAULT_LANGUAGE,
    validate: (given) => (given === undefined || given === '' ? undefined : refuseLanguage(given)),
  });
}

async function askWorkflow(): Promise<boolean | symbol> {
  drawWorkflow();

  return confirm({
    message: 'Should ket drive your work through this pipeline?',
    initialValue: true,
  });
}

async function askSeveral(offered: OfferedCategory): Promise<string[] | symbol> {
  return multiselect({
    message: promptFor(offered),
    options: choicesFor(offered),
    required: false,
    initialValues: [],
  });
}

async function askOne(offered: OfferedCategory): Promise<string[] | symbol> {
  const picked = await select({ message: promptFor(offered), options: choicesFor(offered) });

  if (isCancel(picked)) {
    return picked;
  }

  return pickedNames(picked);
}

async function askCategory(offered: OfferedCategory): Promise<string[] | symbol> {
  return offered.admits === 'several' ? askSeveral(offered) : askOne(offered);
}

async function askIntegrations(offered: PresetIntegration[]): Promise<string[] | symbol> {
  const chosen: string[] = [];

  for (const category of categoriesOffering(offered)) {
    const answered = await askCategory(category);

    if (isCancel(answered)) {
      return answered;
    }

    chosen.push(...answered);
  }

  return chosen;
}

async function askedOrCancelled<Answer>(
  ask: () => Promise<Answer | symbol>,
): Promise<Answer | undefined> {
  const answer = await ask();

  if (isCancel(answer)) {
    cancel('Nothing was written.');

    return undefined;
  }

  return answer;
}

export async function runWizard(suggestedKey: string | undefined): Promise<WizardOutcome> {
  const preset = await askedOrCancelled(askPreset);

  if (preset === undefined) {
    return CANCELLED;
  }

  const integrations = await askedOrCancelled(async () =>
    askIntegrations(integrationsOffered(preset)),
  );

  if (integrations === undefined) {
    return CANCELLED;
  }

  return finishedWizard(suggestedKey, { [WHOLE_REPOSITORY]: preset }, integrations);
}

async function finishedWizard(
  suggestedKey: string | undefined,
  targets: Record<string, PresetName>,
  integrations: string[],
): Promise<WizardOutcome> {
  const language = await askedOrCancelled(askLanguage);

  if (language === undefined) {
    return CANCELLED;
  }

  const workflow = await askedOrCancelled(askWorkflow);

  if (workflow === undefined) {
    return CANCELLED;
  }

  return workflow
    ? keyedConfiguration(suggestedKey, targets, integrations, language)
    : keylessConfiguration(suggestedKey, targets, integrations, language);
}

function keylessConfiguration(
  suggestedKey: string | undefined,
  targets: Record<string, PresetName>,
  integrations: string[],
  language: string,
): WizardOutcome {
  return {
    configured: { key: suggestedKey ?? '', targets, integrations, language, workflow: false },
  };
}

async function keyedConfiguration(
  suggestedKey: string | undefined,
  targets: Record<string, PresetName>,
  integrations: string[],
  language: string,
): Promise<WizardOutcome> {
  const key = await askKey(suggestedKey);

  if (isCancel(key)) {
    cancel('Nothing was written.');

    return CANCELLED;
  }

  return { configured: { key, targets, integrations, language, workflow: true } };
}
