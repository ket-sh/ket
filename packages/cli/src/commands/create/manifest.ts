export interface ManifestSource {
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
}

function splitPin(pin: string): [string, string] {
  const at = pin.lastIndexOf('@');

  return [pin.slice(0, at), pin.slice(at + 1)];
}

function asRanges(pins: string[]): Record<string, string> {
  return Object.fromEntries(
    pins.map(splitPin).toSorted(([left], [right]) => left.localeCompare(right)),
  );
}

const BUN_FLOOR = '>=1.3.14';

export function renderManifest(name: string, source: ManifestSource): string {
  return `${JSON.stringify(
    {
      name,
      type: 'module',
      scripts: source.scripts,
      dependencies: asRanges(source.dependencies),
      devDependencies: asRanges(source.devDependencies),
      engines: { bun: BUN_FLOOR },
    },
    undefined,
    2,
  )}\n`;
}
