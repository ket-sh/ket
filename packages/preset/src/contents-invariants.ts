import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';

import { everyFileOf } from './item.ts';

export function contentInvariantsOf(
  item: PresetItem,
  carried: PresetContents,
  shipped: PresetContents,
): string[] {
  const promised = everyFileOf(item).map((file) => file.path);
  const held = promised.filter((path) => Object.hasOwn(carried, path));

  return [
    ...promised
      .filter((path) => !Object.hasOwn(carried, path))
      .map((path) => `the preset promises ${path} but carries no such file`),
    ...Object.keys(carried)
      .filter((path) => !promised.includes(path))
      .map((path) => `the preset carries ${path} but promises no such file`),
    ...held
      .filter((path) => carried[path] !== shipped[path])
      .map((path) => `the preset carries ${path} as bytes the file on disk no longer holds`),
  ];
}
