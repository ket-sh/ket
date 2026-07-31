import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PACKAGE_ROOT = join(import.meta.dirname, '..');

const COMMANDS = join(PACKAGE_ROOT, '..', '..', 'harness', 'commands');

const GENERATED = join(PACKAGE_ROOT, 'src', 'commands', 'create', 'pipeline-commands.generated.ts');

const MARKDOWN = '.md';

const DESCRIPTION = 'description:';

async function saysOf(entry: string): Promise<string> {
  const contents = await readFile(join(COMMANDS, entry), 'utf8');
  const line = contents.split('\n').find((each) => each.startsWith(DESCRIPTION)) ?? '';

  return line.slice(DESCRIPTION.length).trim();
}

async function shipped(): Promise<{ name: string; says: string }[]> {
  const entries = await readdir(COMMANDS);
  const named = entries.filter((entry) => entry.endsWith(MARKDOWN)).toSorted();

  return Promise.all(
    named.map(async (entry) => ({
      name: entry.slice(0, -MARKDOWN.length),
      says: await saysOf(entry),
    })),
  );
}

function render(commands: { name: string; says: string }[]): string {
  const entries = commands
    .map(
      (command) =>
        `  { name: ${JSON.stringify(command.name)}, says: ${JSON.stringify(command.says)} },`,
    )
    .join('\n');

  return `export interface PipelineCommand {
  name: string;
  says: string;
}

export const PIPELINE_COMMANDS: PipelineCommand[] = [
${entries}
];
`;
}

await writeFile(GENERATED, render(await shipped()), 'utf8');
