import type { ReactNode } from 'react';

import type { JourneyView } from '../../../shared/model';

import { markdownStyleOf, useTheme } from '../../../shared/theme';

const NOTHING_WRITTEN = 'No description written.';

function DescriptionPreview({
  description,
  height,
  live,
}: {
  description: string;
  height: number;
  live: boolean;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <scrollbox
      scrollY
      focused={live}
      height={Math.max(4, height - 2)}
      verticalScrollbarOptions={{
        trackOptions: { foregroundColor: theme.surface1, backgroundColor: theme.base },
      }}
    >
      <markdown content={description} syntaxStyle={markdownStyleOf(theme)} />
    </scrollbox>
  );
}

export function OverviewPanel({
  journey,
  width,
  height,
  live,
}: {
  journey: JourneyView;
  width: number;
  height: number;
  live: boolean;
}): ReactNode {
  const { theme } = useTheme();
  const { description } = journey;

  return (
    <box flexDirection="column" width={Math.max(20, width - 2)}>
      <text fg={theme.text}>{journey.title}</text>
      <text fg={theme.subtext}> </text>
      {description === undefined ? (
        <text fg={theme.overlay}>{NOTHING_WRITTEN}</text>
      ) : (
        <DescriptionPreview description={description} height={height} live={live} />
      )}
    </box>
  );
}
