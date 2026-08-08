import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import type { Theme } from '../../../shared/theme';
import type { WatchMouse } from '../model/mouse.ts';

import { THEMES, useTheme } from '../../../shared/theme';
import { OverlayBox } from './overlay-box.tsx';

const WIDE = 44;

function stripOf(theme: Theme): string[] {
  return [theme.base, theme.blue, theme.green, theme.yellow, theme.red, theme.violet];
}

function WardrobeRow({
  name,
  candidate,
  chosen,
  onPress,
}: {
  name: string;
  candidate: Theme;
  chosen: boolean;
  onPress: () => void;
}): ReactNode {
  const { theme } = useTheme();
  const label = `${chosen ? '► ' : '  '}${name.padEnd(20)}`;

  return (
    <text
      wrapMode="none"
      onMouseDown={(event: MouseEvent) => {
        event.stopPropagation();
        onPress();
      }}
    >
      <span fg={chosen ? theme.text : theme.subtext}>{label}</span>
      {stripOf(candidate).map(
        (tint, index): ReactNode => (
          <span key={String(index)} fg={tint}>
            {'██'}
          </span>
        ),
      )}
    </text>
  );
}

export function ThemePicker({
  at,
  width,
  height,
  mouse,
}: {
  at: number;
  width: number;
  height: number;
  mouse: WatchMouse;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <OverlayBox
      wide={WIDE}
      tall={THEMES.length + 4}
      width={width}
      height={height}
      raised={60}
      title={' themes '}
    >
      {THEMES.map(
        ([name, candidate], index): ReactNode => (
          <WardrobeRow
            key={name}
            name={name}
            candidate={candidate}
            chosen={index === at}
            onPress={() => {
              mouse.pickerRow(index);
            }}
          />
        ),
      )}
      <text> </text>
      <text wrapMode="none" fg={theme.overlay}>
        {'  ↑↓ preview · ⏎ keep · esc revert'}
      </text>
    </OverlayBox>
  );
}
