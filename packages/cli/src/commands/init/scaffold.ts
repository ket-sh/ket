import type { ScaffoldFile } from '../../shared/write-files.ts';

import { KET_DIRECTORY } from './plan.ts';

export interface ProjectConfiguration {
  key: string;
}

function configContents(configuration: ProjectConfiguration): string {
  return `export default {\n  key: '${configuration.key}',\n};\n`;
}

function boardContents(configuration: ProjectConfiguration): string {
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

export function scaffoldFiles(configuration: ProjectConfiguration): ScaffoldFile[] {
  return [
    { path: `${KET_DIRECTORY}/config.ts`, contents: configContents(configuration) },
    { path: `${KET_DIRECTORY}/BOARD.md`, contents: boardContents(configuration) },
    { path: `${KET_DIRECTORY}/items/.gitkeep`, contents: '' },
  ];
}

export function scaffoldFor(
  configuration: ProjectConfiguration,
  gitignore: string,
): ScaffoldFile[] {
  const ignored = withEventsIgnored(gitignore);

  if (ignored === undefined) {
    return scaffoldFiles(configuration);
  }

  return [...scaffoldFiles(configuration), { path: '.gitignore', contents: ignored }];
}
