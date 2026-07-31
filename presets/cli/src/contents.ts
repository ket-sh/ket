import { contentReaderFor } from '@ket/preset';

import { PRESET_CONTENTS } from './contents.generated.ts';
import { CLI_PRESET } from './item.ts';

export const contentOf = contentReaderFor(CLI_PRESET, PRESET_CONTENTS);
