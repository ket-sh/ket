import type { ReactNode } from 'react';

import { useKeyboard } from '@opentui/react';
import { useEffect, useState } from 'react';

import type { ItemView } from '../../../shared/model';

import { FRAME_INTERVAL } from '../../../shared/lib';
import { StageGraph } from './stage-graph.tsx';
import { StageLog } from './stage-log.tsx';

const MUTED = '#5f5f5f';

const FAINT = '#464646';

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

export function WatchPage({ item }: { item: ItemView }): ReactNode {
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

      <StageGraph stages={item.stages} selected={selected} tick={tick} />
      <StageLog stage={item.stages[selected]} />
    </box>
  );
}
