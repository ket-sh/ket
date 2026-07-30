export const PRESET_NAMES = ['cli', 'tui', 'web', 'api', 'desktop', 'mobile'] as const;

export type PresetName = (typeof PRESET_NAMES)[number];

export interface Configuration {
  key: string;
  targets: Record<string, PresetName>;
  integrations: string[];
}

function renderIntegrations(names: string[]): string {
  return `[${names.map((name) => `'${name}'`).join(', ')}]`;
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
    `  integrations: ${renderIntegrations(configuration.integrations)},`,
    '};',
    '',
  ].join('\n');
}
