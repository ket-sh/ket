import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

import { parsePage, stampedPage } from '../packages/cli/src/shared/docs-frontmatter.ts';
import { governedDocPages } from '../packages/cli/src/shared/docs-pages.ts';
import { stampOf } from '../packages/cli/src/shared/docs-stamp.ts';
import { pageState, readSources } from './docs/pinning.mts';
import { trackedFiles } from './docs/repository.mts';

function renewStamp(path: string, files: readonly string[]): void {
  const markdown = readFileSync(path, 'utf-8');
  const page = parsePage(markdown);

  if (page.sources.length === 0) {
    console.error(`${path} declares no sources: add a sources list to its frontmatter first`);
    process.exit(1);
  }

  const matched = readSources(files, page.sources);
  const stamp = stampOf(
    matched.map((source) => ({ path: source, content: readFileSync(source, 'utf-8') })),
  );

  writeFileSync(path, stampedPage(markdown, stamp));
  console.log(`${path} stamped ${stamp} over ${matched.length} sources`);
}

function reportPins(files: readonly string[]): void {
  for (const path of governedDocPages(files)) {
    const state = pageState(path, files);

    console.log(`${state.kind.padEnd(9, ' ')}${path}`);
  }
}

const [page] = process.argv.slice(2);
const files = trackedFiles();

if (page !== undefined) {
  renewStamp(page, files);
}

reportPins(files);
