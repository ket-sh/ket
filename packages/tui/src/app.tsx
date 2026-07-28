import type { ReactNode } from 'react';

import { useKeyboard } from '@opentui/react';
import { useEffect, useState } from 'react';

import type { ItemView, StageView } from './view.ts';

import { appearanceOf, FRAME_INTERVAL } from './appearance.ts';
import { returnsWithin } from './pipeline.ts';

const MUTED = '#5f5f5f';

const FAINT = '#464646';

const ALERT = '#e06c75';

const SELECTED_BORDER = '#ffffff';

function StageBox({
  stage,
  selected,
  tick,
}: {
  stage: StageView;
  selected: boolean;
  tick: number;
}): ReactNode {
  const { color, mark } = appearanceOf(stage.status, tick);

  return (
    <box
      border
      borderStyle={selected ? 'heavy' : 'single'}
      borderColor={selected ? SELECTED_BORDER : color}
      flexShrink={0}
      titleAlignment="center"
      {...(stage.note === undefined ? {} : { title: stage.note })}
    >
      <text fg={color}>{`${mark} ${stage.stage}`}</text>
    </box>
  );
}

function StageRow({
  stages,
  selected,
  tick,
}: {
  stages: StageView[];
  selected: number;
  tick: number;
}): ReactNode {
  return (
    <box flexDirection="row" paddingLeft={1} paddingTop={1} flexShrink={0} overflow="scroll">
      {stages.map(
        (each, at): ReactNode => (
          <box key={each.stage} flexDirection="row" flexShrink={0}>
            <StageBox stage={each} selected={at === selected} tick={tick} />
            {at < stages.length - 1 ? <text fg={FAINT}>{' ──▶ '}</text> : null}
          </box>
        ),
      )}
    </box>
  );
}

function ReturnHint({ stages }: { stages: StageView[] }): ReactNode {
  const loops = returnsWithin(stages.map((each) => each.stage));

  return (
    <box flexDirection="column" paddingLeft={2} flexShrink={0}>
      {loops.map(
        (loop): ReactNode => (
          <text key={loop.from} fg={FAINT}>
            {`${loop.from} fails and returns to ${loop.to}`}
          </text>
        ),
      )}
    </box>
  );
}

function LogBody({ logs }: { logs: string[] }): ReactNode {
  if (logs.length === 0) {
    return <text fg={FAINT}>{'  nothing yet, this stage has not started'}</text>;
  }

  return (
    <>
      {logs.map(
        (line, at): ReactNode => (
          <text key={`${line}-${String(at)}`} fg={line.startsWith('gate') ? ALERT : MUTED}>
            {`  ${line}`}
          </text>
        ),
      )}
    </>
  );
}

function StageLog({ stage }: { stage: StageView | undefined }): ReactNode {
  const logs = stage?.logs ?? [];

  return (
    <box flexGrow={1} flexDirection="column" paddingLeft={1} paddingTop={1}>
      <text>
        <strong>{` ${stage?.stage ?? ''} `}</strong>
        <span fg={FAINT}>{`${String(logs.length)} events`}</span>
      </text>
      <scrollbox flexGrow={1} scrollY>
        <LogBody logs={logs} />
      </scrollbox>
    </box>
  );
}

function useTurningFrame(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const turning = setInterval(() => {
      setTick((frame) => frame + 1);
    }, FRAME_INTERVAL);

    return () => {
      clearInterval(turning);
    };
  }, []);

  return tick;
}

export function App({ item }: { item: ItemView }): ReactNode {
  const [selected, setSelected] = useState(0);
  const tick = useTurningFrame();

  useKeyboard((key) => {
    if (key.name === 'right') {
      setSelected((at) => Math.min(item.stages.length - 1, at + 1));
    }

    if (key.name === 'left') {
      setSelected((at) => Math.max(0, at - 1));
    }
  });

  return (
    <box flexDirection="column" paddingTop={1}>
      <box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1}>
        <text>
          <strong>ket</strong>
          <span fg={MUTED}>{`  ${item.id}  ${item.title}`}</span>
        </text>
        <text fg={FAINT}>← → move · q quit</text>
      </box>

      <StageRow stages={item.stages} selected={selected} tick={tick} />
      <ReturnHint stages={item.stages} />
      <StageLog stage={item.stages[selected]} />
    </box>
  );
}
