import type { ReactNode } from 'react';

import type { Theme } from '../../../shared/theme';
import type { Frame } from '../model/frames.ts';

import { confettiRows, lerpHex } from '../../../shared/lib';
import { stageColorOf, useTheme } from '../../../shared/theme';
import { SpanRow } from '../../../shared/ui';

type GateFrame = Extract<Frame, { kind: 'gate' }>;

const TORII = ['▄▄█▄▄▄█▄▄', '  █▀▀▀█  ', '  █   █  '];

const WIDE = 52;

const TALL = 15;

function accentOf(phase: GateFrame['phase'], theme: Theme): string {
  if (phase === 'pass') {
    return theme.green;
  }

  return phase === 'refuse' ? theme.red : theme.yellow;
}

function pulsed(color: string, tick: number, theme: Theme): string {
  return lerpHex(color, theme.base, tick % 6 < 3 ? 0.15 : 0.4);
}

function ToriiMark({ accent, tick }: { accent: string; tick: number }): ReactNode {
  const { theme } = useTheme();
  const pad = ' '.repeat(Math.floor((WIDE - 4 - (TORII[0]?.length ?? 0)) / 2));

  return TORII.map(
    (row, index): ReactNode => (
      <text key={String(index)} wrapMode="none">
        <span fg={pulsed(accent, tick + index * 2, theme)}>{`${pad}${row}`}</span>
      </text>
    ),
  );
}

function Asked({ frame, from }: { frame: GateFrame; from: string | undefined }): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column">
      <text wrapMode="none">
        {'  '}
        <span fg={theme.base} bg={stageColorOf(theme)[from ?? ''] ?? theme.overlay}>
          {` ${from ?? '?'} `}
        </span>
        <span fg={theme.overlay}>{' ──► '}</span>
        <span fg={theme.base} bg={theme.yellow}>{` ${frame.action} `}</span>
      </text>
      <text> </text>
      <text wrapMode="none">
        {'  '}
        <span fg={theme.base} bg={theme.green}>
          {' pass ⏎ '}
        </span>
        {'   '}
        <span fg={theme.text} bg={theme.surface1}>
          {' cancel esc '}
        </span>
      </text>
    </box>
  );
}

function Cheered({ frame, tick }: { frame: GateFrame; tick: number }): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column">
      {confettiRows(tick, WIDE - 4, 4, theme).map(
        (spans, index): ReactNode => (
          <SpanRow key={String(index)} spans={spans} />
        ),
      )}
      <text wrapMode="none">
        {'  '}
        <span fg={theme.green}>{'✓ passed'}</span>
        <span fg={theme.overlay}>{`  ${frame.cardKey}`}</span>
      </text>
    </box>
  );
}

function Refused({ frame }: { frame: GateFrame }): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column">
      <text wrapMode="none" fg={theme.red}>
        {'  ✗ refused'}
      </text>
      <text wrapMode="word" fg={theme.red}>{`  ${frame.reason ?? ''}`}</text>
      <text> </text>
      <text wrapMode="none">
        {'  '}
        <span fg={theme.text} bg={theme.surface1}>
          {' close esc '}
        </span>
      </text>
    </box>
  );
}

function answerOf(frame: GateFrame, from: string | undefined, tick: number): ReactNode {
  if (frame.phase === 'ask') {
    return <Asked frame={frame} from={from} />;
  }

  return frame.phase === 'pass' ? <Cheered frame={frame} tick={tick} /> : <Refused frame={frame} />;
}

export interface GateModalProps {
  frame: GateFrame;
  from: string | undefined;
  tick: number;
  width: number;
  height: number;
}

export function GateModal({ frame, from, tick, width, height }: GateModalProps): ReactNode {
  const { theme } = useTheme();
  const accent = accentOf(frame.phase, theme);

  return (
    <box
      position="absolute"
      left={Math.max(0, Math.floor((width - WIDE) / 2))}
      top={Math.max(2, Math.floor((height - TALL) / 2))}
      width={WIDE}
      zIndex={50}
      border
      borderStyle="double"
      borderColor={frame.phase === 'refuse' ? accent : pulsed(accent, tick, theme)}
      backgroundColor={theme.base}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      title={` ${frame.action} gate `}
    >
      <ToriiMark accent={accent} tick={tick} />
      <text> </text>
      <text wrapMode="none" fg={theme.text}>
        {`  ${frame.cardKey} · ${frame.cardTitle.slice(0, WIDE - 12)}`}
      </text>
      <text> </text>
      {answerOf(frame, from, tick)}
    </box>
  );
}
