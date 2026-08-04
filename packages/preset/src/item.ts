export interface PresetFile {
  path: string;
  type: 'registry:file';
  target: string;
  encoding?: 'base64';
}

// A preset offers what suits it. A tool that reads a screen has nothing to say
// about a command line, so the preset that governs one never asks for it.
export interface StageReference {
  stage: string;
  reference: string;
}

interface OfferedIntegration {
  name: string;
  asks: string;
  installs?: string[];
}

// An integration either puts files in a project or changes what an agent
// reaches for at a stage. A design gallery is the second kind, and demanding a
// file from it would be demanding the wrong thing.
export type PresetIntegration =
  | (OfferedIntegration & { files: PresetFile[] })
  | (OfferedIntegration & { reaches: StageReference });

export function installsOf(integration: PresetIntegration): string[] {
  return integration.installs ?? [];
}

export function filesOf(integration: PresetIntegration): PresetFile[] {
  return 'files' in integration ? integration.files : [];
}

export function reachesNothing(integration: PresetIntegration): boolean {
  return filesOf(integration).length === 0 && !('reaches' in integration);
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

export function copies(path: string, target: string): PresetFile {
  return {
    path: `files/${path}`,
    type: 'registry:file',
    target: `~/${target}`,
    encoding: 'base64',
  };
}

export function everyFileOf(item: PresetItem): PresetFile[] {
  return [...item.files, ...item.integrations.flatMap(filesOf)];
}

// A kind reaches a proposal the session reads, so a write path cannot name it
// anything the shape here does not allow.
const EXTENSION_BODY = /^[A-Za-z0-9]+$/u;

const EXTENSION_LIMIT = 16;

export function fileKindOf(path: string): string | undefined {
  const dot = path.lastIndexOf('.');
  const slash = path.lastIndexOf('/');

  if (dot <= slash + 1) {
    return undefined;
  }

  const body = path.slice(dot + 1);

  return body.length <= EXTENSION_LIMIT && EXTENSION_BODY.test(body) ? path.slice(dot) : undefined;
}

export function fileKindsOf(item: PresetItem): string[] {
  const kinds = everyFileOf(item)
    .map((file) => fileKindOf(file.target))
    .filter((kind): kind is string => kind !== undefined);

  return [...new Set(kinds)].toSorted();
}

const PIN_SEPARATOR = '@';

function nameOfPin(pin: string): string {
  return pin.slice(0, pin.lastIndexOf(PIN_SEPARATOR));
}

export function dependencyNamesOf(item: PresetItem): string[] {
  return [...item.dependencies, ...item.devDependencies].map(nameOfPin);
}
