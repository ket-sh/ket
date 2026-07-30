import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CLI_PRESET } from '../src/item.ts';

const PRESET_ROOT = join(import.meta.dirname, '..');
const GENERATED = join(PRESET_ROOT, 'src', 'contents.generated.ts');

async function readShipped(): Promise<[string, string][]> {
  const entries = await readdir(join(PRESET_ROOT, 'files'), {
    recursive: true,
    withFileTypes: true,
  });
  const promised = new Set(CLI_PRESET.files.map((file) => file.path));

  const shipped = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name))
      .map((absolute) => absolute.slice(PRESET_ROOT.length + 1))
      .filter((path) => promised.has(path))
      .toSorted()
      .map(
        async (path): Promise<[string, string]> => [
          path,
          await readFile(join(PRESET_ROOT, path), 'utf8'),
        ],
      ),
  );

  return shipped;
}

function render(shipped: [string, string][]): string {
  const entries = shipped
    .map(([path, contents]) => `  ${JSON.stringify(path)}: ${JSON.stringify(contents)},`)
    .join('\n');

  return `export const PRESET_CONTENTS: Record<string, string> = {
${entries}
};

export function contentOf(path: string): string {
  const contents = PRESET_CONTENTS[path];

  if (contents === undefined) {
    throw new Error(\`the cli preset promises \${path} but ships no such file\`);
  }

  return contents;
}
`;
}

await writeFile(GENERATED, render(await readShipped()), 'utf8');
