import type { PresetFile, PresetIntegration, PresetSkill } from '@ket/preset';

import { filesOf, installsOf, skillsOf } from '@ket/preset';

import type { PresetName } from '../../shared/configuration.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';

import { governingPresets, presetNamed } from '../../shared/registry.ts';
import { pathInProject } from './placement.ts';

export function integrationsOffered(preset: PresetName): PresetIntegration[] {
  return presetNamed(preset)?.item.integrations ?? [];
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

export function integrationFile(file: PresetFile, contents: string): ScaffoldFile {
  return {
    path: pathInProject(file.target),
    contents,
    ...(file.encoding === 'base64' ? { encoding: 'base64' as const } : {}),
  };
}

export function filesFor(presets: PresetName[], chosen: string[]): ScaffoldFile[] {
  const byPath = new Map<string, ScaffoldFile>();

  for (const preset of governingPresets(presets)) {
    for (const integration of chosenIn(preset.name, chosen)) {
      for (const file of filesOf(integration)) {
        const built = integrationFile(file, preset.contentOf(file.path));

        byPath.set(built.path, built);
      }
    }
  }

  return [...byPath.values()];
}

export function installsFor(presets: PresetName[], chosen: string[]): string[] {
  const installed = new Set<string>();

  for (const preset of governingPresets(presets)) {
    for (const pin of chosenIn(preset.name, chosen).flatMap(installsOf)) {
      installed.add(pin);
    }
  }

  return [...installed];
}

export function skillsFor(presets: PresetName[], chosen: string[]): PresetSkill[] {
  const brought = new Map<string, PresetSkill>();

  for (const preset of governingPresets(presets)) {
    for (const skill of chosenIn(preset.name, chosen).flatMap(skillsOf)) {
      brought.set(skill.name, skill);
    }
  }

  return [...brought.values()];
}
