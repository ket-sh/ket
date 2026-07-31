import { CLI_PRESET, contentOf } from '@ket/preset-cli';

import type { PresetName } from '../../shared/configuration.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';

import { withProjectName } from './name-token.ts';

const HOME_MARKER = '~/';

const ITEMS = { cli: CLI_PRESET };

export function pathInProject(target: string): string {
  return target.startsWith(HOME_MARKER) ? target.slice(HOME_MARKER.length) : target;
}

function isWritten(preset: PresetName): preset is keyof typeof ITEMS {
  return Object.hasOwn(ITEMS, preset);
}

function filesOf(preset: keyof typeof ITEMS, name: string): ScaffoldFile[] {
  return ITEMS[preset].files.map((file) => ({
    path: pathInProject(file.target),
    contents: withProjectName(contentOf(file.path), name),
  }));
}

export function shippedContents(installed: ScaffoldFile[], path: string): string | undefined {
  return installed.find((file) => file.path === path)?.contents;
}

export function filesToInstall(presets: PresetName[], name: string): ScaffoldFile[] {
  const byPath = new Map<string, ScaffoldFile>();

  for (const preset of new Set(presets)) {
    if (isWritten(preset)) {
      for (const file of filesOf(preset, name)) {
        byPath.set(file.path, file);
      }
    }
  }

  return [...byPath.values()];
}
