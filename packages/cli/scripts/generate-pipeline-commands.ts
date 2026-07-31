import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PACKAGE_ROOT = join(import.meta.dirname, '..');

const COMMANDS = join(PACKAGE_ROOT, '..', '..', 'harness', 'commands');

const GENERATED = join(PACKAGE_ROOT, 'src', 'commands', 'create', 'pipeline-commands.generated.ts');

const MARKDOWN = '.md';

const DESCRIPTION = 'description:';

const ORDER = 'order:';

async function frontmatterOf(entry: string): Promise<{ says: string; at: number }> {
  const lines = (await readFile(join(COMMANDS, entry), 'utf8')).split('\n');
  const said = lines.find((each) => each.startsWith(DESCRIPTION)) ?? '';
  const ordered = lines.find((each) => each.startsWith(ORDER)) ?? '';
  const at = Number(ordered.slice(ORDER.length).trim());

  if (!Number.isInteger(at)) {
    throw new Error(`${entry} declares no order, so the outro cannot place it`);
  }

  return { says: said.slice(DESCRIPTION.length).trim(), at };
}

async function shipped(): Promise<{ name: string; says: string }[]> {
  const entries = await readdir(COMMANDS);
  const named = entries.filter((entry) => entry.endsWith(MARKDOWN));
  const read = await Promise.all(
    named.map(async (entry) => ({
      name: entry.slice(0, -MARKDOWN.length),
      ...(await frontmatterOf(entry)),
    })),
  );

  return read
    .toSorted((left, right) => left.at - right.at)
    .map((command) => ({ name: command.name, says: command.says }));
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
