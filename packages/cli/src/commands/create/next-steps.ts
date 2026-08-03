export interface Step {
  says: string;
  runs: string;
}

const STARTING_SCRIPTS = [
  { script: 'dev', says: 'Start the loop' },
  { script: 'test', says: 'Run the suite' },
  { script: 'build', says: 'Build it' },
];

function asArgument(directory: string): string {
  return directory.includes(' ') ? `"${directory}"` : directory;
}

function entering(directory: string): Step[] {
  return directory === '.' ? [] : [{ says: 'Move into it', runs: `cd ${asArgument(directory)}` }];
}

function starting(scripts: Record<string, string>): Step[] {
  const found = STARTING_SCRIPTS.find((candidate) => Object.hasOwn(scripts, candidate.script));

  return found === undefined ? [] : [{ says: found.says, runs: `bun run ${found.script}` }];
}

const GALLERY_SCRIPT = { script: 'storybook', says: 'Open the component gallery' };

function browsing(scripts: Record<string, string>): Step[] {
  return Object.hasOwn(scripts, GALLERY_SCRIPT.script)
    ? [{ says: GALLERY_SCRIPT.says, runs: `bun run ${GALLERY_SCRIPT.script}` }]
    : [];
}

export function nextSteps(directory: string, scripts: Record<string, string>): Step[] {
  return [
    ...entering(directory),
    { says: 'Install the toolchain', runs: 'bun install' },
    ...starting(scripts),
    ...browsing(scripts),
  ];
}
