import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import { useTheme } from '../../../shared/theme';

export function OverlayBox({
  wide,
  tall,
  width,
  height,
  raised,
  title,
  children,
}: {
  wide: number;
  tall: number;
  width: number;
  height: number;
  raised: number;
  title: string;
  children: ReactNode;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <box
      position="absolute"
      left={Math.max(0, Math.floor((width - wide) / 2))}
      top={Math.max(1, Math.floor((height - tall) / 2))}
      width={wide}
      zIndex={raised}
      border
      borderStyle="rounded"
      borderColor={theme.overlay}
      backgroundColor={theme.base}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      title={title}
      onMouseDown={(event: MouseEvent) => {
        event.stopPropagation();
      }}
    >
      {children}
    </box>
  );
}
