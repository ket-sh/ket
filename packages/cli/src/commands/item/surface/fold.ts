import type { DiffFile } from 'diff2html/lib/types.js';

import { html as diffHtml, parse as parseDiff } from 'diff2html';
import { ColorSchemeType } from 'diff2html/lib/types.js';

import { escaped, slugOf } from './text.ts';

interface StagedFile {
  row: string;
  pane: string;
}

const FORMAT_SWITCH =
  '<span class="diff-format" role="group" aria-label="Diff layout"><button type="button" class="diff-format-option is-selected" data-diff-format="unified">Unified</button><button type="button" class="diff-format-option" data-diff-format="side">Side by side</button></span>';

function renderedDiff(file: DiffFile, format: 'line-by-line' | 'side-by-side'): string {
  return diffHtml([file], {
    drawFileList: false,
    matching: 'lines',
    outputFormat: format,
    colorScheme: ColorSchemeType.AUTO,
  });
}

function pathOf(file: DiffFile): string {
  return file.newName === '/dev/null' ? file.oldName : file.newName;
}

function statOf(added: number, deleted: number): string {
  return `<span class="diff-stat"><span class="added">+${String(added)}</span><span class="deleted">-${String(deleted)}</span></span>`;
}

type Stance = 'chosen' | 'ready';

function stagedFile(file: DiffFile, stance: Stance): StagedFile {
  const path = escaped(pathOf(file));
  const anchor = `file-${slugOf(pathOf(file))}`;
  const stat = statOf(file.addedLines, file.deletedLines);
  const selected = stance === 'chosen' ? ' is-selected' : '';
  const shown = stance === 'chosen' ? ' is-shown' : '';

  return {
    row: `<li class="diff-tree-row"><button type="button" class="diff-tree-item${selected}" data-diff-target="${anchor}"><span class="diff-tree-path">${path}</span>${stat}</button></li>`,
    pane: `<article class="diff-file${shown}" id="${anchor}"><header class="diff-file-head"><span class="diff-file-path">${path}</span>${stat}${FORMAT_SWITCH}</header><div class="diff-file-body"><div class="diff-render diff-render-unified">${renderedDiff(file, 'line-by-line')}</div><div class="diff-render diff-render-side">${renderedDiff(file, 'side-by-side')}</div></div></article>`,
  };
}

export function diffBleed(change: string): string {
  const files = parseDiff(change);
  const entries = files.map((file, at) => stagedFile(file, at === 0 ? 'chosen' : 'ready'));
  const added = files.reduce((total, file) => total + file.addedLines, 0);
  const deleted = files.reduce((total, file) => total + file.deletedLines, 0);
  const head = `<p class="diff-tree-head"><span class="diff-tree-count">${String(files.length)} files</span>${statOf(added, deleted)}</p>`;
  const tree = `<nav class="diff-tree" aria-label="Files in this change">${head}<ol class="diff-tree-list">${entries.map((entry) => entry.row).join('')}</ol></nav>`;
  const stage = `<div class="diff-stage diff-files">${entries.map((entry) => entry.pane).join('')}</div>`;

  return `<div class="diff-explorer diff-panel">${tree}${stage}</div>`;
}
