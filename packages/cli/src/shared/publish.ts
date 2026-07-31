import { segmentsIn } from './command-writes.ts';

const PUBLISHES = [
  ['git', 'push'],
  ['gh', 'pr', 'create'],
];

function opens(segment: string[], publishing: string[]): boolean {
  return publishing.every((word, at) => segment[at] === word);
}

export function publishesWork(command: string): boolean {
  return segmentsIn(command).some((segment) =>
    PUBLISHES.some((publishing) => opens(segment, publishing)),
  );
}
