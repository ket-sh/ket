import type { ReactNode } from 'react';

import type { JourneyView } from '../../../shared/model';

import { useTheme } from '../../../shared/theme';

const NOTHING_WRITTEN = 'No description written.';

export function OverviewPanel({
  journey,
  width,
}: {
  journey: JourneyView;
  width: number;
}): ReactNode {
  const { theme } = useTheme();
  const { description } = journey;

  return (
    <box flexDirection="column" width={Math.max(20, width - 4)}>
      <text fg={theme.text}>{journey.title}</text>
      <text fg={theme.subtext}> </text>
      {description === undefined ? (
        <text fg={theme.overlay}>{NOTHING_WRITTEN}</text>
      ) : (
        <text fg={theme.text}>{description}</text>
      )}
    </box>
  );
}
