import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import { useTheme } from '../../../shared/theme';

export function FilterBar({
  query,
  kept,
  all,
}: {
  query: string;
  kept: number;
  all: number;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      onMouseDown={(event: MouseEvent) => {
        event.stopPropagation();
      }}
    >
      <text wrapMode="none">
        <span fg={theme.blue}>{'/ '}</span>
        <span fg={theme.text}>{query}</span>
        <span fg={theme.overlay}>{'▌'}</span>
      </text>
      <text wrapMode="none" fg={theme.overlay}>
        {`${String(kept)} of ${String(all)} · ⏎ keep · esc clear`}
      </text>
    </box>
  );
}
