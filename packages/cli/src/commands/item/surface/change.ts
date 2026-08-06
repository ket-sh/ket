import { execFile } from 'node:child_process';

const DIFF_BUDGET = 64 * 1024 * 1024;

async function gitOut(root: string, flags: string[]): Promise<string | undefined> {
  return new Promise((resolveOut) => {
    execFile('git', ['-C', root, ...flags], { maxBuffer: DIFF_BUDGET }, (failed, stdout) => {
      resolveOut(failed === null ? stdout : undefined);
    });
  });
}

async function mergeBase(root: string): Promise<string | undefined> {
  const fromOrigin = await gitOut(root, ['merge-base', 'origin/main', 'HEAD']);

  if (fromOrigin !== undefined) {
    return fromOrigin.trim();
  }

  return (await gitOut(root, ['merge-base', 'main', 'HEAD']))?.trim();
}

export async function changeDiff(root: string): Promise<string> {
  const base = await mergeBase(root);
  const committed = base === undefined ? undefined : await gitOut(root, ['diff', `${base}..HEAD`]);
  const working = await gitOut(root, ['diff', 'HEAD']);

  return `${committed ?? ''}${working ?? ''}`;
}
