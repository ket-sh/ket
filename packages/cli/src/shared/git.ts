import { spawn } from 'node:child_process';

// A scaffold is somebody else's work, so it belongs in its own commit. Without
// one the user's first diff is ket's output tangled with their own.
const SCAFFOLD_MESSAGE = 'chore: scaffold with ket';

export type FirstCommit = { committed: true } | { refused: string };

async function ran(argv: string[], root: string): Promise<string | undefined> {
  return new Promise((settle) => {
    const [binary, ...rest] = argv;
    const git = spawn(binary ?? '', rest, { cwd: root });
    let said = '';

    const gather = (chunk: Buffer): void => {
      said += chunk.toString();
    };

    git.stdout.on('data', gather);
    git.stderr.on('data', gather);
    git.on('error', (cause: Error) => {
      settle(cause.message);
    });

    git.on('close', (code) => {
      settle(code === 0 ? undefined : said.trim());
    });
  });
}

export async function initializeRepository(root: string): Promise<void> {
  const said = await ran(['git', 'init', '--quiet'], root);

  if (said !== undefined) {
    throw new Error(`git init failed in ${root}: ${said}`);
  }
}

// The commit hooks arrive with bun install, which the user runs afterwards, so
// there is nothing here to step around.
export async function commitScaffold(root: string): Promise<FirstCommit> {
  const staged = await ran(['git', 'add', '--all'], root);

  if (staged !== undefined) {
    return { refused: staged };
  }

  const said = await ran(['git', 'commit', '--quiet', '--message', SCAFFOLD_MESSAGE], root);

  return said === undefined ? { committed: true } : { refused: said };
}
