import type { PresetFile } from '@ket/preset';

import type { PresetName } from '../../shared/configuration.ts';
import type { RegisteredPreset } from '../../shared/registry.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';
import type { ProjectNames } from './name-token.ts';

import { governingPresets } from '../../shared/registry.ts';
import { withProjectNames } from './name-token.ts';

const HOME_MARKER = '~/';

export function pathInProject(target: string): string {
  return target.startsWith(HOME_MARKER) ? target.slice(HOME_MARKER.length) : target;
}

export function scaffolded(
  file: PresetFile,
  contents: string,
  project: ProjectNames,
): ScaffoldFile {
  return file.encoding === 'base64'
    ? { path: pathInProject(file.target), contents, encoding: 'base64' }
    : { path: pathInProject(file.target), contents: withProjectNames(contents, project) };
}

function filesOf(preset: RegisteredPreset, project: ProjectNames): ScaffoldFile[] {
  return preset.item.files.map((file) => scaffolded(file, preset.contentOf(file.path), project));
}

export function shippedContents(installed: ScaffoldFile[], path: string): string | undefined {
  return installed.find((file) => file.path === path)?.contents;
}

export function filesToInstall(targets: PresetName[], project: ProjectNames): ScaffoldFile[] {
  const byPath = new Map<string, ScaffoldFile>();

  for (const preset of governingPresets(targets)) {
    for (const file of filesOf(preset, project)) {
      byPath.set(file.path, file);
    }
  }

  return [...byPath.values()];
}
