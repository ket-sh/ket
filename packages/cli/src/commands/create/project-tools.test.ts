import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { toolRefusal } from './project-tools.ts';

const DEADLINE_MS = 5000;

const COMPLAINING_ON_STDERR = `#!/bin/sh
echo "the registry said no" >&2
exit 1
`;

const TRAILING_WHITESPACE = `#!/bin/sh
printf 'said with a tail   \\n\\n'
exit 1
`;

async function toolThat(behaves: string): Promise<string> {
  const where = await mkdtemp(join(tmpdir(), 'ket-tool-'));
  const tool = join(where, 'refusing-tool');

  await writeFile(tool, behaves, 'utf8');
  await chmod(tool, 0o755);

  return tool;
}

async function project(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ket-tool-project-'));
}

describe('quoting a tool that ran inside the project', () => {
  it('quotes a tool that complains only on stderr', async () => {
    const tool = await toolThat(COMPLAINING_ON_STDERR);

    expect(await toolRefusal([tool], await project(), DEADLINE_MS, {})).toBe(
      'the registry said no',
    );
  });

  it('answers the spawn failure when the binary cannot start', async () => {
    const missing = join(await project(), 'no-such-tool');

    expect(await toolRefusal([missing], await project(), DEADLINE_MS, {})).toContain('ENOENT');
  });

  it('trims what the tool said before quoting it', async () => {
    const tool = await toolThat(TRAILING_WHITESPACE);

    expect(await toolRefusal([tool], await project(), DEADLINE_MS, {})).toBe('said with a tail');
  });
});
