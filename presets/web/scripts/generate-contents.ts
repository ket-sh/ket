import { writeContentsModule } from '@ket/preset';
import { join } from 'node:path';

import { WEB_PRESET } from '../src/item.ts';

await writeContentsModule(WEB_PRESET, join(import.meta.dirname, '..'));
