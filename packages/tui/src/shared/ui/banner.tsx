import type { ReactNode } from 'react';

import { shimmerAt } from '../lib';
import { useTheme } from '../theme';

export const TORII = ['▄▄█▄▄▄█▄▄', '  █▀▀▀█  ', '  █   █  '];

const LETTERS = ['█ ▄▀  █▀▀  ▀█▀', '█▀▄   █▀    █ ', '█ ▀▄  █▄▄   █ '];

const BAND_WIDTH = 42;

const DRIFT = 0.01;

export function Banner({ tick }: { tick: number }): ReactNode {
  const { theme } = useTheme();
  const rows = TORII.map((torii, index) => `${torii}   ${LETTERS[index] ?? ''}`);

  return (
    <box flexDirection="column">
      {rows.map(
        (row, rowIndex): ReactNode => (
          <text key={String(rowIndex)} wrapMode="none">
            {Array.from(row).map(
              (glyph, colIndex): ReactNode => (
                <span
                  key={String(colIndex)}
                  fg={shimmerAt(colIndex / BAND_WIDTH - tick * DRIFT, theme)}
                >
                  {glyph}
                </span>
              ),
            )}
          </text>
        ),
      )}
    </box>
  );
}
