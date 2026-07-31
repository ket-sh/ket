import { contentReaderFor } from '@ket/preset';

import { PRESET_CONTENTS } from './contents.generated.ts';
import { WEB_PRESET } from './item.ts';

export const contentOf = contentReaderFor(WEB_PRESET, PRESET_CONTENTS);
