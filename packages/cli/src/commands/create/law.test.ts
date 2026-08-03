import { describe, expect, it } from 'vitest';

import type { ScaffoldFile } from '../../shared/write-files.ts';

import { keepingTheStandingLaw, landingThePlainLaw } from './law.ts';

const STANDING: ScaffoldFile = { path: 'CLAUDE.md', contents: 'the standing law' };

const PLAIN: ScaffoldFile = { path: 'CLAUDE.plain.md', contents: 'the plain law' };

const ROUTE: ScaffoldFile = { path: 'src/app/router.tsx', contents: 'code' };

describe('the law a created project ends up governed by', () => {
  it('keeps the standing law and drops the plain one when the project takes the workflow', () => {
    expect(keepingTheStandingLaw([STANDING, PLAIN, ROUTE])).toStrictEqual([STANDING, ROUTE]);
  });

  it('lands the plain law at CLAUDE.md when the project declines the workflow', () => {
    expect(landingThePlainLaw([STANDING, PLAIN, ROUTE])).toStrictEqual([
      { path: 'CLAUDE.md', contents: 'the plain law' },
      ROUTE,
    ]);
  });
});
