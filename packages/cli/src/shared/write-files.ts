import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

export interface ScaffoldFile {
  path: string;
  contents: string;
  encoding?: 'base64';
}

function resolveInside(root: string, path: string): string {
  const target = resolve(root, path);
  const step = relative(root, target);

  if (step.startsWith(`..${sep}`) || step === '..') {
    throw new Error(`${path} resolves outside the repository at ${root}`);
  }

  return target;
}

export async function readTextIfPresent(root: string, path: string): Promise<string> {
  try {
    return await readFile(resolveInside(root, path), 'utf8');
  } catch {
    return '';
  }
}

export async function writeFiles(root: string, files: ScaffoldFile[]): Promise<void> {
  for (const file of files) {
    const target = resolveInside(root, file.path);

    await mkdir(dirname(target), { recursive: true });

    if (file.encoding === 'base64') {
      await writeFile(target, Buffer.from(file.contents, 'base64'));
    } else {
      await writeFile(target, file.contents, 'utf8');
    }
  }
}
