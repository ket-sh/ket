import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';

import { shippedFilesOf } from './shipped.ts';

const GENERATED = join('src', 'contents.generated.ts');

function moduleCarrying(shipped: PresetContents): string {
  const entries = Object.entries(shipped)
    .map(([path, contents]) => `  ${JSON.stringify(path)}: ${JSON.stringify(contents)},`)
    .join('\n');

  return `export const PRESET_CONTENTS: Record<string, string> = {\n${entries}\n};\n`;
}

export async function writeContentsModule(item: PresetItem, root: string): Promise<void> {
  const shipped = await shippedFilesOf(item, root);

  await writeFile(join(root, GENERATED), moduleCarrying(shipped));
}
