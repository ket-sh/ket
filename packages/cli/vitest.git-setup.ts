import { join } from 'node:path';
import { env } from 'node:process';

// A suite that lets the host's git configuration through measures the machine
// instead of ket: its signing key, its hooks path, its aliases. The global
// scope points at the suite's own committed file instead, so every spawned git
// sees one identity with signing off, and a spec's `-c` flags still override
// it the way repository configuration overrides a real global file.
const NOTHING = '/dev/null';

env['GIT_CONFIG_GLOBAL'] = join(import.meta.dirname, 'vitest.gitconfig');
env['GIT_CONFIG_SYSTEM'] = NOTHING;
