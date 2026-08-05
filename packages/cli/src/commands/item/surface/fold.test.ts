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

describe('the folded diff a change bleeds into', () => {
  it('indexes every touched file with its anchor and its line counts', () => {
    const page = diffBleed(change);

    expect(page).toContain(
      '<ul class="diff-index"><li><a href="#file-alpha-ts">alpha.ts</a><span class="diff-stat">+1 -1</span></li><li><a href="#file-beta-ts">beta.ts</a><span class="diff-stat">+1 -0</span></li></ul>',
    );
  });

  it('folds each file behind a summary carrying the same anchor and counts', () => {
    const page = diffBleed(change);

    expect(page).toContain(
      '<details class="diff-file" id="file-alpha-ts"><summary>alpha.ts<span class="diff-stat">+1 -1</span></summary>',
    );
    expect(page).toContain(
      '<details class="diff-file" id="file-beta-ts"><summary>beta.ts<span class="diff-stat">+1 -0</span></summary>',
    );
    expect(page).toContain('</details><details');
  });

  it('carries the hunk lines of each file inside its own fold', () => {
    const page = diffBleed(change);

    expect(page).toContain('const ring = 3;');
    expect(page).toContain('const item = 1;');
  });

  it('shows one file per fold in a single column without a file list', () => {
    const page = diffBleed(change);

    expect(page).not.toContain('d2h-file-list');
    expect(page).not.toContain('d2h-file-side-diff');
  });
});
