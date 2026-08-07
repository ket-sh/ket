import type { ReactNode } from 'react';

import type { Frame } from '../model/frames.ts';

import { confettiRows, lerpHex } from '../../../shared/lib';
import {
  BASE,
  GREEN,
  OVERLAY,
  RED,
  STAGE_COLOR,
  SURFACE1,
  TEXT,
  YELLOW,
} from '../../../shared/theme';
import { SpanRow } from '../../../shared/ui';

type GateFrame = Extract<Frame, { kind: 'gate' }>;

const TORII = ['▄▄█▄▄▄█▄▄', '  █▀▀▀█  ', '  █   █  '];

const WIDE = 52;

const TALL = 15;

function accentOf(phase: GateFrame['phase']): string {
  if (phase === 'pass') {
    return GREEN;
  }

  return phase === 'refuse' ? RED : YELLOW;
}

function pulsed(color: string, tick: number): string {
  return lerpHex(color, BASE, tick % 6 < 3 ? 0.15 : 0.4);
}

function ToriiMark({ accent, tick }: { accent: string; tick: number }): ReactNode {
  const pad = ' '.repeat(Math.floor((WIDE - 4 - (TORII[0]?.length ?? 0)) / 2));

  return TORII.map(
    (row, index): ReactNode => (
      <text key={String(index)} wrapMode="none">
        <span fg={pulsed(accent, tick + index * 2)}>{`${pad}${row}`}</span>
      </text>
    ),
  );
}

function Asked({ frame, from }: { frame: GateFrame; from: string | undefined }): ReactNode {
  return (
    <box flexDirection="column">
      <text wrapMode="none">
        {'  '}
        <span fg={BASE} bg={STAGE_COLOR[from ?? ''] ?? OVERLAY}>{` ${from ?? '?'} `}</span>
        <span fg={OVERLAY}>{' ──► '}</span>
        <span fg={BASE} bg={YELLOW}>{` ${frame.action} `}</span>
      </text>
      <text> </text>
      <text wrapMode="none">
        {'  '}
        <span fg={BASE} bg={GREEN}>
          {' pass ⏎ '}
        </span>
        {'   '}
        <span fg={TEXT} bg={SURFACE1}>
          {' cancel esc '}
        </span>
      </text>
    </box>
  );
}

function Cheered({ frame, tick }: { frame: GateFrame; tick: number }): ReactNode {
  return (
    <box flexDirection="column">
      {confettiRows(tick, WIDE - 4, 4).map(
        (spans, index): ReactNode => (
          <SpanRow key={String(index)} spans={spans} />
        ),
      )}
      <text wrapMode="none">
        {'  '}
        <span fg={GREEN}>{'✓ passed'}</span>
        <span fg={OVERLAY}>{`  ${frame.cardKey}`}</span>
      </text>
    </box>
  );
}

function Refused({ frame }: { frame: GateFrame }): ReactNode {
  return (
    <box flexDirection="column">
      <text wrapMode="none" fg={RED}>
        {'  ✗ refused'}
      </text>
      <text wrapMode="word" fg={RED}>{`  ${frame.reason ?? ''}`}</text>
      <text> </text>
      <text wrapMode="none">
        {'  '}
        <span fg={TEXT} bg={SURFACE1}>
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
  const accent = accentOf(frame.phase);

  return (
    <box
      position="absolute"
      left={Math.max(0, Math.floor((width - WIDE) / 2))}
      top={Math.max(2, Math.floor((height - TALL) / 2))}
      width={WIDE}
      zIndex={50}
      border
      borderStyle="double"
      borderColor={frame.phase === 'refuse' ? accent : pulsed(accent, tick)}
      backgroundColor={BASE}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      title={` ${frame.action} gate `}
    >
      <ToriiMark accent={accent} tick={tick} />
      <text> </text>
      <text wrapMode="none" fg={TEXT}>
        {`  ${frame.cardKey} · ${frame.cardTitle.slice(0, WIDE - 12)}`}
      </text>
      <text> </text>
      {answerOf(frame, from, tick)}
    </box>
  );
}
