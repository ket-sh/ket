import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import type { PaletteEntry } from '../lib/palette.ts';
import type { WatchMouse } from '../model/mouse.ts';
import type { Palette } from '../model/palette.ts';

import { stageColorOf, useTheme } from '../../../shared/theme';
import { OverlayBox } from './overlay-box.tsx';

const WIDE = 56;

const MOST = 9;

function EntryRow({
  entry,
  chosen,
  onPress,
}: {
  entry: PaletteEntry;
  chosen: boolean;
  onPress: () => void;
}): ReactNode {
  const { theme } = useTheme();
  const mark = chosen ? '► ' : '  ';
  const rest = chosen ? theme.text : theme.subtext;

  const pressAt = (event: MouseEvent): void => {
    event.stopPropagation();
    onPress();
  };

  if (entry.kind !== 'item') {
    return (
      <text wrapMode="none" onMouseDown={pressAt}>
        <span fg={theme.text}>{mark}</span>
        <span fg={rest}>{entry.label}</span>
      </text>
    );
  }

  return (
    <text wrapMode="none" onMouseDown={pressAt}>
      <span fg={theme.text}>{mark}</span>
      <span fg={stageColorOf(theme)[entry.status] ?? theme.text}>{entry.key}</span>
      <span fg={rest}>{entry.label.slice(entry.key.length)}</span>
    </text>
  );
}

function QueryRow({ query }: { query: string }): ReactNode {
  const { theme } = useTheme();

  return (
    <text wrapMode="none">
      <span fg={theme.blue}>{'> '}</span>
      <span fg={theme.text}>{query}</span>
      <span fg={theme.overlay}>{'▌'}</span>
    </text>
  );
}

export function PaletteOverlay({
  palette,
  width,
  height,
  mouse,
}: {
  palette: Palette;
  width: number;
  height: number;
  mouse: WatchMouse;
}): ReactNode {
  const { theme } = useTheme();

  if (palette.at === undefined) {
    return null;
  }

  const from = Math.max(0, palette.at - MOST + 1);
  const rows = palette.shown.slice(from, from + MOST);

  return (
    <OverlayBox
      wide={WIDE}
      tall={MOST + 6}
      width={width}
      height={height}
      raised={70}
      title={' go '}
    >
      <QueryRow query={palette.query} />
      <text> </text>
      {rows.map(
        (entry, seatAt): ReactNode => (
          <EntryRow
            key={entry.label}
            entry={entry}
            chosen={from + seatAt === palette.at}
            onPress={() => {
              mouse.paletteRow(from + seatAt);
            }}
          />
        ),
      )}
      <text> </text>
      <text wrapMode="none" fg={theme.overlay}>
        {'  ↑↓ move · ⏎ go · esc close'}
      </text>
    </OverlayBox>
  );
}
