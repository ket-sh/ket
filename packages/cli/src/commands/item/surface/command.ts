import { defineCommand } from 'citty';
import { spawn } from 'node:child_process';

import { ketRootOrThrow } from '../../../shared/locate.ts';
import { showSurface } from './show.ts';

function opensBrowser(address: string): void {
  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';

  spawn(command, [address], { stdio: 'ignore', detached: true }).unref();
}

export const show = defineCommand({
  meta: { name: 'show', description: 'Open the review surface an item is judged on' },
  args: {
    key: { type: 'positional', required: true, description: 'The item to show' },
    headless: { type: 'boolean', description: 'Print the address without opening a browser' },
  },
  async run({ args }) {
    const root = await ketRootOrThrow(process.cwd());
    const handle = await showSurface(
      root,
      args.key,
      args.headless === true ? undefined : opensBrowser,
    );

    process.stdout.write(`${JSON.stringify({ address: handle.address, port: handle.port })}\n`);
  },
});
