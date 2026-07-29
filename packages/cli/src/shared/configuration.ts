export type PresetName = 'cli' | 'tui' | 'web' | 'api' | 'desktop' | 'mobile';

export interface Configuration {
  key: string;
  targets: Record<string, PresetName>;
}

function renderTargets(targets: Record<string, PresetName>): string {
  const entries = Object.entries(targets);

  if (entries.length === 0) {
    return '{}';
  }

  const lines = entries.map(([directory, preset]) => `    '${directory}': '${preset}',`);

  return `{\n${lines.join('\n')}\n  }`;
}

export function renderConfiguration(configuration: Configuration): string {
  return [
    'export default {',
    `  key: '${configuration.key}',`,
    `  targets: ${renderTargets(configuration.targets)},`,
    '};',
    '',
  ].join('\n');
}
