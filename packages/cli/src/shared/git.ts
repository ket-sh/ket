import { spawn } from 'node:child_process';

export async function initializeRepository(root: string): Promise<void> {
  await new Promise<void>((settle, fail) => {
    const git = spawn('git', ['init', '--quiet'], { cwd: root, stdio: 'ignore' });

    git.on('error', fail);
    git.on('close', (code) => {
      if (code === 0) {
        settle();

        return;
      }

      fail(new Error(`git init exited with ${String(code)} in ${root}`));
    });
  });
}
