import type { ReactNode } from 'react';

import type { UnfiledStoryView } from '../../../shared/model';

import { useTheme } from '../../../shared/theme';

const ID_ROOM = 12;

function UnfiledRow({ story }: { story: UnfiledStoryView }): ReactNode {
  const { theme } = useTheme();

  return (
    <text wrapMode="none">
      <span fg={theme.text}>{'  '}</span>
      <strong>{story.id.padEnd(ID_ROOM)}</strong>
      <span fg={theme.subtext}>{story.name}</span>
    </text>
  );
}

export function UnfiledRows({ stories }: { stories: UnfiledStoryView[] }): ReactNode {
  return stories.map((story): ReactNode => <UnfiledRow key={story.id} story={story} />);
}
