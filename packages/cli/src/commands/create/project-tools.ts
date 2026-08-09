import { spawn } from 'node:child_process';

// A tool may log its failures through a prompt library that writes to stdout,
// so a reader watching stderr would call every failure a success. The exit code
// is the only answer, and both streams are gathered only to quote it back.
export async function toolRefusal(
  argv: string[],
  root: string,
  deadlineMs: number,
  environment: Record<string, string>,
): Promise<string | undefined> {
  return new Promise((settle) => {
    const [binary, ...rest] = argv;
    const tool = spawn(binary ?? '', rest, {
      cwd: root,
      env: { ...process.env, ...environment },
    });
    let said = '';

    const gather = (chunk: Buffer): void => {
      said += chunk.toString();
    };

    const giveUp = setTimeout(() => {
      tool.kill();
      settle(`it was still running after ${String(deadlineMs)}ms`);
    }, deadlineMs);

    tool.stdout.on('data', gather);
    tool.stderr.on('data', gather);
    tool.on('error', (cause: Error) => {
      clearTimeout(giveUp);
      settle(cause.message);
    });
    tool.on('close', (code) => {
      clearTimeout(giveUp);
      settle(code === 0 ? undefined : said.trim());
    });
  });
}
