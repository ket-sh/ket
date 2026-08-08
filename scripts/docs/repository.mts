import { spawnSync } from 'node:child_process';

function gitLines(args: string[]): string[] {
  const ran = spawnSync('git', args, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });

  if (ran.error !== undefined || ran.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${ran.error?.message ?? ran.stderr}`);
  }

  return ran.stdout.split('\n').filter((line) => line !== '');
}

export function trackedFiles(): string[] {
  return gitLines(['ls-files']);
}

export function changedFiles(baseSha: string | undefined): string[] {
  if (baseSha === undefined) {
    return gitLines(['diff', '--name-only', 'HEAD']);
  }

  return gitLines(['diff', '--name-only', `${baseSha}..HEAD`]);
}
