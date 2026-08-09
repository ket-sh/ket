import { describe, expect, it } from 'vitest';

import { diffBleed } from './fold.ts';

const change = [
  'diff --git a/alpha.ts b/alpha.ts',
  'index 1111111..2222222 100644',
  '--- a/alpha.ts',
  '+++ b/alpha.ts',
  '@@ -1,2 +1,2 @@',
  '-const gate = 1;',
  '+const gate = 2;',
  ' const ring = 3;',
  'diff --git a/beta.ts b/beta.ts',
  'index 3333333..4444444 100644',
  '--- a/beta.ts',
  '+++ b/beta.ts',
  '@@ -1 +1,2 @@',
  ' const item = 1;',
  '+const stage = 4;',
  '',
].join('\n');

describe('the tree the explorer pins beside the diff', () => {
  it('heads the tree with the file count and the total line counts', () => {
    expect(diffBleed(change)).toContain(
      '<nav class="diff-tree" aria-label="Files in this change"><p class="diff-tree-head"><span class="diff-tree-count">2 files</span><span class="diff-stat"><span class="added">+2</span><span class="deleted">-1</span></span></p>',
    );
  });

  it('lists every touched file as a button with its counts', () => {
    const page = diffBleed(change);

    expect(page).toContain(
      '<li class="diff-tree-row"><button type="button" class="diff-tree-item is-selected" data-diff-target="file-alpha-ts"><span class="diff-tree-path">alpha.ts</span><span class="diff-stat"><span class="added">+1</span><span class="deleted">-1</span></span></button></li>',
    );
    expect(page).toContain('data-diff-target="file-beta-ts"');
  });

  it('chains the rows inside one ordered list', () => {
    expect(diffBleed(change)).toContain('<ol class="diff-tree-list"><li class="diff-tree-row">');
    expect(diffBleed(change)).toContain('</li><li class="diff-tree-row">');
  });

  it('selects the first row alone', () => {
    expect(diffBleed(change).match(/diff-tree-item is-selected/g)).toHaveLength(1);
  });
});

describe('the stage the chosen file fills', () => {
  it('shows the first file and holds the rest ready', () => {
    const page = diffBleed(change);

    expect(page).toContain('<article class="diff-file is-shown" id="file-alpha-ts">');
    expect(page).toContain('<article class="diff-file" id="file-beta-ts">');
    expect(page).toContain('</article><article');
  });

  it('heads each file with its path, its counts, and the format switch', () => {
    const page = diffBleed(change);

    expect(page).toContain(
      '<header class="diff-file-head"><span class="diff-file-path">alpha.ts</span><span class="diff-stat"><span class="added">+1</span><span class="deleted">-1</span></span><span class="diff-format" role="group" aria-label="Diff layout">',
    );
    expect(page.match(/aria-label="Diff layout"/g)).toHaveLength(2);
  });

  it('renders both layouts of each file inside its body', () => {
    const page = diffBleed(change);

    expect(page.match(/<div class="diff-render diff-render-unified">/g)).toHaveLength(2);
    expect(page.match(/<div class="diff-render diff-render-side">/g)).toHaveLength(2);
    expect(page).toContain('d2h-file-side-diff');
  });

  it('carries the hunk lines of each file inside its own pane', () => {
    expect(diffBleed(change)).toContain('const ring = 3;');
    expect(diffBleed(change)).toContain('const item = 1;');
  });
});

describe('the paths the panes are named by', () => {
  it('names a deleted file by the path it had', () => {
    const gone = [
      'diff --git a/gone.ts b/gone.ts',
      'deleted file mode 100644',
      'index 1111111..0000000',
      '--- a/gone.ts',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-const gone = 1;',
      '',
    ].join('\n');
    const page = diffBleed(gone);

    expect(page).toContain('<span class="diff-file-path">gone.ts</span>');
    expect(page).not.toContain('diff-file-path">/dev/null');
  });

  it('names a born file by the path it gains', () => {
    const born = [
      'diff --git a/born.ts b/born.ts',
      'new file mode 100644',
      'index 0000000..1111111',
      '--- /dev/null',
      '+++ b/born.ts',
      '@@ -0,0 +1 @@',
      '+const born = 1;',
      '',
    ].join('\n');

    expect(diffBleed(born)).toContain('<span class="diff-file-path">born.ts</span>');
  });

  it('shows one file per pane without a global file list', () => {
    expect(diffBleed(change)).not.toContain('d2h-file-list');
  });
});

describe('the scheme the rendered diff obeys', () => {
  it('dresses every render in the auto scheme the dark skin keys on', () => {
    expect(diffBleed(change).match(/d2h-wrapper d2h-auto-color-scheme/g)).toHaveLength(4);
  });

  it('never pins a render to the light scheme', () => {
    expect(diffBleed(change)).not.toContain('d2h-light-color-scheme');
  });
});
