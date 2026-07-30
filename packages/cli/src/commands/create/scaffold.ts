import type { Configuration } from '../../shared/configuration.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';

import { renderConfiguration } from '../../shared/configuration.ts';
import { KET_DIRECTORY } from './plan.ts';

function boardContents(configuration: Configuration): string {
  return `# ${configuration.key} board\n\nNo items yet. Run /ket:feature to file the first one.\n`;
}

const EVENTS_IGNORE_RULE = `${KET_DIRECTORY}/events.jsonl`;

export function withEventsIgnored(gitignore: string): string | undefined {
  const lines = gitignore.split('\n').map((line) => line.trim());

  if (lines.includes(EVENTS_IGNORE_RULE)) {
    return undefined;
  }

  const opening = gitignore === '' || gitignore.endsWith('\n') ? gitignore : `${gitignore}\n`;

  return `${opening}${EVENTS_IGNORE_RULE}\n`;
}

export function scaffoldFiles(configuration: Configuration): ScaffoldFile[] {
  return [
    { path: `${KET_DIRECTORY}/config.ts`, contents: renderConfiguration(configuration) },
    { path: `${KET_DIRECTORY}/BOARD.md`, contents: boardContents(configuration) },
    { path: `${KET_DIRECTORY}/items/.gitkeep`, contents: '' },
  ];
}

export function scaffoldFor(configuration: Configuration, gitignore: string): ScaffoldFile[] {
  const ignored = withEventsIgnored(gitignore);

  if (ignored === undefined) {
    return scaffoldFiles(configuration);
  }

  return [...scaffoldFiles(configuration), { path: '.gitignore', contents: ignored }];
}
