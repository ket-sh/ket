import type { Configuration } from '../../shared/configuration.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';

import { CONFIGURATION_FILE, renderConfiguration } from '../../shared/configuration-file.ts';
import { KET_DIRECTORY } from './plan.ts';

const EVENTS_IGNORE_RULE = `${KET_DIRECTORY}/events.jsonl`;

export function withEventsIgnored(gitignore: string): string | undefined {
  const lines = gitignore.split('\n').map((line) => line.trim());

  if (lines.includes(EVENTS_IGNORE_RULE)) {
    return undefined;
  }

  const opening = gitignore === '' || gitignore.endsWith('\n') ? gitignore : `${gitignore}\n`;

  return `${opening}${EVENTS_IGNORE_RULE}\n`;
}

function itemState(configuration: Configuration): ScaffoldFile[] {
  return configuration.workflow ? [{ path: `${KET_DIRECTORY}/items/.gitkeep`, contents: '' }] : [];
}

export function scaffoldFiles(configuration: Configuration): ScaffoldFile[] {
  return [
    {
      path: `${KET_DIRECTORY}/${CONFIGURATION_FILE}`,
      contents: renderConfiguration(configuration),
    },
    ...itemState(configuration),
  ];
}

export function scaffoldFor(configuration: Configuration, gitignore: string): ScaffoldFile[] {
  const ignored = withEventsIgnored(gitignore);

  if (ignored === undefined) {
    return scaffoldFiles(configuration);
  }

  return [...scaffoldFiles(configuration), { path: '.gitignore', contents: ignored }];
}
