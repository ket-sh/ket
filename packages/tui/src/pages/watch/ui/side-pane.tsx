import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import type { PaneLine } from '../lib/pane.ts';
import type { JourneyFocus } from '../model/frames.ts';

import { useTheme } from '../../../shared/theme';
import { toneColorOf } from '../lib/pane.ts';

const SEATED = '▸ ';

const RESTING = '  ';

// Only the link answers the keyboard, so only the link shows where the
// selection sits once the pane holds it.
function markOf(line: PaneLine, focus: JourneyFocus): string {
  return line.tone === 'link' && focus === 'pane' ? SEATED : RESTING;
}

function PaneRow({
  line,
  focus,
  onChildren,
}: {
  line: PaneLine;
  focus: JourneyFocus;
  onChildren: () => void;
}): ReactNode {
  const { theme } = useTheme();
  const spoken = `${markOf(line, focus)}${line.text}`;

  if (line.tone !== 'link') {
    return (
      <text wrapMode="none" fg={toneColorOf(line.tone, theme)}>
        {spoken}
      </text>
    );
  }

  return (
    <text
      wrapMode="none"
      fg={toneColorOf(line.tone, theme)}
      onMouseDown={(event: MouseEvent) => {
        event.stopPropagation();
        onChildren();
      }}
    >
      {spoken}
    </text>
  );
}

export function SidePane({
  lines,
  focus,
  width,
  onChildren,
}: {
  lines: PaneLine[];
  focus: JourneyFocus;
  width: number;
  onChildren: () => void;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <box
      flexDirection="column"
      width={width}
      border
      borderStyle="rounded"
      borderColor={focus === 'pane' ? theme.blue : theme.surface1}
      title=" item "
      paddingLeft={1}
      paddingRight={1}
      overflow="hidden"
    >
      {lines.map(
        (line, index): ReactNode => (
          <PaneRow key={String(index)} line={line} focus={focus} onChildren={onChildren} />
        ),
      )}
    </box>
  );
}
