import type { ReactNode } from 'react';

import type { GateActionView } from '../../../shared/model';
import type { GroupedBindings } from '../lib/bindings.ts';
import type { BoardLayout } from '../model/board-layout.ts';
import type { Frame } from '../model/frames.ts';
import type { Help } from '../model/help.ts';

import { useTheme } from '../../../shared/theme';
import { bindingsAt, groupedOf, spotOf } from '../lib/bindings.ts';
import { OverlayBox } from './overlay-box.tsx';

const WIDE = 40;

const KEY_ROOM = 9;

function GroupRows({ held }: { held: GroupedBindings }): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column">
      <text wrapMode="none" fg={theme.blue}>
        {held.group}
      </text>
      {held.bindings.map(
        (binding): ReactNode => (
          <text key={`${binding.keys} ${binding.action}`} wrapMode="none">
            <span fg={theme.text}>{`  ${binding.keys.padEnd(KEY_ROOM)}`}</span>
            <span fg={theme.subtext}>{binding.action}</span>
          </text>
        ),
      )}
    </box>
  );
}

export function HelpOverlay({
  help,
  frame,
  offers,
  layout,
  width,
  height,
}: {
  help: Help;
  frame: Frame;
  offers: GateActionView[];
  layout: BoardLayout;
  width: number;
  height: number;
}): ReactNode {
  const { theme } = useTheme();

  if (!help.on) {
    return null;
  }

  const grouped = groupedOf(bindingsAt(spotOf(frame, layout, offers)));
  const tall = grouped.reduce((count, held) => count + held.bindings.length + 1, 0) + 5;

  return (
    <OverlayBox wide={WIDE} tall={tall} width={width} height={height} raised={70} title={' keys '}>
      {grouped.map(
        (held): ReactNode => (
          <GroupRows key={held.group} held={held} />
        ),
      )}
      <text> </text>
      <text wrapMode="none" fg={theme.overlay}>
        {'  esc close'}
      </text>
    </OverlayBox>
  );
}
