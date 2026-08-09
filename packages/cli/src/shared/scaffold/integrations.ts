import type { PresetFile, PresetIntegration, PresetMcpServer, PresetSkill } from '@ket/preset';

import {
  comes,
  crowdedCategoriesOf,
  filesOf,
  installsOf,
  mcpServersOf,
  skillsOf,
} from '@ket/preset';

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

export function offeredIntegrations(presets: PresetName[]): PresetIntegration[] {
  const byName = new Map<string, PresetIntegration>();

  for (const preset of new Set(presets)) {
    for (const offered of integrationsOffered(preset)) {
      byName.set(offered.name, offered);
    }
  }

  return [...byName.values()];
}

export function crowdedRefusal(chosen: string[], offered: PresetIntegration[]): string | undefined {
  const [crowded] = crowdedCategoriesOf(
    offered.filter((integration) => chosen.includes(integration.name)),
  );

  return crowded === undefined
    ? undefined
    : `${crowded.tools.join(' and ')} each answer for ${crowded.category}, and a project takes one of them`;
}

export function chosenFrom(
  named: string | undefined,
  offered: PresetIntegration[],
): ChosenIntegrations {
  if (named === undefined) {
    return { chosen: [] };
  }

  const asked = named.split(',').map((name) => name.trim());
  const coming = asked.find((name) =>
    offered.some((integration) => comes(integration) && integration.name === name),
  );

  if (coming !== undefined) {
    return { refused: `${coming} arrives soon and cannot be chosen yet` };
  }

  const names = offered
    .filter((integration) => !comes(integration))
    .map((integration) => integration.name);
  const unknown = asked.find((name) => !names.includes(name));

  if (unknown !== undefined) {
    return {
      refused: `${unknown} is not an integration this project offers. It offers ${names.join(', ')}`,
    };
  }

  const crowded = crowdedRefusal(asked, offered);

  return crowded === undefined ? { chosen: asked } : { refused: crowded };
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

export function mcpServersFor(presets: PresetName[], chosen: string[]): PresetMcpServer[] {
  const registered = new Map<string, PresetMcpServer>();

  for (const preset of governingPresets(presets)) {
    for (const server of chosenIn(preset.name, chosen).flatMap(mcpServersOf)) {
      registered.set(server.name, server);
    }
  }

  return [...registered.values()];
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
