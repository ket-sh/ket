import type { DiffFile } from 'diff2html/lib/types';

import { html as diffHtml, parse as parseDiff } from 'diff2html';

import { escaped, slugOf } from './text.ts';

interface FoldedFile {
  index: string;
  block: string;
}

function renderedDiff(file: DiffFile, format: 'line-by-line' | 'side-by-side'): string {
  return diffHtml([file], { drawFileList: false, matching: 'lines', outputFormat: format });
}

function pathOf(file: DiffFile): string {
  return file.newName === '/dev/null' ? file.oldName : file.newName;
}

function statOf(added: number, deleted: number): string {
  return `<span class="diff-stat"><span class="added">+${String(added)}</span><span class="deleted">-${String(deleted)}</span></span>`;
}

function foldedFile(file: DiffFile): FoldedFile {
  const path = escaped(pathOf(file));
  const anchor = `file-${slugOf(pathOf(file))}`;
  const stat = statOf(file.addedLines, file.deletedLines);

  return {
    index: `<li class="diff-index-row"><button type="button" class="diff-index-item" data-diff-target="${anchor}"><span class="diff-index-path">${path}</span>${stat}</button></li>`,
    block: `<details class="diff-file" id="${anchor}"><summary class="diff-file-summary"><span class="diff-file-path">${path}</span>${stat}</summary><div class="diff-file-body"><div class="diff-render diff-render-unified">${renderedDiff(file, 'line-by-line')}</div><div class="diff-render diff-render-side">${renderedDiff(file, 'side-by-side')}</div></div></details>`,
  };
}

export function diffBleed(change: string): string {
  const files = parseDiff(change);
  const entries = files.map(foldedFile);
  const added = files.reduce((total, file) => total + file.addedLines, 0);
  const deleted = files.reduce((total, file) => total + file.deletedLines, 0);
  const head = `<p class="diff-index-head"><span class="diff-index-count">${String(files.length)} files</span>${statOf(added, deleted)}</p>`;

  return `<nav class="diff-index" aria-label="Files in this change">${head}<ol class="diff-index-list">${entries.map((entry) => entry.index).join('')}</ol></nav><div class="diff-files">${entries.map((entry) => entry.block).join('')}</div>`;
}
