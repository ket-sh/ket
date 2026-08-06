import type { ExecException } from 'node:child_process';

import { execFile } from 'node:child_process';
import { join } from 'node:path';

import type { BlastRender } from './blast.ts';
import type { RenderedDiagram } from './page.ts';

import { readArtifact } from './artifacts.ts';

const SOURCE = 'architecture.d2';

const BLAST_SOURCE = 'blast.d2';

const DARK_THEME = '200';

const SVG_BUDGET = 16 * 1024 * 1024;

type Attempt = { svg: string } | { refusal: string };

function refusalOf(failed: ExecException, binary: string, source: string): string {
  if (failed.code === 'ENOENT') {
    return `${binary} is missing: install d2 (brew install d2) to render ${source}`;
  }

  return `${binary} refused ${source}: ${failed.message}`;
}

async function attempted(binary: string, flags: string[], source: string): Promise<Attempt> {
  return new Promise((resolveRender) => {
    execFile(binary, flags, { maxBuffer: SVG_BUDGET }, (failed, stdout) => {
      if (failed === null) {
        resolveRender({ svg: stdout });

        return;
      }

      resolveRender({ refusal: refusalOf(failed, binary, source) });
    });
  });
}

async function captured(binary: string, flags: string[], source: string): Promise<string> {
  const outcome = await attempted(binary, flags, source);

  if ('refusal' in outcome) {
    throw new Error(outcome.refusal);
  }

  return outcome.svg;
}

export async function renderDiagram(
  itemDir: string,
  binary: string,
): Promise<RenderedDiagram | undefined> {
  const written = await readArtifact(itemDir, SOURCE);

  if (written === undefined) {
    return undefined;
  }

  const source = join(itemDir, SOURCE);

  return {
    light: await captured(binary, [source, '-'], source),
    dark: await captured(binary, ['--theme', DARK_THEME, source, '-'], source),
  };
}

export async function renderBlast(itemDir: string, binary: string): Promise<BlastRender> {
  const source = join(itemDir, BLAST_SOURCE);
  const light = await attempted(binary, [source, '-'], source);

  if ('refusal' in light) {
    return { complaint: light.refusal };
  }

  const dark = await attempted(binary, ['--theme', DARK_THEME, source, '-'], source);

  if ('refusal' in dark) {
    return { complaint: dark.refusal };
  }

  return { drawn: { light: light.svg, dark: dark.svg } };
}
