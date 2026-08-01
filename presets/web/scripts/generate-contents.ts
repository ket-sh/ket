import { writeContentsModule } from '@ket/preset';
import { join } from 'node:path';

import { WEB_PRESET } from '../src/item.ts';

const PRESET_ROOT = join(import.meta.dirname, '..');

// The bytes every preset writes alike are kept once, beside the package that
// declares them. A preset supplies only the files it differs on.
const SHARED_ROOT = join(PRESET_ROOT, '..', '..', 'packages', 'preset');

await writeContentsModule(WEB_PRESET, PRESET_ROOT, SHARED_ROOT);
