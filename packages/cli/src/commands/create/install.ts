import type { PresetName } from '../../shared/configuration.ts';
import type { RegisteredPreset } from '../../shared/registry.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';

import { governingPresets } from '../../shared/registry.ts';
import { withProjectName } from './name-token.ts';

const HOME_MARKER = '~/';

export function pathInProject(target: string): string {
  return target.startsWith(HOME_MARKER) ? target.slice(HOME_MARKER.length) : target;
}

function filesOf(preset: RegisteredPreset, name: string): ScaffoldFile[] {
  return preset.item.files.map((file) => ({
    path: pathInProject(file.target),
    contents: withProjectName(preset.contentOf(file.path), name),
  }));
}

export function shippedContents(installed: ScaffoldFile[], path: string): string | undefined {
  return installed.find((file) => file.path === path)?.contents;
}

export function filesToInstall(targets: PresetName[], name: string): ScaffoldFile[] {
  const byPath = new Map<string, ScaffoldFile>();

  for (const preset of governingPresets(targets)) {
    for (const file of filesOf(preset, name)) {
      byPath.set(file.path, file);
    }
  }

  return [...byPath.values()];
}
