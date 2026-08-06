import { execFile } from 'node:child_process';
import { join } from 'node:path';

import type { RenderedDiagram } from './page.ts';

import { readArtifact } from './artifacts.ts';

const SOURCE = 'architecture.d2';

const DARK_THEME = '200';

const SVG_BUDGET = 16 * 1024 * 1024;

async function captured(binary: string, flags: string[], source: string): Promise<string> {
  return new Promise((resolveRender, rejectRender) => {
    execFile(binary, flags, { maxBuffer: SVG_BUDGET }, (failed, stdout) => {
      if (failed === null) {
        resolveRender(stdout);

        return;
      }

      if (failed.code === 'ENOENT') {
        rejectRender(
          new Error(`${binary} is missing: install d2 (brew install d2) to render ${source}`),
        );

        return;
      }

      rejectRender(new Error(`${binary} refused ${source}: ${failed.message}`));
    });
  });
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
