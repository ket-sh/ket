import type { ReactNode } from 'react';

import type { StageView } from '../../../shared/model';

import { appearanceOf } from '../../../shared/lib';
import { returnsWithin } from '../../../shared/lib';

const FAINT = '#464646';

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

export function StageGraph({
  stages,
  selected,
  tick,
}: {
  stages: StageView[];
  selected: number;
  tick: number;
}): ReactNode {
  return (
    <box flexDirection="column" flexShrink={0}>
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
      <ReturnHint stages={stages} />
    </box>
  );
}
