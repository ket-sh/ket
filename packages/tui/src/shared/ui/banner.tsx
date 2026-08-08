import type { ReactNode } from 'react';

import { bandAt } from '../lib';
import { useTheme } from '../theme';

export const TORII = ['▄▄█▄▄▄█▄▄', '  █▀▀▀█  ', '  █   █  '];

const LETTERS = ['█ ▄▀  █▀▀  ▀█▀', '█▀▄   █▀    █ ', '█ ▀▄  █▄▄   █ '];

const BAND_WIDTH = 42;

export function Banner(): ReactNode {
  const { theme } = useTheme();
  const rows = TORII.map((torii, index) => `${torii}   ${LETTERS[index] ?? ''}`);

  return (
    <box flexDirection="column">
      {rows.map(
        (row, rowIndex): ReactNode => (
          <text key={String(rowIndex)} wrapMode="none">
            {Array.from(row).map(
              (glyph, colIndex): ReactNode => (
                <span key={String(colIndex)} fg={bandAt(colIndex / BAND_WIDTH, theme)}>
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
