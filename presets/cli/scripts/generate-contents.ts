import { writeContentsModule } from '@ket/preset';
import { join } from 'node:path';

import { CLI_PRESET } from '../src/item.ts';

await writeContentsModule(CLI_PRESET, join(import.meta.dirname, '..'));
