import type { PresetIntegration } from '@ket/preset';

import { CLI_PRESET, contentOf } from '@ket/preset-cli';

import type { PresetName } from '../../shared/configuration.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';

import { pathInProject } from './install.ts';

const OFFERED: Partial<Record<PresetName, PresetIntegration[]>> = {
  cli: CLI_PRESET.integrations,
};

export function integrationsOffered(preset: PresetName): PresetIntegration[] {
  return OFFERED[preset] ?? [];
}

function chosenIn(preset: PresetName, chosen: string[]): PresetIntegration[] {
  return integrationsOffered(preset).filter((offered) => chosen.includes(offered.name));
}

export type ChosenIntegrations = { chosen: string[] } | { refused: string };

export function namesOffered(presets: PresetName[]): string[] {
  return [...new Set(presets)].flatMap((preset) =>
    integrationsOffered(preset).map((offered) => offered.name),
  );
}

export function chosenFrom(named: string | undefined, offered: string[]): ChosenIntegrations {
  if (named === undefined) {
    return { chosen: [] };
  }

  const asked = named.split(',').map((name) => name.trim());
  const unknown = asked.find((name) => !offered.includes(name));

  if (unknown !== undefined) {
    return {
      refused: `${unknown} is not an integration this project offers. It offers ${offered.join(', ')}`,
    };
  }

  return { chosen: asked };
}

export function filesFor(presets: PresetName[], chosen: string[]): ScaffoldFile[] {
  const byPath = new Map<string, ScaffoldFile>();

  for (const preset of new Set(presets)) {
    for (const integration of chosenIn(preset, chosen)) {
      for (const file of integration.files) {
        byPath.set(pathInProject(file.target), {
          path: pathInProject(file.target),
          contents: contentOf(file.path),
        });
      }
    }
  }

  return [...byPath.values()];
}
