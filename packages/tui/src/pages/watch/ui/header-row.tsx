import type { ReactNode } from 'react';

import type { FrameStack } from '../model/frames.ts';

import { lerpHex } from '../../../shared/lib';
import { useTheme } from '../../../shared/theme';
import { crumbOf } from '../model/frames.ts';

export function HeaderRow({ stack, tick }: { stack: FrameStack; tick: number }): ReactNode {
  const { theme, name } = useTheme();
  const beat = lerpHex(theme.green, theme.base, tick % 8 < 4 ? 0.1 : 0.5);

  return (
    <box flexDirection="row" justifyContent="space-between">
      <text wrapMode="none">
        <span fg={beat}>{'● '}</span>
        <span fg={theme.gray}>{crumbOf(stack.frames)}</span>
      </text>
      <text wrapMode="none" fg={theme.subtext}>
        {name}
      </text>
    </box>
  );
}
