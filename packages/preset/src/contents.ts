import type { PresetItem } from './item.ts';

export type PresetContents = Record<string, string>;

export function contentReaderFor(
  item: PresetItem,
  carried: PresetContents,
): (path: string) => string {
  return function contentOf(path: string): string {
    const contents = carried[path];

    if (contents === undefined) {
      throw new Error(`the ${item.name} preset promises ${path} but ships no such file`);
    }

    return contents;
  };
}
