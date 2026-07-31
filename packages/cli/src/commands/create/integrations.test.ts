import { describe, expect, it } from 'vitest';

import {
  chosenFrom,
  filesFor,
  installsFor,
  integrationsOffered,
  namesOffered,
} from './integrations.ts';

describe('what a preset offers', () => {
  it('offers the tools that suit a command line project', () => {
    expect(integrationsOffered('cli').map((offered) => offered.name)).toStrictEqual([
      'codecov',
      'codeql',
      'coderabbit',
    ]);
  });

  it('offers the tools that suit a frontend project', () => {
    expect(integrationsOffered('web').map((offered) => offered.name)).toStrictEqual([
      'mobbin',
      'chromatic',
      'codecov',
      'codeql',
      'coderabbit',
    ]);
  });

  it('offers nothing for a preset ket does not ship yet', () => {
    expect(integrationsOffered('mobile')).toStrictEqual([]);
  });
});

describe('the files a chosen integration installs', () => {
  it('installs the workflow the chosen integration brings', () => {
    expect(filesFor(['cli'], ['codeql']).map((file) => file.path)).toStrictEqual([
      '.github/workflows/codeql.yml',
    ]);
  });

  it('installs nothing when a project chose nothing', () => {
    expect(filesFor(['cli'], [])).toStrictEqual([]);
  });

  it('installs nothing for a name no preset offers', () => {
    expect(filesFor(['cli'], ['chromatic'])).toStrictEqual([]);
  });

  it('installs every chosen integration, not only the first', () => {
    expect(filesFor(['cli'], ['codecov', 'coderabbit']).map((file) => file.path)).toStrictEqual([
      '.github/workflows/coverage.yml',
      '.coderabbit.yaml',
    ]);
  });

  it('installs a file once when two targets offer the same integration', () => {
    expect(filesFor(['cli', 'cli'], ['codeql'])).toHaveLength(1);
  });
});

describe('reading the integrations named on the command line', () => {
  it('reads a single name', () => {
    expect(chosenFrom('codecov', namesOffered(['cli']))).toStrictEqual({ chosen: ['codecov'] });
  });

  it('reads several names separated by commas', () => {
    expect(chosenFrom('codecov,coderabbit', namesOffered(['cli']))).toStrictEqual({
      chosen: ['codecov', 'coderabbit'],
    });
  });

  it('reads nothing when the flag is absent', () => {
    expect(chosenFrom(undefined, namesOffered(['cli']))).toStrictEqual({ chosen: [] });
  });

  it('ignores the space a person leaves after a comma', () => {
    expect(chosenFrom('codecov, codeql', namesOffered(['cli']))).toStrictEqual({
      chosen: ['codecov', 'codeql'],
    });
  });

  it('refuses a name no chosen preset offers, and says what it does offer', () => {
    expect(chosenFrom('chromatic', namesOffered(['cli']))).toStrictEqual({
      refused:
        'chromatic is not an integration this project offers. It offers codecov, codeql, coderabbit',
    });
  });

  it('refuses an empty name rather than reading it as nothing', () => {
    expect(chosenFrom('codecov,', namesOffered(['cli']))).toStrictEqual({
      refused: ' is not an integration this project offers. It offers codecov, codeql, coderabbit',
    });
  });
});

describe('the packages a chosen integration installs', () => {
  it('installs nothing when a project chose nothing', () => {
    expect(installsFor(['web'], [])).toStrictEqual([]);
  });

  it('installs nothing for an integration that brings only files', () => {
    expect(installsFor(['web'], ['codecov'])).toStrictEqual([]);
  });

  it('installs what the chosen integration needs to work at all', () => {
    expect(installsFor(['web'], ['chromatic'])).toStrictEqual([
      'chromatic@18.1.0',
      '@chromatic-com/playwright@0.14.11',
    ]);
  });

  it('installs a package once when two targets share the preset that offers it', () => {
    expect(installsFor(['web', 'web'], ['chromatic'])).toHaveLength(2);
  });
});
