import type { ReactNode } from 'react';

import type { Theme } from '../../../shared/theme';
import type { PaneLine, PaneTone } from '../lib/pane.ts';
import type { JourneyFocus } from '../model/frames.ts';

import { useTheme } from '../../../shared/theme';

const SEATED = '▸ ';

const RESTING = '  ';

function toneColorOf(tone: PaneTone, theme: Theme): string {
  const tones: Record<PaneTone, string> = {
    key: theme.text,
    title: theme.text,
    state: theme.blue,
    alert: theme.red,
    quiet: theme.subtext,
    link: theme.green,
  };

  return tones[tone];
}

// Only the link answers the keyboard, so only the link shows where the
// selection sits once the pane holds it.
function markOf(line: PaneLine, focus: JourneyFocus): string {
  return line.tone === 'link' && focus === 'pane' ? SEATED : RESTING;
}

export function SidePane({
  lines,
  focus,
  width,
}: {
  lines: PaneLine[];
  focus: JourneyFocus;
  width: number;
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
          <text key={String(index)} wrapMode="none" fg={toneColorOf(line.tone, theme)}>
            {`${markOf(line, focus)}${line.text}`}
          </text>
        ),
      )}
    </box>
  );
}
