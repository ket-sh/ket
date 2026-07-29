import type { PresetName } from './configuration.ts';

function governs(directory: string, path: string): boolean {
  return path === directory || path.startsWith(`${directory}/`);
}

export function resolveTarget(
  path: string,
  targets: Record<string, PresetName>,
): PresetName | undefined {
  const governing = Object.entries(targets)
    .filter(([directory]) => governs(directory, path))
    .sort(([left], [right]) => right.length - left.length);

  return governing[0]?.[1];
}
