import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import process from 'node:process';

const VARLOCK_BINARY = join('node_modules', '.bin', 'varlock');

const ENV_TYPES_FILE = 'env.d.ts';

function ran(command: string, args: string[]): string | undefined {
  const result = spawnSync(command, args, { encoding: 'utf8' });

  if (result.error !== undefined) {
    return result.error.message;
  }

  return result.status === 0 ? undefined : `${result.stdout}${result.stderr}`.trim();
}

function invalidSchema(): string | undefined {
  const said = ran(VARLOCK_BINARY, ['load']);

  return said === undefined ? undefined : `the env fails its own schema.\n${said}`;
}

function driftedSchema(): string | undefined {
  const said = ran(VARLOCK_BINARY, ['audit']);

  return said === undefined ? undefined : `the env drifted from its schema.\n${said}`;
}

function staleTypes(): string | undefined {
  const said = ran('git', ['diff', '--exit-code', '--', ENV_TYPES_FILE]);

  return said === undefined
    ? undefined
    : `${ENV_TYPES_FILE} is stale, commit the regenerated file.\n${said}`;
}

const verdict = invalidSchema() ?? driftedSchema() ?? staleTypes();

if (verdict !== undefined) {
  console.error(verdict);
  process.exit(1);
}

console.log('the env matches its schema, and nothing in it drifted');
