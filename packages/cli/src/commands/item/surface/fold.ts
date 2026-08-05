import { html as diffHtml, parse as parseDiff } from 'diff2html';

import { escaped, slugOf } from './text.ts';

export function diffBleed(change: string): string {
  const files = parseDiff(change);
  const index = files.map(
    (file) =>
      `<li><a href="#file-${slugOf(file.newName)}">${escaped(file.newName)}</a><span class="diff-stat">+${String(file.addedLines)} -${String(file.deletedLines)}</span></li>`,
  );
  const folded = files.map(
    (file) =>
      `<details class="diff-file" id="file-${slugOf(file.newName)}"><summary>${escaped(file.newName)}<span class="diff-stat">+${String(file.addedLines)} -${String(file.deletedLines)}</span></summary>${diffHtml([file], { drawFileList: false, outputFormat: 'line-by-line' })}</details>`,
  );

  return `<ul class="diff-index">${index.join('')}</ul>${folded.join('')}`;
}
