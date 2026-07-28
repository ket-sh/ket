import { describe, expect, it } from 'vitest';

import { deriveProjectKey } from './project-key.ts';

describe('deriving a project key from a repository name', () => {
  it('takes the initials when the name carries several words', () => {
    expect(deriveProjectKey('my-cool-app')).toBe('MCA');
  });

  it('reads underscores and spaces as word breaks too', () => {
    expect(deriveProjectKey('order_fulfilment service')).toBe('OFS');
  });

  it('takes the opening letters when the name is a single word', () => {
    expect(deriveProjectKey('recompose')).toBe('RECO');
  });

  it('keeps a short single word whole', () => {
    expect(deriveProjectKey('ket')).toBe('KET');
  });

  it('drops digits and punctuation rather than encoding them', () => {
    expect(deriveProjectKey('web3-api-v2')).toBe('WA');
  });

  it('stops at ten letters when the name carries more words than that', () => {
    expect(deriveProjectKey('an-be-ce-de-ee-ef-ge-he-ie-je-ke-le')).toBe('ABCDEEGHIJ');
  });

  it('reports no key when the name carries no letters at all', () => {
    expect(deriveProjectKey('2026---')).toBeUndefined();
  });

  it('reports no key when the name yields a single letter', () => {
    expect(deriveProjectKey('a')).toBeUndefined();
  });
});
