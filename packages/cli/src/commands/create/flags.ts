import type { Configuration, PresetName } from '../../shared/configuration.ts';

import { presetNamed } from '../../shared/registry.ts';
import { chosenFrom, offeredIntegrations } from '../../shared/scaffold/integrations.ts';
import { refuseLanguage } from '../../shared/scaffold/language.ts';
import { presetFrom } from './preset.ts';
import { shadcnPresetFrom } from './shadcn.ts';

interface FlagChoices {
  preset: PresetName;
  integrations: string[];
  shadcnPreset: string | undefined;
}

function chosenFromFlags(
  named: string | undefined,
  asked: string | undefined,
  shadcn: string | undefined,
): FlagChoices {
  const chosen = presetFrom(asked);

  if ('refused' in chosen) {
    throw new Error(chosen.refused);
  }

  const outcome = chosenFrom(named, offeredIntegrations([chosen.preset]));

  if ('refused' in outcome) {
    throw new Error(outcome.refused);
  }

  const wanted = shadcnPresetFrom(shadcn, chosen.preset, presetNamed(chosen.preset)?.item);

  if ('refused' in wanted) {
    throw new Error(wanted.refused);
  }

  return { preset: chosen.preset, integrations: outcome.chosen, shadcnPreset: wanted.code };
}

export function configuredFromFlags(
  key: string | undefined,
  named: string | undefined,
  asked: string | undefined,
  shadcn: string | undefined,
  language: string,
  workflow: boolean,
): Configuration | undefined {
  const choices = chosenFromFlags(named, asked, shadcn);
  const refused = refuseLanguage(language);

  if (refused !== undefined) {
    throw new Error(refused);
  }

  return key === undefined
    ? undefined
    : {
        key,
        targets: { '.': choices.preset },
        integrations: choices.integrations,
        ...(choices.shadcnPreset === undefined ? {} : { shadcnPreset: choices.shadcnPreset }),
        language,
        workflow,
      };
}
