import type { ReactNode } from 'react';

import type { SurfaceDocView } from '../../../shared/model';
import type { Audience } from '../lib/lines.ts';

import { useTheme } from '../../../shared/theme';
import { SpanRow } from '../../../shared/ui';
import { docLines } from '../lib/lines.ts';

export interface DocRowsProps {
  doc: SurfaceDocView;
  audience: Audience;
  from: number;
  room: number;
}

export function DocRows({ doc, audience, from, room }: DocRowsProps): ReactNode {
  const { theme } = useTheme();

  return docLines(doc, audience, theme)
    .slice(from, from + room)
    .map((spans, index): ReactNode => <SpanRow key={String(index)} spans={spans} />);
}
