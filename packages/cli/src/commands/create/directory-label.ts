import { sep } from 'node:path';

function underHome(directory: string, home: string): boolean {
  return directory === home || directory.startsWith(`${home}${sep}`);
}

export function directoryLabel(directory: string, home: string): string {
  const shown = underHome(directory, home) ? `~${directory.slice(home.length)}` : directory;

  return `${shown}${sep}`;
}
