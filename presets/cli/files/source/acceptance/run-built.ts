import { spawn } from 'node:child_process';
import { join } from 'node:path';

// A scenario drives the binary a person would run rather than the source it was
// built from. Anything short of that leaves the build itself unasserted.
const BUILT = join(process.cwd(), 'dist', 'app');

export async function runBuilt(command: string): Promise<string> {
  return new Promise((settle, refuse) => {
    const running = spawn(BUILT, command.split(' '));
    let said = '';

    running.stdout.on('data', (chunk: Buffer) => {
      said += chunk.toString();
    });

    running.on('error', refuse);
    running.on('close', () => {
      settle(said);
    });
  });
}
