export const PRESET_NAMES = ['cli', 'tui', 'web', 'api', 'desktop', 'mobile'] as const;

export type PresetName = (typeof PRESET_NAMES)[number];

export interface Configuration {
  key: string;
  targets: Record<string, PresetName>;
  integrations: string[];
  language: string;
  workflow: boolean;
}
