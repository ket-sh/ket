import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from 'node:process';

const TOOLBOX = 'KET_TOOLBOX';

const RUN_ROOT = 'KET_TOOLBOX_ROOT';

const REAL_RUNTIME = 'KET_REAL_BUN';

const SHIMMED = ['bun', 'bunx'] as const;

type Shimmed = (typeof SHIMMED)[number];

function dispatchThrough(where: string, tool: string): string {
  return `#!/bin/sh\nexec /bin/sh "${join(where, tool)}-behaves" "$@"\n`;
}

function untaught(tool: string): string {
  return `echo "nobody taught the toolbox how ${tool} behaves" >&2\nexit 1\n`;
}

function shimInto(where: string, tool: string): void {
  const shim = join(where, tool);

  if (existsSync(shim)) {
    return;
  }

  writeFileSync(shim, dispatchThrough(where, tool));
  chmodSync(shim, 0o755);
  writeFileSync(`${shim}-behaves`, untaught(tool));
}

function outsideToolboxes(path: string): string {
  return path
    .split(':')
    .filter((entry) => !entry.startsWith(tmpdir()))
    .join(':');
}

function runtimeUsable(held: string | undefined): held is string {
  return held !== undefined && held !== '' && !held.startsWith(tmpdir());
}

function runtimeRecorded(): void {
  if (runtimeUsable(env[REAL_RUNTIME])) {
    return;
  }

  try {
    env[REAL_RUNTIME] = execFileSync('/bin/sh', ['-c', 'command -v bun'], {
      encoding: 'utf8',
      env: { PATH: outsideToolboxes(env['PATH'] ?? '') },
    }).trim();
  } catch {
    delete env[REAL_RUNTIME];
  }
}

export function realBun(): string {
  const held = env[REAL_RUNTIME];

  if (held === undefined || held === '') {
    throw new Error('the toolbox recorded no bun runtime outside itself; is bun installed?');
  }

  return held;
}

function toolboxHeld(): string | undefined {
  const held = env[TOOLBOX];

  if (held === undefined || !existsSync(held)) {
    return undefined;
  }

  return held.startsWith(env[RUN_ROOT] ?? tmpdir()) ? held : undefined;
}

function toolboxRaised(): string {
  const held = toolboxHeld();

  if (held !== undefined) {
    return held;
  }

  const where = mkdtempSync(join(env[RUN_ROOT] ?? tmpdir(), 'ket-toolbox-'));

  env[TOOLBOX] = where;

  return where;
}

function pathLedBy(where: string): string {
  const path = env['PATH'] ?? '';

  return path.split(':').includes(where) ? path : `${where}:${path}`;
}

runtimeRecorded();

const raised = toolboxRaised();

// An installer abandoned by a timed-out test keeps running after every hook,
// so the toolbox stays on PATH for the worker's whole life.
env['PATH'] = pathLedBy(raised);

for (const tool of SHIMMED) {
  shimInto(raised, tool);
}

export async function teach(tool: Shimmed, behaves: string): Promise<void> {
  await writeFile(join(raised, `${tool}-behaves`), behaves, 'utf8');
}
