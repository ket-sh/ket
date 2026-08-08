interface Rename {
  was: string;
  now: string;
  say: (rename: Rename) => string;
}

function rewriting(rename: Rename): string {
  return `rewrite ${rename.was} as ${rename.now}, since a configuration is data now rather than a module ket runs`;
}

function renaming(rename: Rename): string {
  return `rename ${rename.was} to ${rename.now}, which reads unchanged because json already parses as yaml`;
}

const RENAMES: Rename[] = [
  { was: '.ket/config.ts', now: '.ket/config.yaml', say: rewriting },
  { was: '.ket/toolchain.json', now: '.ket/toolchain.yaml', say: renaming },
  { was: '.ket/scaffold.json', now: '.ket/scaffold.yaml', say: renaming },
];

export const LEGACY_STATE: string[] = RENAMES.map((rename) => rename.was);

const OPENING =
  'this project keeps its state under names an older ket wrote, and update cannot rewrite it for you';

export function legacyRefusal(present: string[]): string | undefined {
  const found = RENAMES.filter((rename) => present.includes(rename.was));

  if (found.length === 0) {
    return undefined;
  }

  return [OPENING, ...found.map((rename) => rename.say(rename))].join('; ');
}
