export interface PresetFile {
  path: string;
  type: 'registry:file';
  target: string;
}

// A preset offers what suits it. A tool that reads a screen has nothing to say
// about a command line, so the preset that governs one never asks for it.
export interface PresetIntegration {
  name: string;
  asks: string;
  files: PresetFile[];
}

export interface PresetItem {
  $schema: string;
  name: string;
  type: 'registry:item';
  title: string;
  description: string;
  dependencies: string[];
  devDependencies: string[];
  files: PresetFile[];
  integrations: PresetIntegration[];
}

export function writes(path: string, target: string): PresetFile {
  return { path: `files/${path}`, type: 'registry:file', target: `~/${target}` };
}

export function everyFileOf(item: PresetItem): PresetFile[] {
  return [...item.files, ...item.integrations.flatMap((integration) => integration.files)];
}

const PIN_SEPARATOR = '@';

function nameOfPin(pin: string): string {
  return pin.slice(0, pin.lastIndexOf(PIN_SEPARATOR));
}

export function dependencyNamesOf(item: PresetItem): string[] {
  return [...item.dependencies, ...item.devDependencies].map(nameOfPin);
}
