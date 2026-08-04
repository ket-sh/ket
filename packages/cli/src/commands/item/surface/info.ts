import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readArtifact } from './artifacts.ts';

export interface SurfaceInfo {
  address: string;
  port: number;
  pid: number;
}

const INFO_FILE = '.surface.json';

function infoPath(itemDir: string): string {
  return join(itemDir, INFO_FILE);
}

const fieldIs = (value: object, field: string, kind: 'string' | 'number'): boolean =>
  typeof Reflect.get(value, field) === kind;

function isSurfaceInfo(parsed: unknown): parsed is SurfaceInfo {
  return (
    parsed !== null &&
    typeof parsed === 'object' &&
    fieldIs(parsed, 'address', 'string') &&
    fieldIs(parsed, 'port', 'number') &&
    fieldIs(parsed, 'pid', 'number')
  );
}

function surfaceInfoOf(raw: string): SurfaceInfo | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);

    return isSurfaceInfo(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function readInfo(itemDir: string): Promise<SurfaceInfo | undefined> {
  const raw = await readArtifact(itemDir, INFO_FILE);

  return raw === undefined ? undefined : surfaceInfoOf(raw);
}

export async function writeInfo(itemDir: string, info: SurfaceInfo): Promise<void> {
  await writeFile(infoPath(itemDir), JSON.stringify(info));
}

export async function removeInfo(itemDir: string): Promise<void> {
  await rm(infoPath(itemDir), { force: true });
}

export const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};

export function signalForeign(info: SurfaceInfo | undefined): void {
  if (info === undefined || info.pid === process.pid || !alive(info.pid)) {
    return;
  }

  try {
    process.kill(info.pid);
  } catch {
    // A pid that died between the liveness check and the signal is already stopped.
  }
}
