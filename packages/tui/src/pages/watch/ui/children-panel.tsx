import type { ReactNode } from 'react';

import type { JourneyChildView, JourneyView } from '../../../shared/model';

import { ageOf } from '../../../shared/lib';
import { stageColorOf, useTheme } from '../../../shared/theme';

const SHIPPED = 'shipped';

function glyphOf(child: JourneyChildView): string {
  return child.status === SHIPPED ? '✓' : '○';
}

function ChildRow({
  child,
  chosen,
  now,
}: {
  child: JourneyChildView;
  chosen: boolean;
  now: string;
}): ReactNode {
  const { theme } = useTheme();
  const age = child.since === undefined ? '' : ageOf(child.since, now);
  const spoken = `${chosen ? '►' : ' '} ${glyphOf(child)} ${child.key}  ${child.title}  ${child.size}  ${age}`;

  return (
    <box flexDirection="column">
      <text fg={chosen ? theme.text : theme.subtext} wrapMode="none">
        {spoken}
      </text>
      {child.refusal === undefined ? null : (
        <text fg={theme.red} wrapMode="none">{`      ! ${child.refusal.reason}`}</text>
      )}
    </box>
  );
}

export function ChildrenPanel({
  journey,
  pick,
  now,
}: {
  journey: JourneyView;
  pick: number;
  now: string;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column">
      <text fg={stageColorOf(theme)['triaged'] ?? theme.blue} wrapMode="none">
        {`  ${String(journey.children.length)} children`}
      </text>
      {journey.children.map(
        (child, index): ReactNode => (
          <ChildRow key={child.key} child={child} chosen={index === pick} now={now} />
        ),
      )}
    </box>
  );
}
