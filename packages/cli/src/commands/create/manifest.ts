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

export function renderManifest(name: string, source: ManifestSource): string {
  return `${JSON.stringify(
    {
      name,
      type: 'module',
      scripts: source.scripts,
      dependencies: asRanges(source.dependencies),
      devDependencies: asRanges(source.devDependencies),
    },
    undefined,
    2,
  )}\n`;
}
