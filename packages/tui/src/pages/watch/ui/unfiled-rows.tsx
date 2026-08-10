import type { ReactNode } from 'react';

import type { UnfiledStoryView } from '../../../shared/model';

import { useTheme } from '../../../shared/theme';

const ID_ROOM = 12;

function UnfiledRow({ story, chosen }: { story: UnfiledStoryView; chosen: boolean }): ReactNode {
  const { theme } = useTheme();

  return (
    <text wrapMode="none">
      <span fg={theme.text}>{chosen ? '► ' : '  '}</span>
      <strong>{story.id.padEnd(ID_ROOM)}</strong>
      <span fg={chosen ? theme.text : theme.subtext}>{story.name}</span>
    </text>
  );
}

export function UnfiledRows({
  stories,
  chosenId,
}: {
  stories: UnfiledStoryView[];
  chosenId: string | undefined;
}): ReactNode {
  return stories.map(
    (story): ReactNode => (
      <UnfiledRow key={story.id} story={story} chosen={story.id === chosenId} />
    ),
  );
}
