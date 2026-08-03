import { describe, expect, it } from 'vitest';

import type { Configuration } from '../../shared/configuration.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';

import { withChosenLaw } from './law.ts';

const STANDING: ScaffoldFile = { path: 'CLAUDE.md', contents: 'the standing law' };

const PLAIN: ScaffoldFile = { path: 'CLAUDE.plain.md', contents: 'the plain law' };

const ROUTE: ScaffoldFile = { path: 'src/app/router.tsx', contents: 'code' };

function takingTheWorkflow(): Configuration {
  return { key: 'OS', targets: { '.': 'web' }, integrations: [], workflow: true };
}

function decliningTheWorkflow(): Configuration {
  return { key: 'OS', targets: { '.': 'web' }, integrations: [], workflow: false };
}

describe('the law a created project ends up governed by', () => {
  it('keeps the standing law and drops the plain one when the project takes the workflow', () => {
    expect(withChosenLaw([STANDING, PLAIN, ROUTE], takingTheWorkflow())).toStrictEqual([
      STANDING,
      ROUTE,
    ]);
  });

  it('lands the plain law at CLAUDE.md when the project declines the workflow', () => {
    expect(withChosenLaw([STANDING, PLAIN, ROUTE], decliningTheWorkflow())).toStrictEqual([
      { path: 'CLAUDE.md', contents: 'the plain law' },
      ROUTE,
    ]);
  });
});
