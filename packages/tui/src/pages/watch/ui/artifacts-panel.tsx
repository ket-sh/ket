import type { ReactNode } from 'react';

import type { JourneyArtifactView, JourneyView } from '../../../shared/model';

import { useTheme } from '../../../shared/theme';
import { DocRows } from './doc-rows.tsx';

const SIDEBAR = 26;

const NOTHING_WRITTEN = 'No artifacts written yet.';

function ArtifactName({
  artifact,
  chosen,
}: {
  artifact: JourneyArtifactView;
  chosen: boolean;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <text fg={chosen ? theme.text : theme.subtext} wrapMode="none">
      {`${chosen ? '►' : ' '} ${artifact.name}`}
    </text>
  );
}

function ChosenContent({
  artifact,
  height,
}: {
  artifact: JourneyArtifactView | undefined;
  height: number;
}): ReactNode {
  const { theme } = useTheme();

  if (artifact?.doc === undefined) {
    return <text fg={theme.overlay}>{NOTHING_WRITTEN}</text>;
  }

  return (
    <box flexDirection="column">
      <DocRows doc={artifact.doc} audience="technical" from={0} room={height} />
    </box>
  );
}

export function ArtifactsPanel({
  journey,
  pick,
  height,
}: {
  journey: JourneyView;
  pick: number;
  height: number;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="row">
      <box flexDirection="column" width={SIDEBAR}>
        {journey.artifacts.map(
          (artifact, index): ReactNode => (
            <ArtifactName key={artifact.path} artifact={artifact} chosen={index === pick} />
          ),
        )}
      </box>
      <box
        flexDirection="column"
        borderStyle="rounded"
        borderColor={theme.overlay}
        border={['left']}
      >
        <ChosenContent artifact={journey.artifacts[pick]} height={height} />
      </box>
    </box>
  );
}
