import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

export interface ScaffoldRecord {
  version: 1;
  ket: string;
  files: Record<string, string>;
}

export type FileFate =
  | 'settled'
  | 'refreshed'
  | 'restored'
  | 'converged'
  | 'held'
  | 'arrived'
  | 'departed';

export interface PlannedFate {
  path: string;
  fate: FileFate;
}

interface WrittenFile {
  path: string;
  contents: string;
  encoding?: 'base64';
}

export function hashOf(contents: string | Buffer): string {
  return createHash('sha256').update(contents).digest('hex');
}

function landedBytesOf(file: WrittenFile): string | Buffer {
  return file.encoding === 'base64' ? Buffer.from(file.contents, 'base64') : file.contents;
}

export function scaffoldRecordOf(files: WrittenFile[], ket: string): ScaffoldRecord {
  return {
    version: 1,
    ket,
    files: Object.fromEntries(files.map((file) => [file.path, hashOf(landedBytesOf(file))])),
  };
}

export function renderScaffoldRecord(record: ScaffoldRecord): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}

export const SCAFFOLD_RECORD_PATH = '.ket/scaffold.json';

// ket appends project state to the gitignore after the preset writes it, so
// its hash never matches what landed and it stays out of the record.
const MERGED_PATHS = new Set(['.gitignore']);

export function recordedAmong<File extends WrittenFile>(files: File[]): File[] {
  return files.filter((file) => !MERGED_PATHS.has(file.path));
}

export function scaffoldRecordFile(files: WrittenFile[], ket: string): WrittenFile {
  return {
    path: SCAFFOLD_RECORD_PATH,
    contents: renderScaffoldRecord(scaffoldRecordOf(files, ket)),
  };
}

export function updatePlanOf(
  record: ScaffoldRecord,
  disk: Record<string, string | undefined>,
  fresh: WrittenFile[],
): PlannedFate[] {
  const shipped = fresh.map((file) => ({
    path: file.path,
    fate: fateOf(record.files[file.path], disk[file.path], hashOf(landedBytesOf(file))),
  }));
  const shippedPaths = new Set(fresh.map((file) => file.path));
  const departed = Object.keys(record.files)
    .filter((path) => !shippedPaths.has(path))
    .map((path) => ({ path, fate: 'departed' as const }));

  return [...shipped, ...departed];
}

function recordShaped(declared: unknown): declared is Record<string, unknown> {
  return declared !== null && typeof declared === 'object' && !Array.isArray(declared);
}

function filesFrom(declared: unknown): Record<string, string> | undefined {
  if (!recordShaped(declared)) {
    return undefined;
  }

  const files: Record<string, string> = {};

  for (const [path, hash] of Object.entries(declared)) {
    if (typeof hash !== 'string') {
      return undefined;
    }

    files[path] = hash;
  }

  return files;
}

function parsedOf(source: string): unknown {
  try {
    return JSON.parse(source);
  } catch {
    return undefined;
  }
}

function recordFrom(parsed: object): ScaffoldRecord | undefined {
  const ket: unknown = Reflect.get(parsed, 'ket');
  const files = filesFrom(Reflect.get(parsed, 'files'));

  if (Reflect.get(parsed, 'version') !== 1 || typeof ket !== 'string' || files === undefined) {
    return undefined;
  }

  return { version: 1, ket, files };
}

export function parseScaffoldRecord(source: string): ScaffoldRecord | undefined {
  const parsed = parsedOf(source);

  return parsed !== null && typeof parsed === 'object' ? recordFrom(parsed) : undefined;
}

function fateOnDisk(recorded: string | undefined, disk: string, fresh: string): FileFate {
  if (disk === fresh) {
    return recorded === disk ? 'settled' : 'converged';
  }

  return recorded === disk ? 'refreshed' : 'held';
}

export function fateOf(
  recorded: string | undefined,
  disk: string | undefined,
  fresh: string,
): FileFate {
  if (disk !== undefined) {
    return fateOnDisk(recorded, disk, fresh);
  }

  return recorded === undefined ? 'arrived' : 'restored';
}
